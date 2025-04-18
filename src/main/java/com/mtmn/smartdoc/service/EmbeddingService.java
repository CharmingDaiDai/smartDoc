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

    /**
     * 创建嵌入模型
     */
    public EmbeddingModel createEmbeddingModel() {
        ModelConfig.ModelProperties config = modelConfig.getActiveEmbeddingConfig();
        log.info("创建嵌入模型: {}", config.getModelName());
        return OpenAiEmbeddingModel.builder()
                .apiKey(config.getApiKey())
                .baseUrl(config.getBaseUrl())
                .modelName(config.getModelName())
                .build();
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
    
    /**
     * 获取文本嵌入
     */
    public Embedding embedText(String text) {
        log.info("生成文本嵌入向量");
        EmbeddingModel embeddingModel = createEmbeddingModel();
        return embeddingModel.embed(text).content();
    }
    
    /**
     * 切换嵌入模型
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
}