package com.mtmn.smartdoc.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mtmn.smartdoc.config.ModelConfig;
import com.mtmn.smartdoc.vo.SecurityResult;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.model.openai.OpenAiStreamingChatModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 大语言模型服务
 * 负责创建和管理不同的聊天模型，提供文本生成功能
 * 
 * @author charmingdaidai
 * @version 1.0
 * @date 2025/4/18 14:30
 */
@Service
@Log4j2
@RequiredArgsConstructor
public class LLMService {

    private final ModelConfig modelConfig;
    // 缓存已创建的模型实例，避免重复创建
    private final Map<String, ChatModel> modelCache = new ConcurrentHashMap<>();
    // 创建ObjectMapper实例用于JSON处理
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 创建聊天语言模型 - 使用当前激活的模型配置
     * 
     * 实现思路：
     * 1. 调用重载方法createChatModel(String modelId)
     * 2. 传入当前激活的模型ID作为参数
     * 3. 简化调用接口，适用于使用默认模型的场景
     * 
     * @return 基于当前激活配置的聊天模型实例
     */
    public ChatModel createChatModel() {
        return createChatModel(modelConfig.getActiveLlm());
    }

    /**
     * 创建聊天语言模型 - 根据指定的modelId
     * 
     * 实现思路：
     * 1. 处理modelId参数，如果为null则使用当前激活模型
     * 2. 使用ConcurrentHashMap的computeIfAbsent方法实现线程安全的缓存
     * 3. 根据modelId获取对应的模型配置信息
     * 4. 如果配置不存在则使用默认配置并记录警告
     * 5. 使用OpenAI客户端构建器创建聊天模型实例
     * 6. 缓存模型实例避免重复创建，提高性能
     *
     * @param modelId 模型ID，如果为null则使用当前激活的模型
     * @return 对应的聊天语言模型实例
     */
    public ChatModel createChatModel(String modelId) {
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
//                    .maxTokens(20000)
                    .build();
        });
    }

    /**
     * 创建流式聊天语言模型 - 使用当前激活的模型配置
     * 
     * 实现思路：
     * 1. 调用重载方法createStreamingChatModel(String modelId)
     * 2. 传入当前激活的模型ID作为参数
     * 3. 简化调用接口，适用于使用默认模型的流式场景
     * 
     * @return 基于当前激活配置的流式聊天模型实例
     */
    public OpenAiStreamingChatModel createStreamingChatModel() {
        return createStreamingChatModel(modelConfig.getActiveLlm());
    }

    /**
     * 创建流式聊天语言模型 - 根据指定的modelId
     * 
     * 实现思路：
     * 1. 处理modelId参数，如果为null则使用当前激活模型
     * 2. 根据modelId获取对应的模型配置信息
     * 3. 如果配置不存在则使用默认配置并记录警告
     * 4. 使用OpenAI流式客户端构建器创建流式聊天模型
     * 5. 设置最大完成令牌数以控制输出长度
     * 6. 适用于需要实时响应的聊天场景
     * 
     * @param modelId 模型ID，如果为null则使用当前激活的模型
     * @return 对应的流式聊天语言模型实例
     */
    public OpenAiStreamingChatModel createStreamingChatModel(String modelId){
        // 如果未指定modelId，使用当前激活的模型
        String targetModelId = modelId == null ?
                modelConfig.getActiveLlm() :
                modelId;

        // 获取模型配置
        ModelConfig.ModelProperties config = modelConfig.getLlmConfig(targetModelId);
        if (config == null) {
            log.warn("未找到模型配置：{}，将使用默认模型", targetModelId);
            config = modelConfig.getActiveLlmConfig();
        }
        
        log.info("创建流式聊天语言模型: {}", config.getModelName());

        // 构建并返回流式模型
        return OpenAiStreamingChatModel.builder()
                .apiKey(config.getApiKey())
                .baseUrl(config.getBaseUrl())
                .modelName(config.getModelName())
//                .maxTokens(20000)
                .maxCompletionTokens(32000)
                .build();
    }

    /**
     * 清理JSON字符串，处理可能的Markdown代码块和其他非标准格式
     * 
     * 实现思路：
     * 1. 检查输入字符串的有效性，空值返回默认JSON对象
     * 2. 移除可能的Markdown代码块标记（```json 和 ```）
     * 3. 查找第一个左大括号和最后一个右大括号的位置
     * 4. 提取大括号之间的内容作为有效JSON
     * 5. 如果无法找到有效的JSON结构则返回空对象
     * 6. 记录警告信息便于调试问题
     *
     * @param input 原始字符串，可能包含非JSON格式的内容
     * @return 清理后的JSON字符串，保证格式正确
     */
    private String cleanJsonString(String input) {
        if (input == null || input.isEmpty()) {
            return "{}";
        }

        // 移除可能的Markdown代码块标记
        String cleaned = input.replaceAll("```json", "")
                .replaceAll("```", "")
                .trim();

        // 寻找第一个{和最后一个}之间的内容，确保获取有效的JSON
        int firstBrace = cleaned.indexOf('{');
        int lastBrace = cleaned.lastIndexOf('}');

        if (firstBrace >= 0 && lastBrace > firstBrace) {
            cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        } else {
            log.warn("无法在字符串中找到有效的JSON对象: {}", cleaned);
            return "{}";
        }

        return cleaned;
    }

    /**
     * 生成文本摘要 - 使用默认模型
     * 
     * 实现思路：
     * 1. 调用重载方法generateSummary(String text, String modelId)
     * 2. 传入null作为modelId，使用当前激活的默认模型
     * 3. 简化调用接口，适用于大多数摘要生成场景
     * 
     * @param text 需要生成摘要的文本内容
     * @return 生成的摘要文本
     */
    public String generateSummary(String text) {
        return generateSummary(text, null);
    }

    /**
     * 生成文本摘要 - 使用指定的模型
     * 
     * 实现思路：
     * 1. 记录操作日志，包含使用的模型信息
     * 2. 根据modelId创建对应的聊天模型实例
     * 3. 构造专门的摘要生成提示词
     * 4. 调用模型的chat方法生成摘要
     * 5. 返回模型生成的摘要内容
     *
     * @param text    需要生成摘要的文本
     * @param modelId 要使用的模型ID，如果为null则使用当前激活的模型
     * @return 摘要内容
     */
    public String generateSummary(String text, String modelId) {
        log.info("生成文本摘要，使用模型：{}", modelId == null ? "默认" : modelId);
        ChatModel model = createChatModel(modelId);

        String prompt = String.format(
                "请为以下文本生成一个简洁、准确的摘要：%n%n%s",
                text
        );

        return model.chat(prompt);
    }


    /**
     * 提取文本关键词 - 使用默认模型
     * 
     * 实现思路：
     * 1. 调用重载方法extractKeywords(String text, String modelId)
     * 2. 传入null作为modelId，使用当前激活的默认模型
     * 3. 简化调用接口，适用于大多数关键词提取场景
     * 
     * @param text 需要提取关键词的文本内容
     * @return 提取的关键词列表
     */
    public List<String> extractKeywords(String text) {
        return extractKeywords(text, null);
    }

    /**
     * 提取文本关键词 - 使用指定的模型
     * 
     * 实现思路：
     * 1. 记录操作日志，包含使用的模型信息
     * 2. 根据modelId创建对应的聊天模型实例
     * 3. 构造严格要求JSON格式返回的关键词提取提示词
     * 4. 调用模型生成关键词提取结果
     * 5. 解析模型返回的JSON格式响应
     * 6. 捕获解析异常并返回空列表作为失败处理
     * 
     * @param text 需要提取关键词的文本内容
     * @param modelId 要使用的模型ID，如果为null则使用当前激活的模型
     * @return 提取的关键词列表，解析失败时返回空列表
     */
    public List<String> extractKeywords(String text, String modelId) {
        log.info("提取关键词，使用模型：{}", modelId == null ? "默认" : modelId);
        ChatModel model = createChatModel(modelId);

        // 构造 Prompt（严格返回 {"keywords":[…]}）
        String prompt = String.format(
                "你是一个关键词提取模型，请从下面的文本中提取关键词，返回严格 JSON 格式，如 {\"keywords\": [\"关键词1\", \"关键词2\"]}。不要输出其他内容。\n\n文本如下：\n%s",
                text
        );

        // 调用模型
        String response = model.chat(prompt);
        log.debug("模型返回：{}", response);

        // 解析并返回关键词列表
        try {
            return parseKeywordsFromJson(response);
        } catch (Exception e) {
            log.error("解析关键词失败: {}", e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    /**
     * 从JSON字符串中解析关键词列表
     * 
     * 实现思路：
     * 1. 调用cleanJsonString方法清理输入的JSON字符串
     * 2. 使用Jackson ObjectMapper解析JSON内容
     * 3. 获取"keywords"字段对应的JsonNode节点
     * 4. 检查节点是否为数组类型
     * 5. 遍历数组元素，提取每个关键词的文本值
     * 6. 过滤掉空值，构建最终的关键词列表
     * 7. 如果解析失败则返回空列表
     *
     * @param jsonString 包含关键词的JSON字符串
     * @return 解析出的关键词列表
     */
    private List<String> parseKeywordsFromJson(String jsonString) {
        try {
            // 处理可能的Markdown格式
            String cleanedJson = cleanJsonString(jsonString);

            // 使用Jackson解析JSON
            JsonNode rootNode = objectMapper.readTree(cleanedJson);

            // 获取keywords数组
            JsonNode keywordsNode = rootNode.get("keywords");
            if (keywordsNode != null && keywordsNode.isArray()) {
                List<String> keywords = new ArrayList<>();
                keywordsNode.forEach(node -> {
                    if (node.isTextual()) {
                        keywords.add(node.asText());
                    }
                });
                return keywords;
            } else {
                log.warn("JSON中不包含keywords数组: {}", cleanedJson);
                return Collections.emptyList();
            }
        } catch (Exception e) {
            log.error("JSON解析失败: {}", e.getMessage());
            throw new RuntimeException("无法解析关键词JSON", e);
        }
    }

    public String polishDocument(String text, String finalPolishType) {
        return polishDocument(text, finalPolishType, null);
    }

    public String polishDocument(String text, String polishType, String modelId) {
        log.info("润色文档，类型：{}，使用模型：{}", polishType, modelId == null ? "默认" : modelId);
        ChatModel model = createChatModel(modelId);

        // 根据不同的润色类型构造不同的提示词
        String prompt = switch (polishType) {
            case "formal" -> String.format(
                    "请对以下文本进行正式润色，使其更加专业、严谨，适合正式场合使用。保持原意的同时，调整语言结构、用词遣句，使其更加流畅、专业：\n\n%s",
                    text
            );
            case "concise" -> String.format(
                    "请对以下文本进行简洁润色，保留核心信息的同时，精简语言，去除冗余表达，使文本更加简洁明了：\n\n%s",
                    text
            );
            case "creative" -> String.format(
                    "请对以下文本进行创意润色，使其更加生动活泼，富有表现力。可以适当使用修辞手法、生动的比喻等，让文本更加吸引人：\n\n%s",
                    text
            );
            default -> String.format(
                    "请对以下文本进行润色，改进其表达方式，使其更加流畅、清晰：\n\n%s",
                    text
            );
        };

        // 调用模型获取润色结果
        String response = model.chat(prompt);
        log.debug("润色结果：{}", response);

        return response;
    }

    public List<SecurityResult.SensitiveInfo> detectSensitiveInfo(String text) {
        return detectSensitiveInfo(text, null);
    }

    public List<SecurityResult.SensitiveInfo> detectSensitiveInfo(String text, String modelId) {
        log.info("检测敏感信息，使用模型：{}", modelId == null ? "默认" : modelId);
        ChatModel model = createChatModel(modelId);

        String prompt = String.format(
                """
                        你是一个敏感信息检测模型，请严格按照以下要求处理输入文本：
                        
                        1. 读取输入文本
                        2. 在文本中识别以下敏感信息类型：
                           - 身份证号码
                           - 手机号码
                           - 银行卡信息
                           - 地址信息
                           - 敏感关键词（如"保密协议"等）
                           - 其他可能的个人隐私或安全相关信息
                        3. 对每条识别出的敏感信息，提取并输出以下字段：
                           - `type`：敏感信息类型（如"身份证号码"、"手机号码"等）
                           - `content`：原文中完整的敏感信息文本
                           - `risk`：风险等级，使用"高"、"中"、"低"三档
                           - `position`：起止位置对象，包含：
                             - `start`：敏感信息在原文中的起始字符索引（从 0 开始）
                             - `end`：敏感信息在原文中的结束字符索引（不含该索引的字符）
                        4. 输出格式必须为严格的 JSON，示例结构如下：
                        ```json
                        {
                          "sensitiveInfoList": [
                            {
                              "type": "身份证号码",
                              "content": "310123********1234",
                              "risk": "高",
                              "position": {"start": 120, "end": 138}
                            },
                            {
                              "type": "手机号码",
                              "content": "139****8888",
                              "risk": "中",
                              "position": {"start": 156, "end": 167}
                            }
                            // … 更多条目
                          ]
                        }
                        ```
                        
                        待检测内容：%s
                        """,
                text
        );

        // 调用模型
        String response = model.chat(prompt);
        log.debug("模型返回：{}", response);

        try {
            return parseSensitiveInfoFromJson(response);
        } catch (Exception e) {
            log.error("解析敏感信息失败: {}", e.getMessage(), e);
            return Collections.emptyList();
        }
    }
    
    /**
     * 从JSON字符串中解析敏感信息列表
     *
     * @param jsonString JSON字符串
     * @return 敏感信息列表
     */
    private List<SecurityResult.SensitiveInfo> parseSensitiveInfoFromJson(String jsonString) {
        try {
            // 处理可能的Markdown格式
            String cleanedJson = cleanJsonString(jsonString);

            // 使用Jackson解析JSON
            JsonNode rootNode = objectMapper.readTree(cleanedJson);

            // 获取sensitiveInfoList数组
            JsonNode sensitiveInfoListNode = rootNode.get("sensitiveInfoList");
            if (sensitiveInfoListNode != null && sensitiveInfoListNode.isArray()) {
                List<SecurityResult.SensitiveInfo> sensitiveInfoList = new ArrayList<>();
                
                sensitiveInfoListNode.forEach(node -> {
                    // 获取各个字段
                    String type = node.get("type").asText();
                    String content = node.get("content").asText();
                    String risk = node.get("risk").asText();
                    
                    // 获取position对象
                    JsonNode positionNode = node.get("position");
                    int start = positionNode.get("start").asInt();
                    int end = positionNode.get("end").asInt();
                    
                    // 创建Position对象
                    SecurityResult.Position position = new SecurityResult.Position(start, end);
                    
                    // 创建SensitiveInfo对象并添加到列表
                    SecurityResult.SensitiveInfo sensitiveInfo = SecurityResult.SensitiveInfo.builder()
                            .type(type)
                            .content(content)
                            .risk(risk)
                            .position(position)
                            .build();
                    
                    sensitiveInfoList.add(sensitiveInfo);
                });
                
                return sensitiveInfoList;
            } else {
                log.warn("JSON中不包含sensitiveInfoList数组: {}", cleanedJson);
                return Collections.emptyList();
            }
        } catch (Exception e) {
            log.error("敏感信息JSON解析失败: {}", e.getMessage());
            throw new RuntimeException("无法解析敏感信息JSON", e);
        }
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
     * @param context  相关上下文信息
     * @param modelId  要使用的模型ID，如果为null则使用当前激活的模型
     * @return 回答内容
     */
    public String answerQuestion(String question, String context, String modelId) {
        log.info("根据上下文回答问题，使用模型：{}", modelId == null ? "默认" : modelId);
        ChatModel model = createChatModel(modelId);

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
     * @param variables      变量
     * @param modelId        要使用的模型ID，如果为null则使用当前激活的模型
     * @return 回答内容
     */
    public String executePrompt(String promptTemplate, Map<String, Object> variables, String modelId) {
        log.info("执行自定义提示词，使用模型：{}", modelId == null ? "默认" : modelId);
        ChatModel model = createChatModel(modelId);

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