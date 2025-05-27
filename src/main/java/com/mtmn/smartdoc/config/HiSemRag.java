package com.mtmn.smartdoc.config;

import com.mtmn.smartdoc.common.MyNode;
import com.mtmn.smartdoc.po.DocumentPO;
import com.mtmn.smartdoc.po.KnowledgeBase;
import com.mtmn.smartdoc.service.EmbeddingService;
import com.mtmn.smartdoc.service.MinioService;
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
import io.milvus.common.clientenum.ConsistencyLevelEnum;
import io.milvus.param.IndexType;
import io.milvus.param.MetricType;
import lombok.Builder;
import lombok.Data;
import lombok.extern.log4j.Log4j2;
import org.springframework.security.authentication.BadCredentialsException;
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
 * @author charmingdaidai
 * @version 1.0
 * @description HiSemRAG 配置类
 * @date 2025/5/8 09:19
 */

@Data
@Builder
@Log4j2
public class HiSemRag implements BaseRag {
    private String methodName;

    private String embeddingModel;

    private Integer chunkSize;

    private Boolean generateAbstract;

    /**
     * @return
     */
    @Override
    public List<Boolean> buildIndex(String kbName, List<DocumentPO> documentPOList, MinioService minioService) {
        String embeddingModelName = this.getEmbeddingModel();

        // 创建Embedding模型
        EmbeddingModel embeddingModel = EmbeddingService.createEmbeddingModel(embeddingModelName);
        log.info("使用嵌入模型：{} 创建索引", embeddingModelName);

        List<Boolean> success = new ArrayList<>();

        // 获取配置参数
        Integer chunkSize = this.getChunkSize();
        Boolean generateAbstract = this.getGenerateAbstract();

        log.info("使用HiSemRag配置，块大小：{}，生成摘要：{}", chunkSize, generateAbstract);

        Long userId = getCurrentUserId();
        if (null == userId) {
            throw new BadCredentialsException("请登录");
        }

        String collectionName = getStoreKnowledgeBaseName(kbName);

        MilvusEmbeddingStore embeddingStore = MilvusEmbeddingStore.builder()
                .host("10.0.30.172")
                .port(19530)
                // Name of the collection 知识库名称 + userId
                .collectionName(collectionName)
                .dimension(embeddingModel.embed("test").content().dimension())
                .indexType(IndexType.FLAT)
                .metricType(MetricType.COSINE)
                .consistencyLevel(ConsistencyLevelEnum.EVENTUALLY)
                .autoFlushOnInsert(false)
                .idFieldName("id")
                .textFieldName("text")
                .metadataFieldName("metadata")
                .vectorFieldName("vector")
                .build();

        for (DocumentPO documentPO : documentPOList) {
            String filePath = documentPO.getFilePath();

            try (InputStream inputStream = minioService.getFileContent(filePath)) {
                Map.Entry<MyNode, Map<String, MyNode>> streamResult =
                        MarkdownProcessor.processMarkdownFile(
                                inputStream,
                                documentPO.getTitle(),
                                null,
                                3,
                                chunkSize,
                                true,
                                generateAbstract
                        );

                if (streamResult != null) {
                    log.debug("成功从URL加载文档, 文档路径: {}", filePath);

                    MyNode rootNode = streamResult.getKey();
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
    public Boolean deleteIndex() {
        return null;
    }

    /**
     * @param docIds
     * @return
     */
    @Override
    public Boolean deleteIndex(List<String> docIds) {
        return null;
    }

    public static Flux<String> chat(SseUtil sseUtil, KnowledgeBase knowledgeBase, String id, String question, int maxRes, boolean qr, boolean qd){

        String kbName = knowledgeBase.getName();

        String ragMethodName = knowledgeBase.getRag();

        String embeddingModelName = knowledgeBase.getEmbeddingModel();

        try {
            // 创建Embedding模型
            EmbeddingModel embeddingModel = EmbeddingService.createEmbeddingModel(embeddingModelName);

            String collectionName = getStoreKnowledgeBaseName(kbName);

            MilvusEmbeddingStore embeddingStore = MilvusEmbeddingStore.builder()
                    .host("10.0.30.172")
                    .port(19530)
                    .collectionName(collectionName)
                    .dimension(embeddingModel.dimension())

                    .metricType(MetricType.COSINE)
                    .consistencyLevel(ConsistencyLevelEnum.EVENTUALLY)
                    .autoFlushOnInsert(false)
                    .idFieldName("id")
                    .textFieldName("text")
                    .metadataFieldName("metadata")
                    .vectorFieldName("vector")
                    .build();

            Embedding queryEmbedding = embeddingModel.embed(question).content();

            EmbeddingSearchRequest embeddingSearchRequest = EmbeddingSearchRequest.builder()
                    .queryEmbedding(queryEmbedding)
                    .maxResults(maxRes)
                    .build();

            List<EmbeddingMatch<TextSegment>> matches = embeddingStore.search(embeddingSearchRequest).matches();

            List<Double> scores = matches.stream().map(EmbeddingMatch::score).toList();

            log.debug("相似度列表: {}", scores);

            // 计算自适应阈值 - 使用配置文件中的参数值
            double beta = 1;
            double gamma = 0.7;
            int kMin = 1;
            
            double threshold = ThresholdCalculator.calculateAdaptiveThreshold(scores, 1, maxRes, beta, gamma, kMin);
            List<String> contents = matches.stream()
                    .filter(m -> m.score() >= threshold)
                    .map(em -> em.embedded().text()).toList();

            log.debug("[自适应阈值] 最大结果数量: {}, 最终数量: {}", maxRes, contents.size());

//            ContentRetriever contentRetriever = EmbeddingStoreContentRetriever.builder()
//                    .embeddingStore(embeddingStore)
//                    .embeddingModel(embeddingModel)
//                    .maxResults(maxRes)
//                    .build();
//
//            List<Content> contents = new ArrayList<>(contentRetriever.retrieve(new Query(question)));

            if (contents.isEmpty()) {
                log.warn("知识库中没有找到与您问题相关的信息。");
                return sseUtil.sendFluxMessage("知识库中没有找到与您问题相关的信息。");
            }

//            String promptTemplate = """
//                    作为一个精确的RAG系统助手，请严格按照以下指南回答用户问题：
//                    1. 仔细分析问题，识别关键词和核心概念。
//                    2. 从提供的上下文中精确定位相关信息，优先使用完全匹配的内容。
//                    3. 构建回答时，确保包含所有必要的关键词，提高关键词评分(scoreikw)。
//                    4. 保持回答与原文的语义相似度，以提高向量相似度评分(scoreies)。
//                    5. 对于表格查询或需要多段落/多文档综合的问题，给予特别关注并提供更全面的回答。
//                    6. 如果上下文信息不足，可以进行合理推理，但要明确指出推理部分。
//                    7. 回答应准确、完整，直接解答问题，避免不必要的解释。
//                    8. 不要输出“检索到的文本块”、“根据”，“信息”等前缀修饰句，直接输出答案即可
//                    9. 不要使用"根据提供的信息"、"支撑信息显示"等前缀，直接给出答案。
//                    问题: %s
//                    参考上下文：
//                    ···
//                    %s
//                    ···
//                    请提供准确且相关的回答：""";

            String promptTemplate = """
                    作为一个精确的RAG系统助手，请严格按照以下指南回答用户问题：
                    1. 仔细分析问题，识别关键词和核心概念。
                    2. 从提供的上下文中精确定位相关信息，尽量使用原文中的内容回答问题。
                    3. 不要输出“检索到的文本块”、“根据”，“信息”等前缀修饰句，直接输出答案即可
                    4. 不要使用"根据提供的信息"、"支撑信息显示"等前缀，直接给出答案。
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

            String prompt = String.format(promptTemplate, contextBuilder.toString(), question);

            return sseUtil.handleStreamingChatResponse(prompt, contents);
        } catch (Exception e) {
            log.error("HisemRAG 问答处理失败", e);
            // 生成错误对象的新格式响应
            String errorMessage = "抱歉，处理您的问题时遇到了错误：" + e.getMessage();
            String escapedError = errorMessage.replace("\"", "\\\"").replace("\n", "\\n");
            return sseUtil.sendFluxMessage("escapedError");
        }
    }
}