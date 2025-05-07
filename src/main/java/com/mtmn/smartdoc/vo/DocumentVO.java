package com.mtmn.smartdoc.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * @author charmingdaidai
 * @version 1.0
 * @description 知识库文档返回模型
 * @date 2025/5/7 09:51
 */

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentVO {
    private Long id;
    private String title;
    private String fileName;
    private String fileType;
    private Long fileSize;
    private String fileUrl;
    private Boolean indexed;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}