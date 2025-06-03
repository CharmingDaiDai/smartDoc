package com.mtmn.smartdoc.service;

import com.mtmn.smartdoc.po.DocumentPO;
import com.mtmn.smartdoc.po.KnowledgeBase;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Map;

/**
 * @author charmingdaidai
 * @version 1.0
 * @description  TODO
 * @date 2025/5/9 09:53
 */

public interface BaseRag {
    String getMethodName();

    // Integer chunkSize, Boolean generateAbstract, String embeddingModelName
    List<Boolean> buildIndex(String kbName, List<DocumentPO> documentPoList, Map<String, Object> params);

    Boolean deleteIndex();

    Boolean deleteIndex(List<String> docIds);

    // maxRes topk
    Flux<String> chat(KnowledgeBase knowledgeBase, String question, Map<String, Object> params);

    boolean supports(String ragMethod);
}