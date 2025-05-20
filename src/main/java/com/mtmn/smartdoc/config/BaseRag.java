package com.mtmn.smartdoc.config;

import dev.langchain4j.data.document.Document;

import java.util.List;

/**
 * @author charmingdaidai
 * @version 1.0
 * @description  TODO
 * @date 2025/5/9 09:53
 */

public interface BaseRag {
    String getMethodName();
    String getEmbeddingModel();

    List<Boolean> buildIndex(String kbName, List<Document> documents);

    Boolean deleteIndex();
}