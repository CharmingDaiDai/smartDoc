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
    private long documents;     // 文档总数
    private long analysis;      // 分析总次数
    private long keywords;      // 关键词提取次数
    private long security;      // 安全检测次数
}