package com.mtmn.smartdoc.service;

import dev.langchain4j.store.embedding.milvus.MilvusEmbeddingStore;
import io.milvus.common.clientenum.ConsistencyLevelEnum;
import io.milvus.param.IndexType;
import io.milvus.param.MetricType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Milvus向量数据库服务
 * 负责创建和管理Milvus嵌入存储
 * 
 * @author charmingdaidai
 * @version 1.0
 * @date 2025/5/9 10:17
 */
@Service
public class MilvusService {

    @Value("${milvus.host}")
    String host;

    @Value("${milvus.port}")
    Integer port;

    /**
     * 获取Milvus嵌入存储实例
     * 
     * @param collectionName 集合名称
     * @param dimension 向量维度
     * @return Milvus嵌入存储实例
     */
    public MilvusEmbeddingStore getEmbeddingStore(String collectionName, Integer dimension){
        return MilvusEmbeddingStore.builder()
                .host(host)
                .port(port)
                .collectionName(collectionName)
                .dimension(dimension)
                .indexType(IndexType.FLAT)
                .metricType(MetricType.COSINE)
                .consistencyLevel(ConsistencyLevelEnum.EVENTUALLY)
                .autoFlushOnInsert(false)
                .idFieldName("id")
                .textFieldName("text")
                .metadataFieldName("metadata")
                .vectorFieldName("vector")
                .build();
    }

}