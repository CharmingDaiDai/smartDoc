package com.mtmn.smartdoc.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * @author charmingdaidai
 * @version 1.0
 * @description RAG方法数据传输对象
 * @date 2025/5/6 10:20
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RagMethodDTO {
    private String id;
    private String name;
    private String description;
    private Map<String, Object> indexParams;
    private Map<String, Object> searchParams;
}