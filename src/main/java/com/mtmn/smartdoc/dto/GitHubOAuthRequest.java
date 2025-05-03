package com.mtmn.smartdoc.dto;

import lombok.Builder;
import lombok.Data;

/**
 * @author charmingdaidai
 * @version 1.0
 * @description GitHub 认证请求
 * @date 2025/4/28 15:37
 */
@Data
@Builder
public class GitHubOAuthRequest {
    private String code;
    // 用于防止CSRF攻击的状态值
    private String state;
}