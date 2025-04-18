package com.mtmn.smartdoc.service;

import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.store.embedding.EmbeddingStore;
import jakarta.annotation.Resource;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * EmbeddingService单元测试类
 */
@SpringBootTest
public class EmbeddingServiceTest {
    @Resource
    EmbeddingService embeddingService;

    /**
     * 测试文本嵌入方法
     * 验证是否正确调用嵌入模型生成嵌入向量
     */
    @Test
    public void testEmbedText() {
        // 安排
        String text = "测试文本";
        EmbeddingModel embeddingModel = embeddingService.createEmbeddingModel();

        Embedding embedding = embeddingModel.embed(text).content();

        System.out.println("embedding.dimension() = " + embedding.dimension());
    }


    /**
     * 测试创建文档向量方法
     */
    @Test
    public void testCreateDocumentVectors() {
        // 安排
        String content = "测试文档内容\n第二段落";

        EmbeddingStore<Embedding> result = embeddingService.createDocumentVectors(content);

        assertNotNull(result);
    }
}