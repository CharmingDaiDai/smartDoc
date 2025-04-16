package com.mtmn.smartdoc.config;

import com.mtmn.smartdoc.entity.User;
import com.mtmn.smartdoc.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;

@Configuration
@RequiredArgsConstructor
@Log4j2
public class DatabaseInitializer {

    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;

    @Bean
    public CommandLineRunner initDatabase() {
        return args -> {
            if (userRepository.count() == 0) {
                log.info("初始化测试用户数据...");
                
                // 创建普通用户
                User normalUser = User.builder()
                        .username("user")
                        .password(passwordEncoder.encode("password"))
                        .email("user@example.com")
                        .fullName("普通用户")
                        .vip(false)
                        .createdAt(LocalDateTime.now())
                        .enabled(true)
                        .build();
                
                // 创建VIP用户
                User vipUser = User.builder()
                        .username("vipUser")
                        .password(passwordEncoder.encode("password"))
                        .email("vip@example.com")
                        .fullName("VIP用户")
                        .vip(true)
                        .createdAt(LocalDateTime.now())
                        .enabled(true)
                        .build();
                
                // 创建管理员用户
                User adminUser = User.builder()
                        .username("admin")
                        .password(passwordEncoder.encode("admin123"))
                        .email("admin@example.com")
                        .fullName("系统管理员")
                        .vip(true)
                        .createdAt(LocalDateTime.now())
                        .enabled(true)
                        .build();
                
                userRepository.saveAll(List.of(normalUser, vipUser, adminUser));
                log.info("测试用户数据初始化完成");
            }
        };
    }
}