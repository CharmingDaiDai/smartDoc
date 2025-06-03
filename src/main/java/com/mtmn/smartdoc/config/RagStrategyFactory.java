package com.mtmn.smartdoc.config;

import com.mtmn.smartdoc.service.BaseRag;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * @author charmingdaidai
 */
@Service
public class RagStrategyFactory {

    private final Map<String, BaseRag> strategies;

    public RagStrategyFactory(List<BaseRag> strategyList) {
        this.strategies = strategyList.stream()
                .collect(Collectors.toMap(
                        BaseRag::getMethodName,
                        Function.identity()
                ));
    }

    public BaseRag getStrategy(String ragMethod) {
        BaseRag rag = strategies.get(ragMethod);
        if (rag == null) {
            throw new UnsupportedOperationException("不支持的RAG方法: " + ragMethod);
        }
        return rag;
    }

    public List<String> getSupportedMethods() {
        return new ArrayList<>(strategies.keySet());
    }
}