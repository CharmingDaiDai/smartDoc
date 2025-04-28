package com.mtmn.smartdoc.service.impl;

import com.mtmn.smartdoc.dto.AuthenticationRequest;
import com.mtmn.smartdoc.vo.AuthenticationResponse;
import com.mtmn.smartdoc.vo.GitHubUserInfoResponse;
import com.mtmn.smartdoc.vo.RegisterRequest;
import com.mtmn.smartdoc.po.User;
import com.mtmn.smartdoc.repository.UserRepository;
import com.mtmn.smartdoc.service.AuthenticationService;
import com.mtmn.smartdoc.service.JwtService;
import io.jsonwebtoken.ExpiredJwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
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
public class AuthenticationServiceImpl implements AuthenticationService {

    @Value("${spring.security.oauth2.client.github.client-id}")
    private String clientId;

    @Value("${spring.security.oauth2.client.github.secret}")
    private String clientSecret;

    @Value("${github.redirect.uri}")
    private String redirectUri;

    @Value("$spring.security.oauth2.client.github.scope")
    private String scope;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final RestTemplate restTemplate = new RestTemplate();



    @Override
    public AuthenticationResponse register(RegisterRequest request) {
        // 创建用户对象
        var user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .fullName(request.getFullName())
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
                .orElseThrow();

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

        return UriComponentsBuilder.fromHttpUrl("https://github.com/login/oauth/authorize") // fixme 解决硬编码
                .queryParam("client_id", clientId)
                .queryParam("redirect_uri", redirectUri) // fixme 这里的重定向链接是什么意思
                .queryParam("scope", scope)
                .queryParam("state", state)
                .build().toUriString();
    }

    @Override
    public AuthenticationResponse authenticateWithGithub(String code, String state) {
        // 1. 验证state以防CSRF

        // 2. 用授权码换取访问令牌
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, String> requestBody = Map.of(
                "client_id", clientId,
                "client_secret", clientSecret,
                "code", code,
                "redirect_uri", redirectUri
        );

        ResponseEntity<Map> tokenResponse = restTemplate.exchange(
                "https://github.com/login/oauth/access_token",
                HttpMethod.POST,
                new HttpEntity<>(requestBody, headers),
                Map.class
        );

        String accessToken = (String) tokenResponse.getBody().get("access_token");

        // 3. 获取GitHub用户信息
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

        // 4. 查找或创建用户
        User user = userRepository.findByGithubId(githubUser.getId())
                .orElseGet(() -> {
                    // 创建新用户
                    User newUser = new User();
                    newUser.setGithubId(githubUser.getId());
                    // 使用GitHub用户名
                    newUser.setUsername(githubUser.getLogin());
                    newUser.setEmail(githubUser.getEmail());
                    // 设置其他需要的字段
                    return userRepository.save(newUser);
                });

        // 5. 生成JWT令牌
        String jwtToken = jwtService.generateToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        return AuthenticationResponse.builder()
                .accessToken(jwtToken)
                .refreshToken(refreshToken)
                .build();
    }

    /**
     * 刷新令牌
     *
     * @param refreshToken 刷新令牌
     * @return 新的认证响应，包含新的访问令牌和刷新令牌
     */
    @Override
    public AuthenticationResponse refreshToken(String refreshToken) {
        try {
            // 从refreshToken中提取用户名
            String username = jwtService.extractUsername(refreshToken);
            if (username == null) {
                throw new BadCredentialsException("无效的刷新令牌");
            }

            // 获取用户
            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new BadCredentialsException("用户不存在"));

            // 验证刷新令牌有效性
            if (!jwtService.isTokenValid(refreshToken, user)) {
                throw new BadCredentialsException("刷新令牌已过期或无效");
            }

            // 生成新的访问令牌和刷新令牌
            String accessToken = jwtService.generateToken(user);
            String newRefreshToken = jwtService.generateRefreshToken(user);

            return AuthenticationResponse.builder()
                    .accessToken(accessToken)
                    .refreshToken(newRefreshToken)
                    .build();
        } catch (ExpiredJwtException e) {
            throw new BadCredentialsException("刷新令牌已过期");
        } catch (Exception e) {
            throw new BadCredentialsException("刷新令牌处理失败: " + e.getMessage());
        }
    }

}