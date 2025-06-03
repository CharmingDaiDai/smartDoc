package com.mtmn.smartdoc.service;

import com.mtmn.smartdoc.config.ModelConfig;
import dev.langchain4j.data.document.Document;
import dev.langchain4j.data.document.DocumentSplitter;
import dev.langchain4j.data.document.splitter.DocumentByParagraphSplitter;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.openai.OpenAiEmbeddingModel;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.inmemory.InMemoryEmbeddingStore;
import jakarta.annotation.PostConstruct;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 嵌入模型服务
 * 负责创建和管理不同的嵌入模型，提供文本向量化功能
 * 
 * @author charmingdaidai
 * @version 1.0
 * @date 2025/4/18 10:00
 */
@Log4j2
@Service
// TODO 改回非静态的
public class EmbeddingService {

    private static final Map<String, EmbeddingModel> modelCache = new ConcurrentHashMap<>();

    @Autowired
    private ModelConfig modelConfigInstance;

    private static ModelConfig modelConfig;

    @PostConstruct
    public void init() {
        modelConfig = modelConfigInstance;
    }
    
    /**
     * 创建默认的嵌入模型
     * 
     * @return 嵌入模型实例
     */
    public static EmbeddingModel createEmbeddingModel() {
        if (modelConfig == null) {
            log.error("ModelConfig 未初始化，无法创建嵌入模型");
            throw new IllegalStateException("ModelConfig 未初始化");
        }
        return createEmbeddingModel(modelConfig.getActiveEmbedding());
    }

    /**
     * 创建指定模型的嵌入模型
     * 
     * @param modelId 模型ID
     * @return 嵌入模型实例
     */
    public static EmbeddingModel createEmbeddingModel(String modelId) {
        if (modelConfig == null) {
            log.error("ModelConfig 未初始化，无法创建嵌入模型");
            throw new IllegalStateException("ModelConfig 未初始化");
        }
        String targetModelId = modelId == null ? modelConfig.getActiveEmbedding() : modelId;
        return modelCache.computeIfAbsent(targetModelId, id -> {
            ModelConfig.ModelProperties config = modelConfig.getEmbeddingConfig(id);
            if (config == null) {
                log.warn("未找到模型配置：{}，将使用默认模型", id);
                config = modelConfig.getActiveEmbeddingConfig();
            }
            log.info("创建嵌入模型: {}", config.getModelName());
            return OpenAiEmbeddingModel.builder()
                    .apiKey(config.getApiKey())
                    .baseUrl(config.getBaseUrl())
                    .modelName(config.getModelName())
                    .build();
        });
    }

    /**
     * 从文档内容创建向量存储（使用默认模型）
     * 
     * @param content 文档内容
     * @return 向量存储
     */
    public static EmbeddingStore<Embedding> createDocumentVectors(String content) {
        return createDocumentVectors(content, null);
    }

    /**
     * 从文档内容创建向量存储（使用指定模型）
     * 
     * @param content 文档内容
     * @param modelId 模型ID
     * @return 向量存储
     */
    public static EmbeddingStore<Embedding> createDocumentVectors(String content, String modelId) {
        log.info("创建文档向量，使用模型：{}", modelId == null ? "默认" : modelId);
        Document document = Document.from(content);
        EmbeddingModel embeddingModel = createEmbeddingModel(modelId);
        EmbeddingStore<Embedding> embeddingStore = new InMemoryEmbeddingStore<>();

        DocumentSplitter splitter = new DocumentByParagraphSplitter(2048, 100);
        List<TextSegment> segments = splitter.split(document);
        List<Embedding> embeddings = embeddingModel.embedAll(segments).content();
        embeddingStore.addAll(embeddings);

        return embeddingStore;
    }

    /**
     * 将文本转换为嵌入向量（使用默认模型）
     * 
     * @param text 待嵌入的文本
     * @return 嵌入向量
     */
    public static Embedding embedText(String text) {
        return embedText(text, null);
    }

    /**
     * 将文本转换为嵌入向量（使用指定模型）
     * 
     * @param text 待嵌入的文本
     * @param modelId 模型ID
     * @return 嵌入向量
     */
    public static Embedding embedText(String text, String modelId) {
        log.info("生成文本嵌入向量，使用模型：{}", modelId == null ? "默认" : modelId);
        EmbeddingModel embeddingModel = createEmbeddingModel(modelId);
        return embeddingModel.embed(text).content();
    }

    /**
     * 切换默认嵌入模型
     * 
     * @param modelId 新的模型ID
     * @return 是否切换成功
     */
    public static boolean switchModel(String modelId) {
        boolean success = modelConfig.switchEmbeddingModel(modelId);
        if (success) {
            log.info("成功切换嵌入模型为: {}", modelId);
        } else {
            log.warn("切换嵌入模型失败: 未找到模型ID {}", modelId);
        }
        return success;
    }

    /**
     * 清除所有模型缓存
     */
    public static void clearModelCache() {
        modelCache.clear();
        log.info("已清除模型缓存");
    }

    /**
     * 刷新指定模型的缓存
     * 
     * @param modelId 模型ID
     */
    public static void refreshModelCache(String modelId) {
        modelCache.remove(modelId);
        log.info("已移除模型缓存: {}", modelId);
    }
}