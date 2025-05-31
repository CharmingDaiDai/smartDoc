package com.mtmn.smartdoc.common;

/**
 * @author charmingdaidai
 * @version 1.0
 * @description 意图识别结果
 * @date 2025/5/31 16:46
 */

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class IntentResult {

    /**
     * 是否需要检索
     */
    private boolean needRetrieval;

    /**
     * 判断原因
     */
    private String reason;

    /**
     * 问题类型
     */
    private String questionType;

    /**
     * 是否解析成功
     */
    private boolean parseSuccess = true;

    /**
     * 原始响应（用于调试）
     */
    private String rawResponse;
}