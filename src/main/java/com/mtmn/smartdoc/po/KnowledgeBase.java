package com.mtmn.smartdoc.po;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * @author charmingdaidai
 * @version 1.0
 * @description 知识库实体类
 * @date 2025/5/4 17:00
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "knowledge_base")
@JsonIgnoreProperties({"user"})
public class KnowledgeBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // 添加冗余字段存储用户ID，方便查询和返回
    @Column(name = "user_id", insertable = false, updatable = false)
    private Long userId;

    @Column(nullable = false)
    private String name;

    @Column(name = "rag", nullable = true)
    private String rag;

    @Column(name = "description")
    private String description;

    @Column(name = "embedding_model", nullable = true)
    private String embeddingModel;

    @Column(name = "index_param", columnDefinition = "TEXT")
    private String indexParam;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}