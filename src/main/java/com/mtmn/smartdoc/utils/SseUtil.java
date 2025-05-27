package com.mtmn.smartdoc.utils;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mtmn.smartdoc.service.LLMService;
import dev.langchain4j.model.chat.response.ChatResponse;
import dev.langchain4j.model.chat.response.StreamingChatResponseHandler;
import dev.langchain4j.model.openai.OpenAiStreamingChatModel;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.util.*;

/**
 * @author charmingdaidai
 * @version 1.0
 * @description SSE 工具类
 * @date 2025/5/27 09:19
 */
@Log4j2
@Component
public class SseUtil {
    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private LLMService llmService;

    /**
     * 构建SSE消息响应格式
     *
     * @param content 消息内容
     * @return 格式化的SSE消息 Json字符串
     */
    public String buildJsonSseMessage(String content, List<String> docs) {
        try {
            Map<String, Object> message = new HashMap<>();
            message.put("id", "chat" + UUID.randomUUID());
            message.put("object", "chat.completion.chunk");

            List<Map<String, Object>> choices = new ArrayList<>();
            Map<String, Object> choice = new HashMap<>();
            Map<String, String> delta = new HashMap<>();

            if (null != docs) {
                message.put("docs", docs);
                return objectMapper.writeValueAsString(message);
            }

            delta.put("content", content);
            choice.put("delta", delta);
            choice.put("role", "assistant");
            choices.add(choice);
            message.put("choices", choices);

            return objectMapper.writeValueAsString(message);
        } catch (Exception e) {
            log.error("构建SSE消息失败", e);
            return "data: {\"error\":\"构建消息失败\"}\n\n";
        }
    }

    /**
     * 创建包含消息的SSE流
     *
     * @param message 信息内容
     * @return 格式化的消息流
     */
    public Flux<String> sendFluxMessage(String message) {
        Sinks.Many<String> sink = Sinks.many().unicast().onBackpressureBuffer();
        sink.tryEmitNext(buildJsonSseMessage(message, null));
        sink.tryEmitNext("data: [DONE]\n\n");
        sink.tryEmitComplete();
        return sink.asFlux();
    }

    /**
     * 处理流式聊天响应
     *
     * @param prompt      提示词
     * @param docContents 检索到的文档内容列表（可以为null）
     * @return 格式化的SSE消息流
     */
    public Flux<String> handleStreamingChatResponse(String prompt, List<String> docContents) {
        // 创建流式聊天模型
        OpenAiStreamingChatModel streamingChatModel = llmService.createStreamingChatModel(null);

        // 创建响应处理的Sink
        Sinks.Many<String> sink = Sinks.many().unicast().onBackpressureBuffer();

        // 如果有文档内容，先发送检索到的文档信息
        if (docContents != null && !docContents.isEmpty()) {
            sink.tryEmitNext(buildJsonSseMessage("", docContents));
        }

        // 处理流式响应
        streamingChatModel.chat(prompt, new StreamingChatResponseHandler() {
            @Override
            public void onPartialResponse(String partialResponse) {
                String escapedContent = partialResponse.replace("\"", "\\\"").replace("\n", "\\n");
                sink.tryEmitNext(buildJsonSseMessage(escapedContent, null));
            }

            @Override
            public void onCompleteResponse(ChatResponse completeResponse) {
                sink.tryEmitNext("data: [DONE]\n\n");
                sink.tryEmitComplete();
            }

            @Override
            public void onError(Throwable error) {
                log.error("聊天响应处理出错", error);
                sink.tryEmitError(error);
            }
        });

        return sink.asFlux();
    }
}