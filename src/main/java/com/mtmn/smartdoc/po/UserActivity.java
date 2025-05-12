package com.mtmn.smartdoc.po;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * @author charmingdaidai
 */
@Entity
@Table(name = "user_activities")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserActivity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "activity_type", length = 50, nullable = false)
    private String activityType;

    @Column(name = "document_id")
    private Long documentId;

    @Column(name = "document_name", length = 255)
    private String documentName;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", insertable = false, updatable = false)
    private DocumentPO document;

    /**
     * 活动类型枚举
     */
    public enum ActivityType {
        SUMMARY("摘要生成"),
        KEYWORDS("关键词提取"),
        SECURITY("安全检查"),
        POLISH("文档润色"),
        UPLOAD("文档上传"),
        DOWNLOAD("文档下载");

        private final String description;

        ActivityType(String description) {
            this.description = description;
        }

        public String getDescription() {
            return description;
        }
    }
}