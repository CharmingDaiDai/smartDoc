package com.mtmn.smartdoc.utils;

import com.mtmn.smartdoc.common.QueryRewriteResult;
import com.mtmn.smartdoc.service.LLMService;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * @author charmingdaidai
 * @version 1.0
 * @description TODO
 * @date 2025/6/1 13:23
 */
@Service
@Log4j2
public class QueryRewrite {

    @Autowired
    private QueryRewriteParser queryRewriteParser;

    @Autowired
    private LLMService llmService;

    private static final String SIMPLE_REWRITE_PROMPT = """
        你是查询重写专家。根据对话上下文，将用户问题重写为更适合检索的形式。
        
        **重写原则：**
        1. 补充上下文信息，解决指代不明（如"它"、"这个"等）
        2. 将口语化表达转为标准表达
        3. 如果原问题已经清晰，保持不变
        4. 保持用户的核心意图
        5. 去掉和知识点无关的内容
        
        **对话历史：**
        %s
        
        **用户问题：**
        %s
        
        **返回JSON格式：**
        {
          "rewrittenQuery": "重写后的查询",
          "reason": "简短说明重写原因"
        }
        """;

    public QueryRewriteResult rewriteQuery(String conversationHistory, String originalQuery) {
        try {
            String prompt = String.format(SIMPLE_REWRITE_PROMPT, conversationHistory, originalQuery);

            String response = llmService.createChatModel().chat(prompt);
            QueryRewriteResult result = queryRewriteParser.parseSimpleResponse(response);
            result.setOriginalQuery(originalQuery);

            // 记录日志
            log.info("查询重写 - 原始: {} | 重写: {} | 原因: {}",
                    originalQuery, result.getRewrittenQuery(), result.getReason());

            return result;

        } catch (Exception e) {
            log.error("查询重写失败", e);
            return QueryRewriteResult.builder().rewrittenQuery(originalQuery).build();
        }
    }
}