package com.mtmn.smartdoc.service;

import com.mtmn.smartdoc.dto.AuthenticationRequest;
import com.mtmn.smartdoc.dto.AuthenticationResponse;
import com.mtmn.smartdoc.dto.RegisterRequest;
import com.mtmn.smartdoc.entity.User;
import com.mtmn.smartdoc.repository.UserRepository;
import io.jsonwebtoken.ExpiredJwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthenticationService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    
    public AuthenticationResponse register(RegisterRequest request) {
        // 创建用户对象
        var user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .fullName(request.getFullName())
                .password(passwordEncoder.encode(request.getPassword()))
                .vip(false) // 默认非VIP
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
    
    /**
     * 刷新令牌
     * @param refreshToken 刷新令牌
     * @return 新的认证响应，包含新的访问令牌和刷新令牌
     */
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