package com.mtmn.smartdoc.controller;

import com.mtmn.smartdoc.common.ApiResponse;
import com.mtmn.smartdoc.dto.DocumentDto;
import com.mtmn.smartdoc.entity.Document;
import com.mtmn.smartdoc.entity.User;
import com.mtmn.smartdoc.service.DocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
@Tag(name = "文档管理", description = "文档上传、查询和删除等接口")
public class DocumentController {

    private final DocumentService documentService;

    @GetMapping
    @Operation(summary = "获取用户文档列表", description = "获取当前用户的所有文档")
    public ApiResponse<List<DocumentDto>> getUserDocuments(@AuthenticationPrincipal User user) {
        List<Document> documents = documentService.getUserDocuments(user);
        List<DocumentDto> documentDtos = documents.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
        return ApiResponse.success(documentDtos);
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "上传文档", description = "上传新文档并关联到当前用户")
    public ApiResponse<DocumentDto> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @AuthenticationPrincipal User user) {
        
        if (file.isEmpty()) {
            return ApiResponse.badRequest("上传文件不能为空");
        }
        
        try {
            Document document = documentService.uploadDocument(file, title, user);
            return ApiResponse.success("文档上传成功", convertToDto(document));
        } catch (Exception e) {
            log.error("Error uploading document: {}", e.getMessage(), e);
            return ApiResponse.error("文档上传失败: " + e.getMessage());
        }
    }

    @PostMapping(value = "/upload-batch", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "批量上传文档", description = "同时上传多个文档并关联到当前用户")
    public ApiResponse<List<DocumentDto>> uploadDocuments(
            @RequestParam("files") MultipartFile[] files,
            @RequestParam("titles") String[] titles,
            @AuthenticationPrincipal User user) {
        
        if (files.length == 0 || files.length != titles.length) {
            return ApiResponse.badRequest("文件数量不能为空，且文件数量必须与标题数量一致");
        }
        
        List<DocumentDto> uploadedDocs = new ArrayList<>();
        try {
            for (int i = 0; i < files.length; i++) {
                if (!files[i].isEmpty()) {
                    Document document = documentService.uploadDocument(files[i], titles[i], user);
                    uploadedDocs.add(convertToDto(document));
                }
            }
            return ApiResponse.success("文档批量上传成功", uploadedDocs);
        } catch (Exception e) {
            log.error("Error batch uploading documents: {}", e.getMessage(), e);
            return ApiResponse.error("文档批量上传失败: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除文档", description = "删除指定ID的文档，仅限文档所有者")
    public ApiResponse<Void> deleteDocument(
            @Parameter(description = "文档ID") @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        
        boolean deleted = documentService.deleteDocument(id, user);
        if (deleted) {
            return ApiResponse.success("文档删除成功", null);
        } else {
            return ApiResponse.notFound("文档不存在或您没有删除权限");
        }
    }

    @DeleteMapping("/batch")
    @Operation(summary = "批量删除文档", description = "批量删除多个文档，仅限文档所有者")
    public ApiResponse<Integer> deleteDocuments(
            @RequestBody List<Long> documentIds,
            @AuthenticationPrincipal User user) {
        
        int deletedCount = documentService.deleteDocuments(documentIds, user);
        return ApiResponse.success("已成功删除 " + deletedCount + " 个文档", deletedCount);
    }

    @GetMapping("/{id}")
    @Operation(summary = "获取文档详情", description = "获取指定ID的文档详情，仅限文档所有者")
    public ApiResponse<DocumentDto> getDocument(
            @Parameter(description = "文档ID") @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        
        Optional<Document> documentOpt = documentService.getDocumentById(id, user);
        if (documentOpt.isPresent()) {
            DocumentDto dto = convertToDto(documentOpt.get());
            
            // 获取文件访问URL
            String fileUrl = documentService.getDocumentUrl(id, user);
            dto.setFileUrl(fileUrl);
            
            return ApiResponse.success(dto);
        } else {
            return ApiResponse.notFound("文档不存在或您没有访问权限");
        }
    }

    /**
     * 将Document实体转换为DocumentDto
     */
    private DocumentDto convertToDto(Document document) {
        return DocumentDto.builder()
                .id(document.getId())
                .title(document.getTitle())
                .fileName(document.getFileName())
                .fileType(document.getFileType())
                .fileSize(document.getFileSize())
                .summary(document.getSummary())
                .keywords(document.getKeywords())
                .sensitiveInfo(document.getSensitiveInfo())
                .categories(document.getCategories())
                .createdAt(document.getCreatedAt())
                .updatedAt(document.getUpdatedAt())
                .build();
    }
}