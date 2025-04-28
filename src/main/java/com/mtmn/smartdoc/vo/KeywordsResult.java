package com.mtmn.smartdoc.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * @author charmingdaidai
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KeywordsResult {
    // 提取的关键词列表
    private List<String> keywords;
    // 关键词提取时间戳
    private long timestamp;
    // 文档原始长度
    private int originalLength;
}