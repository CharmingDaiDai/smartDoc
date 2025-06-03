package com.mtmn.smartdoc.service;

import com.mtmn.smartdoc.common.CustomException;
import com.mtmn.smartdoc.common.MyNode;
import com.mtmn.smartdoc.po.DocumentPO;
import com.mtmn.smartdoc.po.KnowledgeBase;
import com.mtmn.smartdoc.utils.MarkdownProcessor;
import com.mtmn.smartdoc.utils.SseUtil;
import com.mtmn.smartdoc.utils.ThresholdCalculator;
import dev.langchain4j.data.document.Metadata;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.store.embedding.EmbeddingMatch;
import dev.langchain4j.store.embedding.EmbeddingSearchRequest;
import dev.langchain4j.store.embedding.milvus.MilvusEmbeddingStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

import static com.mtmn.smartdoc.service.impl.KnowledgeBaseServiceImpl.getCurrentUserId;
import static com.mtmn.smartdoc.service.impl.KnowledgeBaseServiceImpl.getStoreKnowledgeBaseName;
import static com.mtmn.smartdoc.utils.MarkdownProcessor.findLeafNodes;

/**
 * 层次语义RAG实现
 * 基于文档层次结构和语义理解的高级RAG方法
 * 
 * @author charmingdaidai
 * @version 1.0
 * @date 2025/5/8 09:19
 */

@Component("hisemRag")
@Log4j2
@RequiredArgsConstructor
public class HiSemRag implements BaseRag {

    private final MinioService minioService;
    private final SseUtil sseUtil;
    private final MilvusService milvusService;

    @Override
    public List<Boolean> buildIndex(String kbName, List<DocumentPO> documentPoList, Map<String, Object> params) {
        Integer chunkSize = (Integer) params.getOrDefault("chunk-size", 512);
        Boolean generateAbstract = (Boolean) params.getOrDefault("abstract", false);
        String embeddingModelName = (String) params.get("embeddingModelName");
        if (embeddingModelName == null) {
            throw new CustomException("索引构建失败: embedding 模型为空");
        }

        log.info("使用HiSemRag配置，块大小：{}，生成摘要：{}", chunkSize, generateAbstract);

        // 创建Embedding模型
        EmbeddingModel embeddingModel = EmbeddingService.createEmbeddingModel(embeddingModelName);
        log.info("使用嵌入模型：{} 创建索引", embeddingModelName);

        List<Boolean> success = new ArrayList<>();

        Long userId = getCurrentUserId();
        if (null == userId) {
            throw new BadCredentialsException("请登录");
        }

        String collectionName = getStoreKnowledgeBaseName(kbName);

        MilvusEmbeddingStore embeddingStore = milvusService.getEmbeddingStore(collectionName, embeddingModel.dimension());

        for (DocumentPO documentPo : documentPoList) {
            String filePath = documentPo.getFilePath();

            try (InputStream inputStream = minioService.getFileContent(filePath)) {
                Map.Entry<MyNode, Map<String, MyNode>> streamResult =
                        MarkdownProcessor.processMarkdownFile(
                                inputStream,
                                documentPo.getTitle(),
                                null,
                                // TODO Max level改为配置文件传入或者前端传入
                                3,
                                chunkSize,
                                true,
                                generateAbstract
                        );

                if (streamResult != null) {
                    log.debug("成功从URL加载文档, 文档路径: {}", filePath);

                    Map<String, MyNode> nodes = findLeafNodes(streamResult.getValue());
                    log.debug("从流解析完成，共 {} 个叶节点", nodes.size());

                    List<TextSegment> segments = nodes.values().stream().map(node -> {
                        return new TextSegment(node.getTitle() + '\n' + node.getPageContent(), new Metadata(node.getMetadata()));
                    }).toList();

                    List<Embedding> embeddings = embeddingModel.embedAll(segments).content();

                    embeddingStore.addAll(embeddings, segments);
                }

                success.add(true);
                continue;
            } catch (Exception e) {
                log.error("解析文档失败: {}, 错误: {}", filePath, e.getMessage(), e);
            }
            success.add(false);
        }

        return success;
    }

    /**
     * @return
     */
    @Override
    public String getMethodName() {
        return "hisem";
    }

    @Override
    public Boolean deleteIndex() {
        return null;
    }

    @Override
    public Boolean deleteIndex(List<String> docIds) {
        return null;
    }

    /**
     * @param ragMethod
     * @return
     */
    @Override
    public boolean supports(String ragMethod) {
        return true;
    }

    @Override
    public Flux<String> chat(KnowledgeBase knowledgeBase, String question, Map<String, Object> params) {
        Integer maxRes = (Integer) params.getOrDefault("maxRes", 10);

        String kbName = knowledgeBase.getName();

        String embeddingModelName = knowledgeBase.getEmbeddingModel();

        try {
            // 创建Embedding模型
            EmbeddingModel embeddingModel = EmbeddingService.createEmbeddingModel(embeddingModelName);

            String collectionName = getStoreKnowledgeBaseName(kbName);

            MilvusEmbeddingStore embeddingStore = milvusService.getEmbeddingStore(collectionName, embeddingModel.dimension());

            Embedding queryEmbedding = embeddingModel.embed(question).content();

            EmbeddingSearchRequest embeddingSearchRequest = EmbeddingSearchRequest.builder()
                    .queryEmbedding(queryEmbedding)
                    .maxResults(maxRes)
                    .build();

            List<EmbeddingMatch<TextSegment>> matches = embeddingStore.search(embeddingSearchRequest).matches();

            List<Double> scores = matches.stream().map(EmbeddingMatch::score).toList();

            log.debug("相似度列表: {}", scores);

            // 计算自适应阈值 - 使用配置文件中的参数值
            // TODO 解决硬编码，提取到配置文件中
            double beta = 1;
            double gamma = 0.7;
            int kMin = 1;

            double threshold = ThresholdCalculator.calculateAdaptiveThreshold(scores, 1, maxRes, beta, gamma, kMin);
            List<String> contents = matches.stream()
                    .filter(m -> m.score() >= threshold)
                    .map(em -> em.embedded().text()).toList();

            log.debug("[自适应阈值] 最大结果数量: {}, 最终数量: {}", maxRes, contents.size());

            if (contents.isEmpty()) {
                log.warn("知识库中没有找到与您问题相关的信息。");
                return sseUtil.sendFluxMessage("知识库中没有找到与您问题相关的信息。");
            }

//            String promptTemplate = """
//                    作为一个精确的RAG系统助手，请严格按照以下指南回答用户问题：
//                    1. 仔细分析问题，识别关键词和核心概念。
//                    2. 从提供的上下文中精确定位相关信息，尽量使用原文中的内容回答问题。
//                    3. 不要输出“检索到的文本块”、“根据”，“信息”等前缀修饰句，直接输出答案即可
//                    4. 不要使用"根据提供的信息"、"支撑信息显示"等前缀，直接给出答案。
//                    问题: %s
//                    参考上下文：
//                    ···
//                    %s
//                    ···""";

            String promptTemplate = """
                    作为一个RAG系统助手，请按照以下指南回答用户问题：
                    不要输出“检索到的文本块”、“根据”，“信息”等前缀修饰句
                    如果从参考上下文的内容无法回答用户问题，请回答“根据检索结果，无法回答您的问题”
                    你可以积极使用参考上下文中的 markdown 图片![image]，系统能正确渲染
                    回答 markdown 格式的内容，尽可能使用原内容回答，如果涉及代码，请放在代码块中，如 `` / ```，涉及图片使用![image]等
                    问题: %s
                    参考上下文：
                    ···
                    %s
                    ···""";

            // 准备检索到的文档列表和提示词片段
            StringBuilder contextBuilder = new StringBuilder();

            // 使用IntStream处理文档片段
            IntStream.range(0, contents.size()).forEach(i -> {
                contextBuilder.append(String.format("【片段%d】\n%s\n\n", i + 1, contents.get(i)));
            });

            String prompt = String.format(promptTemplate, contextBuilder, question);

            return sseUtil.handleStreamingChatResponse(prompt, contents);
        } catch (Exception e) {
            log.error("HisemRAG 问答处理失败", e);
            // 生成错误对象的新格式响应
            String errorMessage = "抱歉，处理您的问题时遇到了错误：" + e.getMessage();
            String escapedError = errorMessage.replace("\"", "\\\"").replace("\n", "\\n");
            return sseUtil.sendFluxMessage(escapedError);
        }
    }
}