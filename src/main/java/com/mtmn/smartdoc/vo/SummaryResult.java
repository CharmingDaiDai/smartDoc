package com.mtmn.smartdoc.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SummaryResult {
    // 文档摘要结果
    private String summary;
    // 摘要生成时间戳
    private long timestamp;
    // 文档原始长度
    private int originalLength;
    // 摘要长度
    private int summaryLength;
}