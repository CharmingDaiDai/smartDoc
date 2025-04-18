package com.mtmn.smartdoc.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

/**
 * 模型配置类
 * 用于统一管理不同的模型配置
 */
@Configuration
@ConfigurationProperties(prefix = "models")
@Getter
@Setter
public class ModelConfig {
    
    /**
     * 大语言模型配置
     */
    private Map<String, ModelProperties> llm = new HashMap<>();
    
    /**
     * 嵌入模型配置
     */
    private Map<String, ModelProperties> embedding = new HashMap<>();
    
    /**
     * 当前激活的大语言模型ID
     */
    private String activeLlm = "glm";
    
    /**
     * 当前激活的嵌入模型ID
     */
    private String activeEmbedding = "bge-m3";
    
    /**
     * 获取当前激活的大语言模型配置
     */
    public ModelProperties getActiveLlmConfig() {
        return llm.get(activeLlm);
    }
    
    /**
     * 获取当前激活的嵌入模型配置
     */
    public ModelProperties getActiveEmbeddingConfig() {
        return embedding.get(activeEmbedding);
    }
    
    /**
     * 切换当前激活的大语言模型
     * @param modelId 模型ID
     * @return 是否切换成功
     */
    public boolean switchLlmModel(String modelId) {
        if (llm.containsKey(modelId)) {
            this.activeLlm = modelId;
            return true;
        }
        return false;
    }
    
    /**
     * 切换当前激活的嵌入模型
     * @param modelId 模型ID
     * @return 是否切换成功
     */
    public boolean switchEmbeddingModel(String modelId) {
        if (embedding.containsKey(modelId)) {
            this.activeEmbedding = modelId;
            return true;
        }
        return false;
    }
    
    /**
     * 模型属性配置类
     */
    @Getter
    @Setter
    public static class ModelProperties {
        private String apiKey;
        private String baseUrl;
        private String modelName;
    }
}