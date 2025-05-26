package com.mtmn.smartdoc.config;

import com.mtmn.smartdoc.po.DocumentPO;
import com.mtmn.smartdoc.service.MinioService;

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

    List<Boolean> buildIndex(String kbName, List<DocumentPO> documentPOList, MinioService minioService);

    Boolean deleteIndex();

    Boolean deleteIndex(List<String> docIds);
}