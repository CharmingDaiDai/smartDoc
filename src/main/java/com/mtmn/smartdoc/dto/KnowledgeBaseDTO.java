package com.mtmn.smartdoc.dto;

import com.mtmn.smartdoc.po.KnowledgeBase;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * @author charmingdaidai
 * @version 1.0
 * @description 知识库数据传输对象
 * @date 2025/5/6 10:00
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KnowledgeBaseDTO {
    private Long id;
    private Long userId;
    private String name;
    private String description;
    private String embeddingModel;
    private String ragMethod;
    private String indexParam;
    private LocalDateTime createdAt;
    
    /**
     * 反序列化后的RAG参数，只用于传输，不存储
     */
    private Map<String, Object> ragParams;
    
    /**
     * 将实体对象转换为DTO
     *
     * @param entity 知识库实体
     * @return 知识库DTO
     */
    public static KnowledgeBaseDTO fromEntity(KnowledgeBase entity) {
        if (entity == null) {
            return null;
        }
        
        return KnowledgeBaseDTO.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .name(entity.getName())
                .description(entity.getDescription())
                .embeddingModel(entity.getEmbeddingModel())
                .ragMethod(entity.getRag())
                .indexParam(entity.getIndexParam())
                .createdAt(entity.getCreatedAt())
                .build();
    }
    
    /**
     * 将实体列表转换为DTO列表
     *
     * @param entities 知识库实体列表
     * @return 知识库DTO列表
     */
    public static List<KnowledgeBaseDTO> fromEntityList(List<KnowledgeBase> entities) {
        if (entities == null) {
            return List.of();
        }
        
        return entities.stream()
                .map(KnowledgeBaseDTO::fromEntity)
                .collect(Collectors.toList());
    }
}