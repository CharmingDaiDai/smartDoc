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

            // 如果传入的 docs 非空（意味着先把检索到的文档列表一起推给前端）
            if (docs != null) {
                message.put("docs", docs);
                return objectMapper.writeValueAsString(message);
            }

            // 否则，正常构造一个“delta”片段，表示模型最新输出的一段 content
            List<Map<String, Object>> choices = new ArrayList<>();
            Map<String, Object> choice = new HashMap<>();
            Map<String, String> delta = new HashMap<>();

            delta.put("content", content);
            choice.put("delta", delta);
            choice.put("role", "assistant");
            choices.add(choice);
            message.put("choices", choices);

            return objectMapper.writeValueAsString(message);
        } catch (Exception e) {
            log.error("构建SSE消息失败", e);
            // 如果 JSON 构建失败，返回一个简单的错误片段，前端可以收到 {"error":"构建消息失败"}
            return "data: {\"error\":\"构建消息失败\"}\n\n";
        }
    }

    /**
     * 创建包含消息的SSE流
     *
     * @param message 信息内容
     * @return 格式化的消息流
     */
    // FixMe 不能正确流式输出
    public Flux<String> sendFluxMessage(String message) {
        Sinks.Many<String> sink = Sinks.many().unicast().onBackpressureBuffer();
        // 先把传入的 message 通过 buildJsonSseMessage 转成 JSON
        sink.tryEmitNext(buildJsonSseMessage(message, null));
        // 然后立即告诉 Sink：数据推送完毕，可以完成（complete）了
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
        // 1. 创建流式聊天模型
        OpenAiStreamingChatModel streamingChatModel = llmService.createStreamingChatModel(null);

        // 2. 创建一个只允许单订阅者、带缓冲的 Sink
        Sinks.Many<String> sink = Sinks.many().unicast().onBackpressureBuffer();

        // 3. 如果前面检索到的文档非空，先把 docs 按照 SSE 消息格式推给前端
        if (docContents != null && !docContents.isEmpty()) {
            sink.tryEmitNext(buildJsonSseMessage("", docContents));
        }

        // 4. 调用流式聊天模型接口，传入 prompt 和 自定义回调 Handler
        streamingChatModel.chat(prompt, new StreamingChatResponseHandler() {
            @Override
            public void onPartialResponse(String partialResponse) {
                // 模型每生成一小段文本，就会触发一次 onPartialResponse 回调
                // 先把里边的双引号、换行做转义，然后构造 JSON 片段
                String escapedContent = partialResponse.replace("\"", "\\\"").replace("\n", "\\n");
                sink.tryEmitNext(buildJsonSseMessage(escapedContent, null));
            }

            @Override
            public void onCompleteResponse(ChatResponse completeResponse) {
                // 当模型整次对话生成完毕后，触发 onCompleteResponse
                sink.tryEmitComplete(); // 标记当前 Sink 的 Flux 流结束
            }

            @Override
            public void onError(Throwable error) {
                log.error("聊天响应处理出错", error);
                sink.tryEmitError(error); // 把异常推给下游，Flux 会触发 onError
            }
        });

        // 5. 返回这个 Sink 对应的 Flux，供外层（Controller）订阅
        return sink.asFlux();
    }
}