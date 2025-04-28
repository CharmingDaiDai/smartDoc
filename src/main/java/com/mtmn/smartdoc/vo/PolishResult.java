package com.mtmn.smartdoc.vo;

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
public class PolishResult {
    // 润色后的文档内容
    private String polishedContent;
    // 润色类型：formal(正式), concise(简洁), creative(创意)
    private String polishType;
    // 润色时间戳
    private long timestamp;
    // 文档原始长度
    private int originalLength;
    // 润色后长度
    private int polishedLength;
}