package com.mtmn.smartdoc.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatisticsDTO {
    private long documents;  // 用户文档总数
    private long analysis;   // 文档分析总数
    private long keywords;   // 关键词提取数
    private long security;   // 安全检查数
}