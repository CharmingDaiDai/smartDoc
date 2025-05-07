package com.mtmn.smartdoc.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * RAG方法配置类
 * 自动绑定application.yml中的rag配置
 * @author charmingdaidai
 */
@Configuration
@ConfigurationProperties(prefix = "rag")
@Getter
@Setter
public class RagConfig {
    
    /**
     * 默认RAG方法
     */
    private String defaultMethod;
    
    /**
     * 所有具体RAG方法配置
     */
    private RagMethodConfig naive;
    private RagMethodConfig hisem;
    private RagMethodConfig hisemTree;
    
    /**
     * 获取所有方法配置
     * @return 方法ID到方法配置的映射，保持配置文件中定义的顺序
     */
    public Map<String, RagMethodConfig> getAllMethods() {
        Map<String, RagMethodConfig> allMethods = new LinkedHashMap<>();
        
        if (getNaive() != null) {
            allMethods.put("naive", getNaive());
        }
        
        if (getHisem() != null) {
            allMethods.put("hisem", getHisem());
        }
        
        if (getHisemTree() != null) {
            allMethods.put("hisem-tree", getHisemTree());
        }
        
        return allMethods;
    }
    
    /**
     * 获取指定方法的配置
     */
    public RagMethodConfig getMethodConfig(String methodId) {
        return getAllMethods().get(methodId);
    }
    
    /**
     * 获取默认方法的配置
     */
    public RagMethodConfig getDefaultMethodConfig() {
        return getMethodConfig(defaultMethod);
    }
    
    /**
     * RAG方法配置类
     */
    @Getter
    @Setter
    public static class RagMethodConfig {
        private String name;
        private String description;
        private IndexConfig index = new IndexConfig();
        private SearchConfig search = new SearchConfig();
    }
    
    /**
     * 索引配置
     */
    @Getter
    @Setter
    public static class IndexConfig {
        private Integer chunkSize;
        private Integer chunkOverlap;
        private Boolean titleEnhance;
        private Boolean anAbstract; // 使用anAbstract避开Java关键字abstract
    }
    
    /**
     * 搜索配置
     */
    @Getter
    @Setter
    public static class SearchConfig {
        private Integer topK;
        private Integer maxRes;
    }
}