package com.mtmn.smartdoc.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.HashMap;
import java.util.Map;

/**
 * @author charmingdaidai
 */
public class RagConfigFactory {

    private static final Map<String, RagConfigBuilder> CONFIG_BUILDERS = new HashMap<>();

    static {
        CONFIG_BUILDERS.put("naive", (embeddingModel, indexParam) -> {
            // 解析 indexParam JSON 并构建 NaiveRagConfig
            // 假设 indexParam 是 JSON 格式的字符串
            Map<String, Object> params = parseJson(indexParam);
            return NaiveRagConfig.builder()
                    .methodName("naive")
                    .embeddingModel(embeddingModel)
                    .chunkSize((Integer) params.getOrDefault("chunk-size", 512))
                    .chunkOverlap((Integer) params.getOrDefault("chunk-overlap", 100))
                    .build();
        });

        CONFIG_BUILDERS.put("hisem", (embeddingModel, indexParam) -> {
            // 解析 indexParam JSON 并构建 HiSemRagConfig
            Map<String, Object> params = parseJson(indexParam);
            return HiSemRagConfig.builder()
                    .methodName("hisem")
                    .embeddingModel(embeddingModel)
                    .chunkSize((Integer) params.getOrDefault("chunk-size", 2048))
                    .generateAbstract((Boolean) params.getOrDefault("abstract", false))
                    .build();
        });
    }

    public static BaseRagConfig createRagConfig(String methodName, String embeddingModel, String indexParam) {
        RagConfigBuilder builder = CONFIG_BUILDERS.get(methodName);
        if (builder == null) {
            throw new IllegalArgumentException("Unsupported RAG method: " + methodName);
        }
        return (BaseRagConfig) builder.build(embeddingModel, indexParam);
    }

    private static Map<String, Object> parseJson(String json) {
        ObjectMapper objectMapper = new ObjectMapper();
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to parse JSON: " + json, e);
        }
    }

    @FunctionalInterface
    private interface RagConfigBuilder {
        Object build(String embeddingModel, String indexParam);
    }
}