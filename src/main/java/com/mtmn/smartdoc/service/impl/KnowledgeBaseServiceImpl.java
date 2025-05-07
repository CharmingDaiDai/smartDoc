package com.mtmn.smartdoc.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mtmn.smartdoc.common.ApiResponse;
import com.mtmn.smartdoc.config.ModelConfig;
import com.mtmn.smartdoc.config.RagConfig;
import com.mtmn.smartdoc.dto.CreateKBRequest;
import com.mtmn.smartdoc.dto.KnowledgeBaseDTO;
import com.mtmn.smartdoc.po.Document;
import com.mtmn.smartdoc.po.KnowledgeBase;
import com.mtmn.smartdoc.po.User;
import com.mtmn.smartdoc.repository.DocumentRepository;
import com.mtmn.smartdoc.repository.KnowledgeBaseRepository;
import com.mtmn.smartdoc.service.DocumentService;
import com.mtmn.smartdoc.service.KnowledgeBaseService;
import com.mtmn.smartdoc.vo.DocumentVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;
import java.util.stream.Collectors;

/**
 * @author charmingdaidai
 * @version 1.0
 * @description 知识库接口实现类
 * @date 2025/5/4 14:49
 */
@Service
@Log4j2
@RequiredArgsConstructor
public class KnowledgeBaseServiceImpl implements KnowledgeBaseService {

    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final DocumentRepository documentRepository;
    private final RagConfig ragConfig;
    private final ModelConfig modelConfig;
    private final ObjectMapper objectMapper;
    private final DocumentService documentService;

    @Override
    public ApiResponse<List<KnowledgeBaseDTO>> listKnowledgeBase(User user) {
        log.info("获取用户知识库列表，用户：{}", user.getUsername());
        try {
            List<KnowledgeBase> knowledgeBases = knowledgeBaseRepository.findByUserOrderByCreatedAtDesc(user);
            // 转换为DTO返回，避免暴露敏感信息
            List<KnowledgeBaseDTO> knowledgeBaseDTOs = KnowledgeBaseDTO.fromEntityList(knowledgeBases);
            return ApiResponse.success(knowledgeBaseDTOs);
        } catch (Exception e) {
            log.error("获取知识库列表失败", e);
            return ApiResponse.error("获取知识库列表失败：" + e.getMessage());
        }
    }

    @Override
    @Transactional
    public ApiResponse<Boolean> createKnowledgeBase(CreateKBRequest createKBRequest, User user) {
        log.info("创建知识库，用户：{}，知识库名称：{}", user.getUsername(), createKBRequest.getName());

        // 参数校验
        if (createKBRequest == null || !StringUtils.hasText(createKBRequest.getName())) {
            return ApiResponse.error("知识库名称不能为空");
        }

        try {
            // 创建知识库实体
            KnowledgeBase knowledgeBase = KnowledgeBase.builder()
                    .name(createKBRequest.getName())
                    .description(createKBRequest.getDescription())
                    .embeddingModel(createKBRequest.getEmbeddingModel())
                    .rag(createKBRequest.getRagMethod())
                    .indexParam(createKBRequest.getIndexParam())
                    .user(user)
                    .build();

            // 保存到数据库
            knowledgeBase = knowledgeBaseRepository.save(knowledgeBase);

            log.info("知识库创建成功，ID：{}", knowledgeBase.getId());
            return ApiResponse.success("知识库创建成功", true);
        } catch (Exception e) {
            log.error("创建知识库异常", e);
            return ApiResponse.error("创建知识库失败：" + e.getMessage());
        }
    }

    @Override
    @Transactional
    public ApiResponse<Boolean> deleteKnowledgeBase(Long knowledgeBaseId, User user) {
        // TODO 知识库的索引也要删除
        log.info("删除知识库，ID：{}，用户：{}", knowledgeBaseId, user.getUsername());

        // 参数校验
        if (knowledgeBaseId == null) {
            return ApiResponse.error("知识库ID不能为空");
        }

        try {
            // 检查知识库是否存在
            Optional<KnowledgeBase> knowledgeBaseOpt = knowledgeBaseRepository.findById(knowledgeBaseId);
            if (knowledgeBaseOpt.isEmpty()) {
                return ApiResponse.error("知识库不存在");
            }

            KnowledgeBase knowledgeBase = knowledgeBaseOpt.get();

            // 检查权限（知识库所有者）
            if (!Objects.equals(knowledgeBase.getUser().getId(), user.getId())) {
                return ApiResponse.error("您没有权限删除此知识库");
            }

            // 删除知识库中的所有文档
            // 注意：此处仅更新文档的knowledgeBaseId为null，不删除文档本身
            documentRepository.findAll().stream()
                    .filter(doc -> Objects.equals(doc.getKnowledgeBaseId(), knowledgeBaseId))
                    .forEach(doc -> {
                        doc.setKnowledgeBaseId(null);
                        documentRepository.save(doc);
                        log.info("文档从知识库中移除，文档ID：{}", doc.getId());
                    });

            // 删除知识库
            knowledgeBaseRepository.delete(knowledgeBase);

            log.info("知识库删除成功，ID：{}", knowledgeBaseId);
            return ApiResponse.success("知识库删除成功", true);
        } catch (Exception e) {
            log.error("删除知识库异常", e);
            return ApiResponse.error("删除知识库失败：" + e.getMessage());
        }
    }

    @Override
    public ApiResponse<List<Map<String, String>>> listEmbeddingModels() {
        log.info("获取嵌入模型列表");

        List<Map<String, String>> embeddingModels = modelConfig.getEmbedding().values()
                .stream()
                .map(mp -> {
                    Map<String, String> modelMap = new HashMap<>();
                    modelMap.put("label", mp.getModelName());
                    modelMap.put("description", mp.getDescription());
                    modelMap.put("value", mp.getModelName()); // 使用模型名称作为值
                    return modelMap;
                })
                .toList();

        return ApiResponse.success(embeddingModels);
    }

    @Override
    public ApiResponse<KnowledgeBaseDTO> getKnowledgeBase(Long id, User user) {
        log.info("获取知识库详情，ID：{}，用户：{}", id, user.getUsername());

        // 参数校验
        if (id == null) {
            return ApiResponse.error("知识库ID不能为空");
        }

        try {
            // 检查知识库是否存在
            Optional<KnowledgeBase> knowledgeBaseOpt = knowledgeBaseRepository.findById(id);
            if (knowledgeBaseOpt.isEmpty()) {
                return ApiResponse.error("知识库不存在");
            }

            KnowledgeBase knowledgeBase = knowledgeBaseOpt.get();

            // 检查权限（知识库所有者）
            if (!Objects.equals(knowledgeBase.getUser().getId(), user.getId())) {
                return ApiResponse.error("您没有权限访问此知识库");
            }

            // 转换为DTO
            KnowledgeBaseDTO dto = KnowledgeBaseDTO.fromEntity(knowledgeBase);

            // 如果有索引参数，将JSON字符串转换为Map
            if (StringUtils.hasText(knowledgeBase.getIndexParam())) {
                try {
                    // 使用TypeReference处理泛型类型转换
                    Map<String, Object> ragParams = objectMapper.readValue(
                            knowledgeBase.getIndexParam(),
                            new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {
                            }
                    );
                    dto.setRagParams(ragParams);
                } catch (Exception e) {
                    log.error("解析索引参数JSON失败", e);
                    // 解析失败时不设置ragParams，但不影响其他数据返回
                }
            }

            return ApiResponse.success(dto);
        } catch (Exception e) {
            log.error("获取知识库详情失败", e);
            return ApiResponse.error("获取知识库详情失败：" + e.getMessage());
        }
    }

    @Override
    public ApiResponse<List<DocumentVO>> listKnowledgeBaseDocs(Long knowledgeBaseId, User user) {
        log.info("获取知识库文档列表，知识库ID：{}，用户：{}", knowledgeBaseId, user.getUsername());

        // 参数校验
        if (knowledgeBaseId == null) {
            return ApiResponse.error("知识库ID不能为空");
        }

        try {
            // 检查知识库是否存在
            Optional<KnowledgeBase> knowledgeBaseOpt = knowledgeBaseRepository.findById(knowledgeBaseId);
            if (knowledgeBaseOpt.isEmpty()) {
                return ApiResponse.error("知识库不存在");
            }

            KnowledgeBase knowledgeBase = knowledgeBaseOpt.get();

            // 检查权限（知识库所有者）
            if (!Objects.equals(knowledgeBase.getUser().getId(), user.getId())) {
                return ApiResponse.error("您没有权限访问此知识库的文档");
            }

            // 获取知识库的文档列表
            List<Document> documents = documentRepository.findByKnowledgeBaseIdOrderByCreatedAtDesc(knowledgeBaseId);

            // 将 Document 实体转换为 DocumentVO
            List<DocumentVO> documentVOs = documents.stream()
                    .map(doc -> DocumentVO.builder()
                            .id(doc.getId())
                            .title(doc.getTitle())
                            .fileName(doc.getFileName())
                            .indexed(doc.getIndexed())
                            .fileType(doc.getFileType())
                            .fileSize(doc.getFileSize())
                            .fileUrl(doc.getFilePath())
                            .createdAt(doc.getCreatedAt())
                            .updatedAt(doc.getUpdatedAt())
                            .build())
                    .collect(Collectors.toList());

            log.info("成功获取知识库文档列表，知识库ID：{}，文档数量：{}", knowledgeBaseId, documentVOs.size());
            return ApiResponse.success(documentVOs);
        } catch (Exception e) {
            log.error("获取知识库文档列表失败", e);
            return ApiResponse.error("获取知识库文档列表失败：" + e.getMessage());
        }
    }

    /**
     * @param id
     * @param user
     * @param files
     * @param titles
     * @return
     */
    @Override
    public ApiResponse<List<Boolean>> addDocs(String id, User user, MultipartFile[] files, String[] titles) {

        List<Boolean> uploaded = new ArrayList<>();
        try {
            for (int i = 0; i < files.length; i++) {
                if (!files[i].isEmpty()) {
                    Document document = documentService.uploadDocument(files[i], titles[i], user, Long.valueOf(id));

                    if (null != document) {
                        uploaded.add(true);

                        log.info("用户 {} 上传了文档 {}", user.getUsername(), titles[i]);
                    } else {
                        uploaded.add(false);

                        log.info("用户 {} 上传文档 {} 失败", user.getUsername(), titles[i]);
                    }

                }
            }
            return ApiResponse.success("文档批量上传成功", uploaded);
        } catch (Exception e) {
            log.error("Error batch uploading documents: {}", e.getMessage(), e);
            return ApiResponse.error("文档批量上传失败: " + e.getMessage());
        }

    }

}