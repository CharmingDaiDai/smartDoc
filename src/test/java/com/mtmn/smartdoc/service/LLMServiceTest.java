package com.mtmn.smartdoc.service;

import dev.langchain4j.model.chat.ChatModel;
import jakarta.annotation.Resource;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * LLMService单元测试类
 */
@SpringBootTest
public class LLMServiceTest {
    @Resource
    LLMService llmService;

    /**
     * 测试创建聊天语言模型方法
     * 验证是否正确调用ModelConfig获取配置并创建模型
     */
    @Test
    public void testCreateChatModel() {
        // 安排
        ChatModel chatModel = llmService.createChatModel();

        assertNotNull(chatModel);
    }

    /**
     * 测试生成摘要方法
     */
    @Test
    public void testGenerateSummary() {
        // 安排
        String text = "这是一段需要生成摘要的测试文本";
        ChatModel chatModel = llmService.createChatModel();
        
        String summary = llmService.generateSummary(text);
        
        System.out.println("summary = " + summary);
    }

    /**
     * 测试回答问题方法
     */
    @Test
    public void testAnswerQuestion() {
        // 安排
        String question = "测试问题";
        String context = "测试上下文";
        ChatModel chatModel = llmService.createChatModel();
        
        String answer = llmService.answerQuestion(question, context);
        
        System.out.println("answer = " + answer);
    }
}