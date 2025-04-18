package com.mtmn.smartdoc.service;

import com.mtmn.smartdoc.config.ModelConfig;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

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
    // 缓存已创建的模型实例，避免重复创建
    private final Map<String, ChatLanguageModel> modelCache = new ConcurrentHashMap<>();

    /**
     * 创建聊天语言模型 - 使用当前激活的模型配置
     */
    public ChatLanguageModel createChatModel() {
        return createChatModel(modelConfig.getActiveLlm());
    }
    
    /**
     * 创建聊天语言模型 - 根据指定的modelId
     * 
     * @param modelId 模型ID，如果为null则使用当前激活的模型
     * @return 对应的聊天语言模型实例
     */
    public ChatLanguageModel createChatModel(String modelId) {
        // 如果未指定modelId，使用当前激活的模型
        String targetModelId = modelId == null ? 
                modelConfig.getActiveLlm() : 
                modelId;
        
        // 先从缓存中获取
        return modelCache.computeIfAbsent(targetModelId, id -> {
            ModelConfig.ModelProperties config = modelConfig.getLlmConfig(id);
            if (config == null) {
                log.warn("未找到模型配置：{}，将使用默认模型", id);
                config = modelConfig.getActiveLlmConfig();
            }
            log.info("创建聊天语言模型: {}", config.getModelName());
            return OpenAiChatModel.builder()
                    .apiKey(config.getApiKey())
                    .baseUrl(config.getBaseUrl())
                    .modelName(config.getModelName())
                    .build();
        });
    }

    /**
     * 生成文本摘要
     */
    public String generateSummary(String text) {
        return generateSummary(text, null);
    }
    
    /**
     * 生成文本摘要 - 使用指定的模型
     *
     * @param text 需要生成摘要的文本
     * @param modelId 要使用的模型ID，如果为null则使用当前激活的模型
     * @return 摘要内容
     */
    public String generateSummary(String text, String modelId) {
        log.info("生成文本摘要，使用模型：{}", modelId == null ? "默认" : modelId);
        ChatLanguageModel model = createChatModel(modelId);

        String prompt = String.format(
                "请为以下文本生成一个简洁、准确的摘要：%n%n%s",
                text
        );

        return model.chat(prompt);
    }

    /**
     * 回答问题
     */
    public String answerQuestion(String question, String context) {
        return answerQuestion(question, context, null);
    }
    
    /**
     * 回答问题 - 使用指定的模型
     *
     * @param question 问题
     * @param context 相关上下文信息
     * @param modelId 要使用的模型ID，如果为null则使用当前激活的模型
     * @return 回答内容
     */
    public String answerQuestion(String question, String context, String modelId) {
        log.info("根据上下文回答问题，使用模型：{}", modelId == null ? "默认" : modelId);
        ChatLanguageModel model = createChatModel(modelId);

        String prompt = "请基于以下上下文回答问题。如果上下文中没有相关信息，请回答\"我没有足够的信息来回答这个问题。\"\n\n"
                + "上下文：{{context}}\n\n"
                + "问题：{{question}}";

        return model.chat(prompt);
    }

    /**
     * 执行自定义提示词
     */
    public String executePrompt(String promptTemplate, Map<String, Object> variables) {
        return executePrompt(promptTemplate, variables, null);
    }
    
    /**
     * 执行自定义提示词 - 使用指定的模型
     *
     * @param promptTemplate 提示词模板
     * @param variables 变量
     * @param modelId 要使用的模型ID，如果为null则使用当前激活的模型
     * @return 回答内容
     */
    public String executePrompt(String promptTemplate, Map<String, Object> variables, String modelId) {
        log.info("执行自定义提示词，使用模型：{}", modelId == null ? "默认" : modelId);
        ChatLanguageModel model = createChatModel(modelId);

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
    
    /**
     * 清除模型缓存
     */
    public void clearModelCache() {
        modelCache.clear();
        log.info("已清除模型缓存");
    }
    
    /**
     * 刷新特定模型的缓存
     * 
     * @param modelId 需要刷新的模型ID
     */
    public void refreshModelCache(String modelId) {
        modelCache.remove(modelId);
        log.info("已移除模型缓存: {}", modelId);
    }
}