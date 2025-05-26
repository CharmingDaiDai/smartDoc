package com.mtmn.smartdoc.config;

import com.mtmn.smartdoc.common.MyNode;
import com.mtmn.smartdoc.po.DocumentPO;
import com.mtmn.smartdoc.service.EmbeddingService;
import com.mtmn.smartdoc.service.MinioService;
import com.mtmn.smartdoc.utils.MarkdownProcessor;
import dev.langchain4j.data.document.Metadata;
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
import java.util.Map;

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
}