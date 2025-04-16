package com.mtmn.smartdoc.controller;

import com.mtmn.smartdoc.common.ApiResponse;
import com.mtmn.smartdoc.dto.KeywordsResult;
import com.mtmn.smartdoc.dto.PolishResult;
import com.mtmn.smartdoc.dto.SecurityResult;
import com.mtmn.smartdoc.dto.SummaryResult;
import com.mtmn.smartdoc.service.AnalysisService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/analysis")
public class AnalysisController {

    @Autowired
    private AnalysisService analysisService;

    /**
     * 生成文档摘要
     *
     * @param requestBody 包含文档内容或文档ID的请求体
     * @return 摘要结果
     */
    @PostMapping("/summary")
    public ApiResponse<SummaryResult> generateSummary(@RequestBody Map<String, Object> requestBody) {
        if (requestBody.containsKey("documentId")) {
            // 基于已上传文档生成摘要
            Long documentId = Long.valueOf(requestBody.get("documentId").toString());
            SummaryResult summary = analysisService.generateSummaryFromDocument(documentId);
            return ApiResponse.success(summary);
        } else {
            // 基于提供的文本内容生成摘要
            String content = (String) requestBody.get("content");
            SummaryResult summary = analysisService.generateSummary(content);
            return ApiResponse.success(summary);
        }
    }

    /**
     * 提取文档关键词
     *
     * @param requestBody 包含文档内容或文档ID的请求体
     * @return 关键词结果
     */
    @PostMapping("/keywords")
    public ApiResponse<KeywordsResult> extractKeywords(@RequestBody Map<String, Object> requestBody) {
        if (requestBody.containsKey("documentId")) {
            // 基于已上传文档提取关键词
            Long documentId = Long.valueOf(requestBody.get("documentId").toString());
            KeywordsResult keywords = analysisService.extractKeywordsFromDocument(documentId);
            return ApiResponse.success(keywords);
        } else {
            // 基于提供的文本内容提取关键词
            String content = (String) requestBody.get("content");
            KeywordsResult keywords = analysisService.extractKeywords(content);
            return ApiResponse.success(keywords);
        }
    }

    /**
     * 文档润色
     *
     * @param requestBody 包含文档内容或文档ID，以及润色类型的请求体
     * @return 润色结果
     */
    @PostMapping("/polish")
    public ApiResponse<PolishResult> polishDocument(@RequestBody Map<String, Object> requestBody) {
        String polishType = (String) requestBody.getOrDefault("polishType", "formal");
        
        if (requestBody.containsKey("documentId")) {
            // 基于已上传文档进行润色
            Long documentId = Long.valueOf(requestBody.get("documentId").toString());
            PolishResult polished = analysisService.polishDocumentFromDocument(documentId, polishType);
            return ApiResponse.success(polished);
        } else {
            // 基于提供的文本内容进行润色
            String content = (String) requestBody.get("content");
            PolishResult polished = analysisService.polishDocument(content, polishType);
            return ApiResponse.success(polished);
        }
    }

    /**
     * 敏感信息检测
     *
     * @param requestBody 包含文档内容或文档ID的请求体
     * @return 敏感信息检测结果
     */
    @PostMapping("/security")
    public ApiResponse<SecurityResult> detectSensitiveInfo(@RequestBody Map<String, Object> requestBody) {
        if (requestBody.containsKey("documentId")) {
            // 基于已上传文档检测敏感信息
            Long documentId = Long.valueOf(requestBody.get("documentId").toString());
            SecurityResult security = analysisService.detectSensitiveInfoFromDocument(documentId);
            return ApiResponse.success(security);
        } else {
            // 基于提供的文本内容检测敏感信息
            String content = (String) requestBody.get("content");
            SecurityResult security = analysisService.detectSensitiveInfo(content);
            return ApiResponse.success(security);
        }
    }
}