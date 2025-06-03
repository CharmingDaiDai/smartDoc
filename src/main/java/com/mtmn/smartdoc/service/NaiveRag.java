package com.mtmn.smartdoc.service;

import com.mtmn.smartdoc.common.ApacheTikaDocumentParser;
import com.mtmn.smartdoc.common.CustomException;
import com.mtmn.smartdoc.po.DocumentPO;
import com.mtmn.smartdoc.po.KnowledgeBase;
import com.mtmn.smartdoc.utils.SseUtil;
import dev.langchain4j.data.document.Document;
import dev.langchain4j.data.document.DocumentSplitter;
import dev.langchain4j.data.document.splitter.DocumentSplitters;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.rag.content.Content;
import dev.langchain4j.rag.content.retriever.ContentRetriever;
import dev.langchain4j.rag.content.retriever.EmbeddingStoreContentRetriever;
import dev.langchain4j.rag.query.Query;
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

/**
 * @author charmingdaidai
 * @version 1.0
 * @description 普通 RAG 配置类
 * @date 2025/5/8 09:19
 */
@Component("naiveRag")
@Log4j2
@RequiredArgsConstructor
public class NaiveRag implements BaseRag {

    private final MinioService minioService;
    private final SseUtil sseUtil;
    private final MilvusService milvusService;

    /**
     * @return
     */
    @Override
    public String getMethodName() {
        return "naive";
    }

    /**
     * @return
     */
    @Override
    public List<Boolean> buildIndex(String kbName, List<DocumentPO> documentPoList, Map<String, Object> params) {
        // 获取配置参数
        Integer chunkSize = (Integer) params.getOrDefault("chunk-size", 512);
        Integer chunkOverlap = (Integer) params.getOrDefault("chunk-overlap", 50);
        String embeddingModelName = (String) params.get("embeddingModelName");
        if (embeddingModelName == null) {
            throw new CustomException("索引构建失败: embedding 模型为空");
        }

        log.info("使用嵌入模型：{} 创建索引", embeddingModelName);

        // 创建Embedding模型
        EmbeddingModel embeddingModel = EmbeddingService.createEmbeddingModel(embeddingModelName);

        List<Boolean> success = new ArrayList<>();

        log.info("使用朴素RAG配置，块大小：{}，重叠大小：{}", chunkSize, chunkOverlap);

        Long userId = getCurrentUserId();
        if (null == userId) {
            throw new BadCredentialsException("请登录");
        }

        String collectionName = getStoreKnowledgeBaseName(kbName);

        MilvusEmbeddingStore embeddingStore = milvusService.getEmbeddingStore(collectionName, embeddingModel.dimension());

        List<Document> documents = new ArrayList<>();

        ApacheTikaDocumentParser documentParser = new ApacheTikaDocumentParser();

        for (DocumentPO documentPo : documentPoList) {
            String filePath = documentPo.getFilePath();

            try (InputStream inputStream = minioService.getFileContent(filePath)) {
                // 使用Apache Tika解析器解析文档
                Document document = documentParser.parse(inputStream);
                documents.add(document);

                log.debug("成功从URL加载文档, 文档路径: {}", filePath);
            } catch (Exception e) {
                log.error("解析文档失败: {}, 错误: {}", filePath, e.getMessage(), e);
            }
        }

        for (Document document : documents) {
            log.debug("处理文档，元数据：{}", document.metadata());

            if (document.text() != null && !document.text().isEmpty()) {
                log.debug("文档内容预览：{}", document.text().substring(0, Math.min(200, document.text().length())) + "...");

                // 使用配置的chunkSize和chunkOverlap进行文档切分
                DocumentSplitter splitter = DocumentSplitters.recursive(chunkSize, chunkOverlap);
                List<TextSegment> segments = splitter.split(document);

                log.info("文档已切分为{}个片段", segments.size());

                // 将文档片段转换为向量并存入向量库
                if (segments.isEmpty()) {
                    log.warn("文档内容为空，跳过处理");
                    continue;
                }

                List<Embedding> embeddings = embeddingModel.embedAll(segments).content();

                embeddingStore.addAll(embeddings, segments);

                success.add(true);

                continue;
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

    @Override
    public Flux<String> chat(KnowledgeBase knowledgeBase, String question, Map<String, Object> params) {
        Integer topk = (Integer) params.getOrDefault("topk", 10);

        String kbName = knowledgeBase.getName();

        String embeddingModelName = knowledgeBase.getEmbeddingModel();

        try {
            // 创建Embedding模型
            EmbeddingModel embeddingModel = EmbeddingService.createEmbeddingModel(embeddingModelName);

            String collectionName = getStoreKnowledgeBaseName(kbName);

            MilvusEmbeddingStore embeddingStore = milvusService.getEmbeddingStore(collectionName, embeddingModel.dimension());

            ContentRetriever contentRetriever = EmbeddingStoreContentRetriever.builder()
                    .embeddingStore(embeddingStore)
                    .embeddingModel(embeddingModel)
                    .maxResults(topk)
                    .build();

            List<Content> contents = new ArrayList<>(contentRetriever.retrieve(new Query(question)));

            if (contents.isEmpty()) {
                log.warn("知识库中没有找到与您问题相关的信息。");
                return sseUtil.sendFluxMessage("知识库中没有找到与您问题相关的信息。");
            }

            String promptTemplate = """
                    作为一个精确的RAG系统助手，请严格按照以下指南回答用户问题：
                    1. 仔细分析问题，识别关键词和核心概念。
                    2. 从提供的上下文中精确定位相关信息，优先使用完全匹配的内容。
                    3. 构建回答时，确保包含所有必要的关键词，提高关键词评分(scoreikw)。
                    4. 保持回答与原文的语义相似度，以提高向量相似度评分(scoreies)。
                    5. 对于表格查询或需要多段落/多文档综合的问题，给予特别关注并提供更全面的回答。
                    6. 如果上下文信息不足，可以进行合理推理，但要明确指出推理部分。
                    7. 回答应准确、完整，直接解答问题，避免不必要的解释。
                    8. 不要输出“检索到的文本块”、“根据”，“信息”等前缀修饰句，直接输出答案即可
                    9. 不要使用"根据提供的信息"、"支撑信息显示"等前缀，直接给出答案。
                    问题: %s
                    参考上下文：
                    ···
                    %s
                    ···
                    请提供准确且相关的回答：""";

            // 准备检索到的文档列表和提示词片段
            List<String> docContents = new ArrayList<>();
            StringBuilder contextBuilder = new StringBuilder();

            // 使用IntStream处理文档片段
            IntStream.range(0, contents.size()).forEach(i -> {
                String segmentText = contents.get(i).textSegment().text();
                contextBuilder.append(String.format("【片段%d】\n%s\n\n", i + 1, segmentText));
//                docContents.add(String.format("出处 [%d] %s\n\n", i + 1, segmentText));
                docContents.add(segmentText);
            });

            String prompt = String.format(promptTemplate, contextBuilder.toString(), question);

            return sseUtil.handleStreamingChatResponse(prompt, docContents);
        } catch (Exception e) {
            log.error("RAG问答处理失败", e);
            // 生成错误对象的新格式响应
            String errorMessage = "抱歉，处理您的问题时遇到了错误：" + e.getMessage();
            String escapedError = errorMessage.replace("\"", "\\\"").replace("\n", "\\n");
            return sseUtil.sendFluxMessage("escapedError");
        }
    }

    /**
     * @param ragMethod
     * @return
     */
    @Override
    public boolean supports(String ragMethod) {
        return true;
    }
}