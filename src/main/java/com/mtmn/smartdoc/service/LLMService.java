package com.mtmn.smartdoc.service;

import com.mtmn.smartdoc.config.ModelConfig;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * @author charmingdaidai
 * @version 1.0
 * @description 大语言模型服务
 * @date 2025/4/18 14:30
 */
@Service
@Log4j2
@RequiredArgsConstructor
public class LLMService {

    private final ModelConfig modelConfig;

    /**
     * 创建聊天语言模型
     */
    public ChatLanguageModel createChatModel() {
        ModelConfig.ModelProperties config = modelConfig.getActiveLlmConfig();
        log.info("创建聊天语言模型: {}", config.getModelName());
        return OpenAiChatModel.builder()
                .apiKey(config.getApiKey())
                .baseUrl(config.getBaseUrl())
                .modelName(config.getModelName())
                .build();
    }

    /**
     * 生成文本摘要
     *
     * @param text 需要生成摘要的文本
     * @return 摘要内容
     */
    public String generateSummary(String text) {
        log.info("生成文本摘要");
        ChatLanguageModel model = createChatModel();

        String prompt = String.format(
                "请为以下文本生成一个简洁、准确的摘要：%n%n%s",
                text
        );

        return model.chat(prompt);
    }

    /**
     * 回答问题
     *
     * @param question 问题
     * @param context  相关上下文信息
     * @return 回答内容
     */
    public String answerQuestion(String question, String context) {
        log.info("根据上下文回答问题");
        ChatLanguageModel model = createChatModel();

        String prompt = "请基于以下上下文回答问题。如果上下文中没有相关信息，请回答\"我没有足够的信息来回答这个问题。\"\n\n"
                + "上下文：{{context}}\n\n"
                + "问题：{{question}}";

        return model.chat(prompt);
    }

    /**
     * 执行自定义提示词
     *
     * @param promptTemplate 提示词模板
     * @param variables      变量
     * @return 回答内容
     */
    public String executePrompt(String promptTemplate, Map<String, Object> variables) {
        log.info("执行自定义提示词");
        ChatLanguageModel model = createChatModel();

        return model.chat(promptTemplate);
    }

    /**
     * 切换大语言模型
     *
     * @param modelId 模型ID
     * @return 是否切换成功
     */
    public boolean switchModel(String modelId) {
        boolean success = modelConfig.switchLlmModel(modelId);
        if (success) {
            log.info("成功切换大语言模型为: {}", modelId);
        } else {
            log.warn("切换大语言模型失败: 未找到模型ID {}", modelId);
        }
        return success;
    }
}