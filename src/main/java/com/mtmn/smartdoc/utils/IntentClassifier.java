package com.mtmn.smartdoc.utils;

import com.mtmn.smartdoc.common.IntentResult;
import com.mtmn.smartdoc.service.LLMService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * @author charmingdaidai
 * @version 1.0
 * @description 意图识别器
 * @date 2025/5/31 16:44
 */
@Service
public class IntentClassifier {

    @Autowired
    private LLMService llmService;

    @Autowired
    private IntentResponseParser intentResponseParser;

    public static final String INTENT_PROMPT = """
        你是RAG系统的意图识别模块。请分析用户问题是否需要进行知识库检索，并以JSON格式返回结果。
        
        **需要检索的情况：**
        - 询问具体的技术问题、产品信息、政策规定
        - 需要查找特定文档、数据、资料
        - 询问专业领域知识
        - 请求具体的操作步骤或解决方案
        
        **不需要检索的情况：**
        - 简单问候：你好、再见、谢谢
        - 日常闲聊：天气、心情、随便聊聊
        - 对前一个回答的追问、澄清、举例要求
        - 通用常识问题（如基础数学、常见概念）
        - 系统功能询问：怎么使用、帮助说明
        
        **对话历史：**
        %s
        
        **当前用户问题：**
        %s
        
        **分析要求：**
        1. 仔细考虑是否是对前一轮回答的追问
        2. 评估问题的复杂度和专业性
        3. 如果不确定，倾向于需要检索
        
        **严格按照以下JSON格式返回，不要包含任何其他内容：**
        {
          "needRetrieval": true/false,
          "reason": "简短说明判断原因",
          "questionType": "问题类型分类"
        }
        """;

    public IntentResult analyzeIntent(String currentQuestion, String conversationHistory) {
        String prompt = String.format(INTENT_PROMPT,
                conversationHistory != null ? conversationHistory : "",
                currentQuestion);

        String response = llmService.createChatModel().chat(prompt);
        return intentResponseParser.parseJsonResponse(response);
    }
}