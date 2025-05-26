package com.mtmn.smartdoc.config;

import com.mtmn.smartdoc.common.ApacheTikaDocumentParser;
import com.mtmn.smartdoc.po.DocumentPO;
import com.mtmn.smartdoc.service.EmbeddingService;
import com.mtmn.smartdoc.service.MinioService;
import dev.langchain4j.data.document.Document;
import dev.langchain4j.data.document.DocumentSplitter;
import dev.langchain4j.data.document.splitter.DocumentSplitters;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.store.embedding.milvus.MilvusEmbeddingStore;
import io.milvus.common.clientenum.ConsistencyLevelEnum;
import io.milvus.param.IndexType;
import io.milvus.param.MetricType;
import lombok.Builder;
import lombok.Data;
import lombok.extern.log4j.Log4j2;
import org.springframework.security.authentication.BadCredentialsException;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

import static com.mtmn.smartdoc.service.impl.KnowledgeBaseServiceImpl.getCurrentUserId;
import static com.mtmn.smartdoc.service.impl.KnowledgeBaseServiceImpl.getStoreKnowledgeBaseName;

/**
 * @author charmingdaidai
 * @version 1.0
 * @description 普通 RAG 配置类
 * @date 2025/5/8 09:19
 */
@Data
@Builder
@Log4j2
public class NaiveRag implements BaseRag {
    private String methodName;

    private String embeddingModel;

    private Integer chunkSize;

    private Integer chunkOverlap;

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
        Integer chunkOverlap = this.getChunkOverlap();

        log.info("使用朴素RAG配置，块大小：{}，重叠大小：{}", chunkSize, chunkOverlap);

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

        List<Document> documents = new ArrayList<>();

        ApacheTikaDocumentParser documentParser = new ApacheTikaDocumentParser();

        for (DocumentPO documentPO : documentPOList) {
            String filePath = documentPO.getFilePath();

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
}