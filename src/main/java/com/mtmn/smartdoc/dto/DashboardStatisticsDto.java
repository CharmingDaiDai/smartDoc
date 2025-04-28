package com.mtmn.smartdoc.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * @author charmingdaidai
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatisticsDto {
    private long documents;  // 用户文档总数
    private long analysis;   // 文档分析总数
    private long keywords;   // 关键词提取数
    private long security;   // 安全检查数
    private long summary;    // 生成摘要数
    private long polish;     // 内容润色数
}