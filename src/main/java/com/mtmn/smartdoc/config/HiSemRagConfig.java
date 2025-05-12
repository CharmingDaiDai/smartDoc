package com.mtmn.smartdoc.config;

import lombok.Builder;
import lombok.Data;

/**
 * @author charmingdaidai
 * @version 1.0
 * @description HiSemRAG 配置类
 * @date 2025/5/8 09:19
 */

@Data
@Builder
public class HiSemRagConfig implements BaseRagConfig {
    private String methodName;

    private String embeddingModel;

    private Integer chunkSize;

    private Boolean generateAbstract;
}