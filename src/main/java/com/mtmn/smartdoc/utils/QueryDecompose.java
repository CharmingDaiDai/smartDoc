package com.mtmn.smartdoc.utils;

import com.mtmn.smartdoc.service.LLMService;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * @author charmingdaidai
 * @version 1.0
 * @description 问题分解
 * @date 2025/8/3 13:23
 */
@Service
@Log4j2
public class QueryDecompose {

    @Autowired
    private LLMService llmService;

    @Value("${prompt.queryDecompose2}")
    private String QUERY_DECOMPOSE_PROMPT;

    public String[] decomposeQuery(String userQuery) {
        try {
            String prompt = String.format(QUERY_DECOMPOSE_PROMPT, userQuery);

            String response = llmService.createChatModel().chat(prompt);
            log.debug("问题分解 - 原始: {} | 分解: {}", userQuery, response);

            String[] queries = response.split("\n");

            // 记录日志
            log.info("问题分解 - 原始: {} | 分解: {}", userQuery, queries);

            return queries;

        } catch (Exception e) {
            log.error("问题分解失败", e);
            return new String[]{userQuery};
        }
    }
}