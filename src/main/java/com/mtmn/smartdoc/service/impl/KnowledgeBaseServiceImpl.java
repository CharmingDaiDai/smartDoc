package com.mtmn.smartdoc.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mtmn.smartdoc.common.ApiResponse;
import com.mtmn.smartdoc.common.IntentResult;
import com.mtmn.smartdoc.config.ModelConfig;
import com.mtmn.smartdoc.config.RagStrategyFactory;
import com.mtmn.smartdoc.dto.CreateKbRequest;
import com.mtmn.smartdoc.dto.KnowledgeBaseDTO;
import com.mtmn.smartdoc.po.DocumentPO;
import com.mtmn.smartdoc.po.KnowledgeBase;
import com.mtmn.smartdoc.po.User;
import com.mtmn.smartdoc.repository.DocumentRepository;
import com.mtmn.smartdoc.repository.KnowledgeBaseRepository;
import com.mtmn.smartdoc.service.*;
import com.mtmn.smartdoc.utils.IntentClassifier;
import com.mtmn.smartdoc.utils.QueryRewrite;
import com.mtmn.smartdoc.utils.SseUtil;
import com.mtmn.smartdoc.vo.DocumentVO;
import io.milvus.v2.client.ConnectConfig;
import io.milvus.v2.client.MilvusClientV2;
import io.milvus.v2.service.collection.request.DropCollectionReq;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import reactor.core.publisher.Flux;

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


    @Value("${milvus.uri}")
    private String milvusUri;

    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final DocumentRepository documentRepository;
    private final ModelConfig modelConfig;
    private final ObjectMapper objectMapper;
    private final DocumentService documentService;
    //    private final MilvusService milvusService;
    private final MinioService minioService;
    private final SseUtil sseUtil;
    private final LLMService llmService;
    private final IntentClassifier intentClassifier;
    private final QueryRewrite queryRewrite;
    private final RagStrategyFactory ragStrategyFactory;
    private final HiSemRag hiSemRag;
    private final NaiveRag naiveRag;

    @Override
    public ApiResponse<List<KnowledgeBaseDTO>> listKnowledgeBase(User user) {
        log.info("获取用户知识库列表，用户：{}", user.getUsername());
        try {
            List<KnowledgeBase> knowledgeBases = knowledgeBaseRepository.findByUserOrderByCreatedAtDesc(user);
            // 转换为DTO返回，避免暴露敏感信息
            List<KnowledgeBaseDTO> knowledgeBaseDtos = KnowledgeBaseDTO.fromEntityList(knowledgeBases);
            return ApiResponse.success(knowledgeBaseDtos);
        } catch (Exception e) {
            log.error("获取知识库列表失败", e);
            return ApiResponse.error("获取知识库列表失败：" + e.getMessage());
        }
    }

    @Override
    @Transactional
    public ApiResponse<Boolean> createKnowledgeBase(CreateKbRequest createKbRequest, User user) {
        log.info("创建知识库，用户：{}，知识库名称：{}", user.getUsername(), createKbRequest.getName());

        // 参数校验
        if (!StringUtils.hasText(createKbRequest.getName())) {
            return ApiResponse.error("知识库名称不能为空");
        }

        // 查询用户是否有已经存在的同名称知识库
        List<KnowledgeBase> existingKbs = knowledgeBaseRepository.findByUserOrderByCreatedAtDesc(user);
        boolean nameExists = existingKbs.stream()
                .anyMatch(kb -> kb.getName().equals(createKbRequest.getName().trim()));

        if (nameExists) {
            return ApiResponse.error("已存在同名知识库，请更换名称后重试");
        }

        try {
            // 创建知识库实体
            KnowledgeBase knowledgeBase = KnowledgeBase.builder()
                    .name(createKbRequest.getName())
                    .description(createKbRequest.getDescription())
                    .embeddingModel(createKbRequest.getEmbeddingModel())
                    .rag(createKbRequest.getRagMethod())
                    .indexParam(createKbRequest.getIndexParam())
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
            documentRepository.findAll().stream()
                    .filter(doc -> Objects.equals(doc.getKnowledgeBaseId(), knowledgeBaseId))
                    .forEach(doc -> {
                        // 删除 Minio 中的文档
                        minioService.deleteFile(doc.getFilePath());

                        // 删除文档表中的记录
                        documentRepository.delete(doc);

                        log.info("文档从知识库中移除，文档ID：{}", doc.getId());
                    });

            // TODO 改为 RAGMethodService.deleteIndex()
            // 删除知识库的索引
            ConnectConfig connectConfig = ConnectConfig.builder()
                    .uri(milvusUri)
                    .build();

            MilvusClientV2 milvusClient = new MilvusClientV2(connectConfig);
            milvusClient.dropCollection(DropCollectionReq.builder().collectionName(getStoreKnowledgeBaseName(knowledgeBase.getName())).build());
            log.info("删除知识库索引，ID：{}", knowledgeBaseId);

            // 删除知识库表中的记录
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
                            new TypeReference<Map<String, Object>>() {
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
            List<DocumentPO> documents = documentRepository.findByKnowledgeBaseIdOrderByCreatedAtDesc(knowledgeBaseId);

            // 将 Document 实体转换为 DocumentVO
            List<DocumentVO> documentVos = documents.stream()
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

            log.info("成功获取知识库文档列表，知识库ID：{}，文档数量：{}", knowledgeBaseId, documentVos.size());
            return ApiResponse.success(documentVos);
        } catch (Exception e) {
            log.error("获取知识库文档列表失败", e);
            return ApiResponse.error("获取知识库文档列表失败：" + e.getMessage());
        }
    }

    /**
     * 批量向指定知识库添加文档
     *
     * @param id     知识库ID，字符串格式
     * @param user   当前登录用户
     * @param files  要上传的文件列表
     * @param titles 与 files 数组一一对应的文档标题列表
     * @return 每个布尔值表示对应文档的上传结果（true：成功，false：失败）
     */
    @Override
    public ApiResponse<List<Boolean>> addDocs(Long id, User user, MultipartFile[] files, String[] titles) {

        List<Boolean> uploaded = new ArrayList<>();
        try {
            for (int i = 0; i < files.length; i++) {
                if (!files[i].isEmpty()) {
                    DocumentPO document = documentService.uploadDocument(files[i], titles[i], user, id);

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

    /**
     * @param id
     * @return
     */
    @Override
    public ApiResponse<String> buildIndex(String id) {
        /*
        根据知识库 id 从知识库查询信息 embedding index
        根据知识库 id 从文档库中查询知识库的文档（没有被索引的）
        根据 embedding 模型和 rag 方法开始构建索引
        获取文档内容，文档切分，向量库构建
         */
        Optional<KnowledgeBase> knowledgeBaseOpt = knowledgeBaseRepository.findById(Long.valueOf(id));

        if (knowledgeBaseOpt.isEmpty()) {
            return ApiResponse.error("知识库不存在");
        }

        KnowledgeBase knowledgeBase = knowledgeBaseOpt.get();

        String kbName = knowledgeBase.getName();

        String ragMethodName = knowledgeBase.getRag();

        String embeddingModelName = knowledgeBase.getEmbeddingModel();

        String indexParam = knowledgeBase.getIndexParam();

        Map<String, Object> params = new HashMap<>();
        if (StringUtils.hasText(indexParam)) {
            try {
                params.putAll(objectMapper.readValue(indexParam, new TypeReference<Map<String, Object>>() {
                }));
            } catch (Exception e) {
                log.error("解析索引参数JSON失败", e);
            }
        }

        try {
            // 使用 ragStrategyFactory 创建 RAG 策略对象
            BaseRag rag = ragStrategyFactory.getStrategy(ragMethodName);

            // 查询未被索引的文档
            List<DocumentPO> documentPoList = documentRepository.findByKnowledgeBaseIdOrderByCreatedAtDesc(Long.valueOf(id))
                    .stream()
                    .filter(doc -> !Boolean.TRUE.equals(doc.getIndexed()))
                    .toList();

            if (documentPoList.isEmpty()) {
                return ApiResponse.success("没有未被索引的文档");
            }

            //Integer chunkSize, Boolean generateAbstract, String embeddingModelName
            params.put("embeddingModelName", embeddingModelName);

            List<Boolean> success = rag.buildIndex(kbName, documentPoList, params);

            for (int i = 0; i < success.size(); i++) {
                // TODO 没成功的现在没有提示
                if (success.get(i)) {
                    // 更新文档的索引状态
                    DocumentPO documentPo = documentPoList.get(i);
                    documentPo.setIndexed(true);
                    documentRepository.save(documentPo);
                }
            }

            return ApiResponse.success("索引构建成功：");
        } catch (Exception e) {
            log.error("索引构建失败", e);
            return ApiResponse.error("索引构建失败：" + e.getMessage());
        }
    }

    /**
     * 获取当前登录用户的ID
     *
     * @return 当前登录用户ID
     */
    public static Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof User) {
                return ((User) principal).getId();
            } else if (principal instanceof UserDetails) {
                // 如果是自定义的UserDetails实现，可能需要强制转换为您的User类
                String username = ((UserDetails) principal).getUsername();
                // 这里可以根据username查询用户ID，或者扩展UserDetails接口添加getId方法
                log.warn("无法直接获取用户ID，仅获取到用户名: {}", username);
                return null;
            }
        }
        log.warn("未能获取到当前登录用户");
        return null;
    }

    public static String getStoreKnowledgeBaseName(String kbName) {
        return "kb_" + getCurrentUserId() + "_" + kbName;
    }

    /**
     * @param id
     * @param question
     * @param topk
     * @param qr
     * @param qd
     * @return
     */
    @Override
    public Flux<String> naiveQa(Long id, String question, int topk, boolean ir, boolean qr, boolean qd) {
        Optional<KnowledgeBase> knowledgeBaseOpt = knowledgeBaseRepository.findById(id);

        if (knowledgeBaseOpt.isEmpty()) {
            log.error("知识库: {}, 不存在，请确认知识库ID是否正确。", id);
            // 发送错误信息
            return sseUtil.sendFluxMessage("知识库不存在，请确认知识库ID是否正确。");
        }

        KnowledgeBase knowledgeBase = knowledgeBaseOpt.get();

        // 意图识别
        if (ir && needRetrieve(question, null)) {
            return sseUtil.handleStreamingChatResponse(question, null);
        }

        // 查询重写
        if (qr) {
            question = queryRewrite.rewriteQuery("", question).getFinalQuery();
        }

        HashMap<String, Object> params = new HashMap<>();
        params.put("topk", topk);

        //  TODO 问题分解，然后把问题列表传入
        return naiveRag.chat(knowledgeBase, question, params);
    }

    @Override
    public Flux<String> hisemQa(Long id, String question, int maxRes, boolean ir, boolean qr, boolean qd) {
        Optional<KnowledgeBase> knowledgeBaseOpt = knowledgeBaseRepository.findById(id);

        if (knowledgeBaseOpt.isEmpty()) {
            log.error("知识库: {}, 不存在，请确认知识库ID是否正确。", id);
            // 发送错误信息
            return sseUtil.sendFluxMessage("知识库不存在，请确认知识库ID是否正确。");
        }

        KnowledgeBase knowledgeBase = knowledgeBaseOpt.get();

        // 意图识别
        if (ir && !needRetrieve(question, null)) {
            return sseUtil.handleStreamingChatResponse(question, null);
        }

        // 查询重写
        if (qr) {
            question = queryRewrite.rewriteQuery("", question).getFinalQuery();
        }

        HashMap<String, Object> params = new HashMap<>();
        params.put("maxRes", maxRes);

        //  TODO 问题分解，然后把问题列表传入
        return hiSemRag.chat(knowledgeBase, question, params);
    }

    private boolean needRetrieve(String question, String history) {
        IntentResult intentResult = intentClassifier.analyzeIntent(question, history);

        if (intentResult.isParseSuccess()) {
            String reason = intentResult.getReason();
            String questionType = intentResult.getQuestionType();
            if (intentResult.isNeedRetrieval()) {
                log.info("问题: {} 需要检索, 原因: {}", question, reason);
                return true;
            }
            log.info("问题: {} 无需检索, 原因: {}, 类型: {}", question, reason, questionType);
        }

        return false;
    }
}