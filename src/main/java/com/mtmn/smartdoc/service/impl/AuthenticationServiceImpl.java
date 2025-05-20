package com.mtmn.smartdoc.service.impl;

import com.mtmn.smartdoc.common.CustomException;
import com.mtmn.smartdoc.dto.AuthenticationRequest;
import com.mtmn.smartdoc.po.User;
import com.mtmn.smartdoc.repository.UserRepository;
import com.mtmn.smartdoc.service.AuthenticationService;
import com.mtmn.smartdoc.service.JwtService;
import com.mtmn.smartdoc.service.MinioService;
import com.mtmn.smartdoc.vo.AuthenticationResponse;
import com.mtmn.smartdoc.vo.GitHubUserInfoResponse;
import com.mtmn.smartdoc.vo.RegisterRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * @author charmingdaidai
 */
@Service
@RequiredArgsConstructor
@Log4j2
public class AuthenticationServiceImpl implements AuthenticationService {

    @Value("${spring.security.oauth2.client.github.client-id}")
    private String clientId;

    @Value("${spring.security.oauth2.client.github.client-secret}")
    private String clientSecret;

    @Value("${spring.security.oauth2.client.github.redirectUri}")
    private String redirectUri;

    @Value("${spring.security.oauth2.client.github.scope}")
    private String scope;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    private final RestTemplate restTemplate;
    private final MinioService minioService;

    @Override
    public AuthenticationResponse register(RegisterRequest request) {
        // 创建用户对象
        var user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                // .fullName(request.getFullName())
                .password(passwordEncoder.encode(request.getPassword()))
                .vip(false)
                .createdAt(LocalDateTime.now())
                .enabled(true)
                .build();

        // 保存用户
        userRepository.save(user);

        // 生成JWT令牌
        var jwtToken = jwtService.generateToken(user);
        var refreshToken = jwtService.generateRefreshToken(user);

        return AuthenticationResponse.builder()
                .accessToken(jwtToken)
                .refreshToken(refreshToken)
                .build();
    }

    @Override
    public AuthenticationResponse authenticate(AuthenticationRequest request) {
        // 进行认证
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );

        // 获取用户
        var user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new CustomException(404, "用户不存在"));

        if (!user.isEnabled()) {
            throw new CustomException(403, "用户已被禁用");
        }

        // 更新最后登录时间
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        // 生成JWT令牌
        var jwtToken = jwtService.generateToken(user);
        var refreshToken = jwtService.generateRefreshToken(user);

        return AuthenticationResponse.builder()
                .accessToken(jwtToken)
                .refreshToken(refreshToken)
                .build();
    }

    @Override
    public String createGithubAuthorizationUrl() {
        String state = UUID.randomUUID().toString();
        // 保存state到session或缓存以便后续验证

        return UriComponentsBuilder.fromHttpUrl("https://github.com/login/oauth/authorize")
                .queryParam("client_id", clientId)
                .queryParam("redirect_uri", redirectUri)
                .queryParam("scope", scope)
                .queryParam("state", state)
                .build().toUriString();
    }

    @Override
    public AuthenticationResponse authenticateWithGithub(String code, String state) {
        try {
            // 1. 用授权码换取访问令牌
//            HttpHeaders headers = new HttpHeaders();
//            headers.setContentType(MediaType.APPLICATION_JSON);
//            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
//
//            Map<String, String> requestBody = Map.of(
//                    "client_id", clientId,
//                    "client_secret", clientSecret,
//                    "code", code,
//                    "redirect_uri", redirectUri
//            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            MultiValueMap<String, String> requestBody = new LinkedMultiValueMap<>();
            requestBody.add("client_id", clientId);
            requestBody.add("client_secret", clientSecret);
            requestBody.add("code", code);
            requestBody.add("redirect_uri", redirectUri);

            ResponseEntity<Map> tokenResponse = restTemplate.exchange(
                    "https://github.com/login/oauth/access_token",
                    HttpMethod.POST,
                    new HttpEntity<>(requestBody, headers),
                    Map.class
            );

            if (tokenResponse.getBody() == null || !tokenResponse.getBody().containsKey("access_token")) {
                throw new RuntimeException("获取GitHub访问令牌失败");
            }

            String accessToken = (String) tokenResponse.getBody().get("access_token");

            // 2. 获取GitHub用户信息
            HttpHeaders userInfoHeaders = new HttpHeaders();
            userInfoHeaders.setBearerAuth(accessToken);
            userInfoHeaders.set("Accept", "application/json");

            ResponseEntity<GitHubUserInfoResponse> userInfoResponse = restTemplate.exchange(
                    "https://api.github.com/user",
                    HttpMethod.GET,
                    new HttpEntity<>(userInfoHeaders),
                    GitHubUserInfoResponse.class
            );

            GitHubUserInfoResponse githubUser = userInfoResponse.getBody();

            if (githubUser == null) {
                throw new UsernameNotFoundException("GitHub 认证失败: 获取用户信息失败");
            }

            String gitId = githubUser.getId().toString();
            String avatarUrl = githubUser.getAvatarUrl();
            String minioAvatarPath = null;
            
            // 下载并上传GitHub头像到MinIO
            if (avatarUrl != null && !avatarUrl.isEmpty()) {
                try {
                    // 使用新的方法从URL直接下载并上传到MinIO
                    String fileName = "github_avatar_" + gitId + ".jpg";
                    minioAvatarPath = minioService.uploadFileFromUrl(avatarUrl, fileName);
                    log.info("GitHub头像成功上传到MinIO: {}", minioAvatarPath);
                } catch (Exception e) {
                    log.error("下载或上传GitHub用户头像失败: {}", e.getMessage(), e);
                    // 发生错误不中断主流程，继续执行
                }
            }

            // 3. 查找或创建用户
            String finalMinioAvatarPath = minioAvatarPath;
            User user = userRepository.findByGithubId(gitId)
                    .orElseGet(() -> {
                        // 创建新用户
                        User newUser = User.builder()
                                .githubId(gitId)
                                .username(githubUser.getLogin() + "_github") // 确保用户名不冲突
                                .email(githubUser.getEmail())
                                .avatarPath(finalMinioAvatarPath) // 使用MinIO中的头像路径
                                .password(passwordEncoder.encode(UUID.randomUUID().toString())) // 随机密码
                                .vip(false)
                                .createdAt(LocalDateTime.now())
                                .enabled(true)
                                .build();

                        return userRepository.save(newUser);
                    });

            // 4. 更新用户信息（如果是已存在用户）
            if (user.getId() != null) {

                if (user.getAvatarPath() == null && minioAvatarPath != null) {
                    user.setAvatarPath(minioAvatarPath);
                }

                // 更新最后登录时间
                user.setLastLogin(LocalDateTime.now());

                user = userRepository.save(user);

            }

            // 5. 生成JWT令牌
            String jwtToken = jwtService.generateToken(user);
            String refreshToken = jwtService.generateRefreshToken(user);

            return AuthenticationResponse.builder()
                    .accessToken(jwtToken)
                    .refreshToken(refreshToken)
                    .build();
        } catch (Exception e) {
            throw new RuntimeException("GitHub 登录处理失败: " + e.getMessage(), e);
        }
    }

    @Override
    public AuthenticationResponse refreshToken(String refreshToken) {
        // 验证刷新令牌的有效性
        String username = jwtService.extractUsername(refreshToken);
        if (username == null) {
            throw new CustomException(401, "无效的刷新令牌");
        }

        // 获取用户信息
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new CustomException(404, "用户不存在"));

        if (!jwtService.isTokenValid(refreshToken, user)) {
            throw new CustomException(401, "无效的刷新令牌");
        }

        // 生成新的访问令牌和刷新令牌
        String newAccessToken = jwtService.generateToken(user);
        String newRefreshToken = jwtService.generateRefreshToken(user);

        // 返回新的认证响应
        return AuthenticationResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .build();
    }
}