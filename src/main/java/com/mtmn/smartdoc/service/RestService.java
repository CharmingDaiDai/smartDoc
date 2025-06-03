package com.mtmn.smartdoc.service;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

/**
 * @author charmingdaidai
 * @version 1.0
 * @description RestService
 * @date 2025/4/29 09:26
 */
@Service
public class RestService {
    
    /**
     * 创建RestTemplate Bean
     * 配置连接超时和读取超时为10秒
     * 
     * @param builder RestTemplate构建器
     * @return 配置好的RestTemplate实例
     */
    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        return builder.setConnectTimeout(Duration.ofSeconds(10))
                .setReadTimeout(Duration.ofSeconds(10))
                .build();
    }
}