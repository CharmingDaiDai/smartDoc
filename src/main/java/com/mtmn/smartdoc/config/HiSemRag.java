package com.mtmn.smartdoc.config;

import dev.langchain4j.data.document.Document;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * @author charmingdaidai
 * @version 1.0
 * @description HiSemRAG 配置类
 * @date 2025/5/8 09:19
 */

@Data
@Builder
public class HiSemRag implements BaseRag {
    private String methodName;

    private String embeddingModel;

    private Integer chunkSize;

    private Boolean generateAbstract;

    /**
     * @return
     */
    @Override
    public List<Boolean> buildIndex(String kbName, List<Document> documents) {
        return null;
    }

    /**
     * @return
     */
    @Override
    public Boolean deleteIndex() {
        return null;
    }
}