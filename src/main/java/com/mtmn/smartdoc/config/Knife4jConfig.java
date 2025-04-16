package com.mtmn.smartdoc.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springdoc.core.models.GroupedOpenApi;

import java.util.ArrayList;
import java.util.List;

/**
 * Knife4j 接口文档配置
 *
 * @author CharmingDaiDai
 * @since 2025-04-15
 */
@Configuration
public class Knife4jConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        // 创建联系人信息
        Contact contact = new Contact()
                .name("CharmingDaiDai")
                .email("admin@mtmn.com")
                .url("https://www.mtmn.com");

        // 创建API基本信息
        Info info = new Info()
                .title("智能文档分析系统API")
                .description("基于LangChain4j的智能文档分析系统接口文档")
                .version("1.0.0")
                .contact(contact)
                .license(new License().name("MIT").url("https://opensource.org/licenses/MIT"));

        // 配置服务器地址
        List<Server> servers = new ArrayList<>();
        servers.add(new Server().url("/").description("本地环境"));

        return new OpenAPI()
                .info(info)
                .servers(servers);
    }

    /**
     * 用户管理接口分组
     */
    @Bean
    public GroupedOpenApi userApi() {
        return GroupedOpenApi.builder()
                .group("用户管理")
                .pathsToMatch("/api/users/**", "/api/auth/**")
                .packagesToScan("com.mtmn.smartdoc.controller")
                .build();
    }

    /**
     * 文档管理接口分组
     */
    @Bean
    public GroupedOpenApi documentApi() {
        return GroupedOpenApi.builder()
                .group("文档管理")
                .pathsToMatch("/api/documents/**")
                .packagesToScan("com.mtmn.smartdoc.controller")
                .build();
    }

    /**
     * 分析功能接口分组
     */
    @Bean
    public GroupedOpenApi analysisApi() {
        return GroupedOpenApi.builder()
                .group("分析功能")
                .pathsToMatch("/api/summary/**", "/api/keywords/**", "/api/similarity/**",
                        "/api/duplicate/**", "/api/polish/**", "/api/security/**",
                        "/api/classification/**", "/api/tags/**")
                .packagesToScan("com.mtmn.smartdoc.controller")
                .build();
    }
}