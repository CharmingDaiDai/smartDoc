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
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * @author charmingdaidai
 * @version 1.0
 * @description 嵌入模型服务
 * @date 2025/4/18 10:00
 */
@Service
@Log4j2
@RequiredArgsConstructor
public class EmbeddingService {

    private final ModelConfig modelConfig;
    // 缓存已创建的模型实例，避免重复创建
    private final Map<String, EmbeddingModel> modelCache = new ConcurrentHashMap<>();
    
    /**
     * 创建嵌入模型 - 使用当前激活的模型配置
     */
    public EmbeddingModel createEmbeddingModel() {
        return createEmbeddingModel(modelConfig.getActiveEmbedding());
    }
    
    /**
     * 创建嵌入模型 - 根据指定的modelId
     * 
     * @param modelId 模型ID，如果为null则使用当前激活的模型
     * @return 对应的嵌入模型实例
     */
    public EmbeddingModel createEmbeddingModel(String modelId) {
        // 如果未指定modelId，使用当前激活的模型
        String targetModelId = modelId == null ? 
                modelConfig.getActiveEmbedding() : 
                modelId;
        
        // 先从缓存中获取
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
     * 创建文档向量
     */
    public EmbeddingStore<Embedding> createDocumentVectors(String content) {
        return createDocumentVectors(content, null);
    }
    
    /**
     * 创建文档向量 - 使用指定的模型
     * 
     * @param content 文档内容
     * @param modelId 要使用的模型ID，如果为null则使用当前激活的模型
     * @return 文档的嵌入存储
     */
    public EmbeddingStore<Embedding> createDocumentVectors(String content, String modelId) {
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
     * 获取文本嵌入
     */
    public Embedding embedText(String text) {
        return embedText(text, null);
    }
    
    /**
     * 获取文本嵌入 - 使用指定的模型
     * 
     * @param text 要嵌入的文本
     * @param modelId 要使用的模型ID，如果为null则使用当前激活的模型
     * @return 文本的嵌入向量
     */
    public Embedding embedText(String text, String modelId) {
        log.info("生成文本嵌入向量，使用模型：{}", modelId == null ? "默认" : modelId);
        EmbeddingModel embeddingModel = createEmbeddingModel(modelId);
        return embeddingModel.embed(text).content();
    }
    
    /**
     * 切换默认嵌入模型
     * @param modelId 模型ID
     * @return 是否切换成功
     */
    public boolean switchModel(String modelId) {
        boolean success = modelConfig.switchEmbeddingModel(modelId);
        if (success) {
            log.info("成功切换嵌入模型为: {}", modelId);
        } else {
            log.warn("切换嵌入模型失败: 未找到模型ID {}", modelId);
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