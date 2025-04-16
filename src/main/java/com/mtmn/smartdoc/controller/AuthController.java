package com.mtmn.smartdoc.controller;

import com.mtmn.smartdoc.common.ApiResponse;
import com.mtmn.smartdoc.dto.AuthenticationRequest;
import com.mtmn.smartdoc.dto.AuthenticationResponse;
import com.mtmn.smartdoc.dto.RegisterRequest;
import com.mtmn.smartdoc.dto.TokenRefreshRequest;
import com.mtmn.smartdoc.service.AuthenticationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "认证", description = "用户认证和注册接口")
@Slf4j
public class AuthController {

    private final AuthenticationService authenticationService;

    @PostMapping("/register")
    @Operation(summary = "用户注册", description = "注册新用户")
    public ApiResponse<AuthenticationResponse> register(
            @RequestBody RegisterRequest request
    ) {
        log.info("收到用户注册请求: {}", request.getUsername());
        try {
            AuthenticationResponse response = authenticationService.register(request);
            log.info("用户注册成功: {}", request.getUsername());
            return ApiResponse.success("用户注册成功", response);
        } catch (Exception e) {
            log.error("用户注册失败: {} - 错误信息: {}", request.getUsername(), e.getMessage());
            throw e;
        }
    }

    @PostMapping("/login")
    @Operation(summary = "用户登录", description = "用户名密码登录")
    public ApiResponse<AuthenticationResponse> login(
            @RequestBody AuthenticationRequest request
    ) {
        log.info("收到用户登录请求: {}", request.getUsername());
        try {
            AuthenticationResponse response = authenticationService.authenticate(request);
            log.info("用户登录成功: {}", request.getUsername());
            return ApiResponse.success("登录成功", response);
        } catch (Exception e) {
            log.error("用户登录失败: {} - 错误信息: {}", request.getUsername(), e.getMessage());
            throw e;
        }
    }

    @PostMapping("/refresh-token")
    @Operation(summary = "刷新令牌", description = "使用刷新令牌获取新的访问令牌")
    public ApiResponse<AuthenticationResponse> refreshToken(
            @RequestBody TokenRefreshRequest request
    ) {
        log.info("收到令牌刷新请求");
        try {
            AuthenticationResponse response = authenticationService.refreshToken(request.getRefreshToken());
            log.info("令牌刷新成功");
            return ApiResponse.success("令牌刷新成功", response);
        } catch (Exception e) {
            log.error("令牌刷新失败 - 错误信息: {}", e.getMessage());
            throw e;
        }
    }
}