package com.mtmn.smartdoc.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * @author charmingdaidai
 * @version 1.0
 * @description 创建知识库的请求
 * @date 2025/5/4 16:47
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CreateKbRequest {
    /**
     * 知识库名称
     */
    private String name;

    /**
     * 知识库描述
     */
    private String description;

    /**
     * 嵌入模型
     */
    private String embeddingModel;
    
    /**
     * RAG方法ID
     */
    private String ragMethod;
    
    /**
     * RAG参数，包含索引参数和搜索参数
     */
    private String indexParam;
}