package com.mtmn.smartdoc.service;


import dev.langchain4j.data.document.Document;
import dev.langchain4j.data.document.DocumentSplitter;
import dev.langchain4j.data.document.splitter.DocumentByParagraphSplitter;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.model.openai.OpenAiEmbeddingModel;
import dev.langchain4j.model.output.Response;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.inmemory.InMemoryEmbeddingStore;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * @author charmingdaidai
 * @version 1.0
 * @description LangChainService
 * @date 2025/4/15 15:03
 */
@Service
@Log4j2
public class LangChainService {

    @Value("${llm.openai.api-key}")
    private String openAiApiKey;

    @Value("${llm.openai.model}")
    private String modelName;

    @Value("${llm.openai.embedding-model}")
    private String embeddingModelName;

    @Value("${llm.openai.temperature}")
    private double temperature;

    /**
     * 创建聊天语言模型
     */
    public ChatLanguageModel createChatModel() {
        log.info("创建 OpenAI 聊天模型: {}", modelName);
        return OpenAiChatModel.builder()
                .apiKey(openAiApiKey)
                .modelName(modelName)
                .temperature(temperature)
                .build();
    }

    /**
     * 创建嵌入模型
     */
    public EmbeddingModel createEmbeddingModel() {
        log.info("创建 OpenAI 嵌入模型: {}", embeddingModelName);
        return OpenAiEmbeddingModel.builder()
                .apiKey(openAiApiKey)
                .modelName(embeddingModelName)
                .build();
    }

    /**
     * 生成文档摘要
     */
    public String chatSummary(String content) {
        log.info("生成文档摘要");
        ChatLanguageModel model = createChatModel();
        return model.chat("请为以下内容生成一个简洁的摘要（不超过200字）：\n\n" + content);
    }

    /**
     * 提取关键词
     */
    public String extractKeywords(String content) {
        log.info("提取文档关键词");
        ChatLanguageModel model = createChatModel();
        return model.chat("请从以下内容中提取5-10个关键词，以逗号分隔：\n\n" + content);
    }

    /**
     * 文档润色
     */
    public String polishDocument(String content, String type) {
        log.info("进行文档润色，类型: {}", type);
        ChatLanguageModel model = createChatModel();
        String prompt;

        switch (type) {
            case "formal":
                prompt = "请将以下内容润色为更加正式、专业的语言风格：\n\n";
                break;
            case "concise":
                prompt = "请将以下内容润色为更加简洁明了的表达方式：\n\n";
                break;
            case "creative":
                prompt = "请将以下内容润色为更加生动、富有创意的表达：\n\n";
                break;
            default:
                prompt = "请对以下内容进行语言润色，提高可读性和表达质量：\n\n";
        }

        return model.chat(prompt + content);
    }

    /**
     * 敏感信息检测
     */
    public String detectSensitiveInfo(String content) {
        log.info("进行敏感信息检测");
        ChatLanguageModel model = createChatModel();
        return model.chat("请检测以下内容中是否包含敏感信息（如个人隐私、机密数据等），" +
                "如果有，列出这些信息并说明原因，格式为JSON：\n\n" + content);
    }

    /**
     * 文档分类
     */
    public String classifyDocument(String content) {
        log.info("进行文档分类");
        ChatLanguageModel model = createChatModel();
        return model.chat("请对以下文档内容进行分类，返回最合适的一个分类名称（如技术文档、" +
                "商业报告、学术论文、新闻稿等）：\n\n" + content);
    }

    /**
     * 创建文档向量
     */
    public EmbeddingStore<Embedding> createDocumentVectors(String content) {
        log.info("创建文档向量");
        Document document = Document.from(content);
        EmbeddingModel embeddingModel = createEmbeddingModel();
        EmbeddingStore<Embedding> embeddingStore = new InMemoryEmbeddingStore<>();

        DocumentSplitter splitter = new DocumentByParagraphSplitter(2048, 100);
        List<TextSegment> segments = splitter.split(document);
        List<Embedding> embeddings = embeddingModel.embedAll(segments).content();
        embeddingStore.addAll(embeddings);

        return embeddingStore;
    }
}