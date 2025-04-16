package com.mtmn.smartdoc.service;

import com.mtmn.smartdoc.dto.AuthenticationRequest;
import com.mtmn.smartdoc.dto.AuthenticationResponse;
import com.mtmn.smartdoc.dto.RegisterRequest;
import com.mtmn.smartdoc.entity.User;
import com.mtmn.smartdoc.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
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
}