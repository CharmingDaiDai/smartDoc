package com.mtmn.smartdoc.service;

import com.mtmn.smartdoc.po.DocumentPO;
import com.mtmn.smartdoc.po.KnowledgeBase;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Map;

/**
 * RAG（检索增强生成）基础接口
 * 定义了RAG方法的基本操作，包括索引构建、删除和问答功能
 * 
 * @author charmingdaidai
 * @version 1.0
 * @date 2025/5/9 09:53
 */

public interface BaseRag {
    /**
     * 获取RAG方法名称
     * 
     * @return RAG方法名称
     */
    String getMethodName();

    /**
     * 构建知识库索引
     * 
     * @param kbName 知识库名称
     * @param documentPoList 文档列表
     * @param params 构建参数，包括chunkSize, generateAbstract, embeddingModelName等
     * @return 构建结果列表，每个文档对应一个布尔值表示是否成功
     */
    List<Boolean> buildIndex(String kbName, List<DocumentPO> documentPoList, Map<String, Object> params);

    /**
     * 删除整个索引
     * 
     * @return 是否删除成功
     */
    Boolean deleteIndex();

    /**
     * 删除指定文档的索引
     * 
     * @param docIds 文档ID列表
     * @return 是否删除成功
     */
    Boolean deleteIndex(List<String> docIds);

    /**
     * 基于知识库进行问答
     * 
     * @param knowledgeBase 知识库
     * @param question 问题
     * @param params 问答参数，包括maxRes, topk等
     * @return 流式回答
     */
    Flux<String> chat(KnowledgeBase knowledgeBase, String question, Map<String, Object> params);

    /**
     * 检查是否支持指定的RAG方法
     * 
     * @param ragMethod RAG方法名称
     * @return 是否支持
     */
    boolean supports(String ragMethod);
}