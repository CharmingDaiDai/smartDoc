package com.mtmn.smartdoc.config;

import com.mtmn.smartdoc.po.User;
import com.mtmn.smartdoc.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.FileCopyUtils;

import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;

/**
 * @author charmingdaidai
 */
@Configuration
@RequiredArgsConstructor
@Log4j2
public class DatabaseInitializer {

    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;
    private final JdbcTemplate jdbcTemplate;

    @Bean
    public CommandLineRunner initDatabase() {
        return args -> {
            // 初始化数据库表
            initDatabaseTables();
            
            // 初始化用户数据
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
    
    /**
     * 初始化数据库表
     */
    private void initDatabaseTables() {
        try {
            log.info("开始初始化数据库表...");
            
            // 执行创建文档表的SQL
            String createDocumentsTableSql = readResourceFile("db/create_documents_table.sql");
            if (createDocumentsTableSql != null && !createDocumentsTableSql.isEmpty()) {
                log.info("执行文档表创建SQL");
                jdbcTemplate.execute(createDocumentsTableSql);
            }
            
            // 执行创建用户活动记录表的SQL - 先创建表，然后再创建索引
            String createUserActivitiesTableSql = readResourceFile("db/create_user_activities_table.sql");
            if (createUserActivitiesTableSql != null && !createUserActivitiesTableSql.isEmpty()) {
                log.info("执行用户活动记录表创建SQL");
                
                // 将SQL脚本拆分为单独的语句
                String[] sqlStatements = createUserActivitiesTableSql.split(";");
                
                // 首先执行创建表的语句（通常是第一条语句）
                String createTableStatement = sqlStatements[0].trim();
                if (!createTableStatement.isEmpty() && !createTableStatement.startsWith("--")) {
                    try {
                        log.info("创建用户活动记录表");
                        jdbcTemplate.execute(createTableStatement);
                        log.info("用户活动记录表创建成功");
                    } catch (Exception e) {
                        log.error("创建用户活动记录表失败", e);
                        // 如果表创建失败，直接返回，不尝试创建索引
                        return;
                    }
                }
            }
            
            log.info("数据库表初始化完成");
        } catch (Exception e) {
            log.error("初始化数据库表失败", e);
        }
    }
    
    /**
     * 读取资源文件内容
     */
    private String readResourceFile(String resourcePath) {
        try {
            ClassPathResource resource = new ClassPathResource(resourcePath);
            if (!resource.exists()) {
                log.warn("资源文件不存在: {}", resourcePath);
                return null;
            }
            
            try (Reader reader = new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8)) {
                return FileCopyUtils.copyToString(reader);
            }
        } catch (IOException e) {
            log.error("读取资源文件失败: {}", resourcePath, e);
            return null;
        }
    }
}