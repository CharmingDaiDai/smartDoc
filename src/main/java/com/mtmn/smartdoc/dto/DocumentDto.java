package com.mtmn.smartdoc.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentDto {
    private Long id;
    private String title;
    private String fileName;
    private String fileType;
    private Long fileSize;
    private String summary;
    private String keywords;
    private String sensitiveInfo;
    private String categories;
    private String fileUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}