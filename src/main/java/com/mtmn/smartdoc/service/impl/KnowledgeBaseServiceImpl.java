package com.mtmn.smartdoc.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mtmn.smartdoc.common.ApacheTikaDocumentParser;
import com.mtmn.smartdoc.common.ApiResponse;
import com.mtmn.smartdoc.config.*;
import com.mtmn.smartdoc.dto.CreateKBRequest;
import com.mtmn.smartdoc.dto.KnowledgeBaseDTO;
import com.mtmn.smartdoc.po.DocumentPO;
import com.mtmn.smartdoc.po.KnowledgeBase;
import com.mtmn.smartdoc.po.User;
import com.mtmn.smartdoc.repository.DocumentRepository;
import com.mtmn.smartdoc.repository.KnowledgeBaseRepository;
import com.mtmn.smartdoc.service.*;
import com.mtmn.smartdoc.vo.DocumentVO;
import dev.langchain4j.data.document.Document;
import dev.langchain4j.data.document.DocumentSplitter;
import dev.langchain4j.data.document.splitter.DocumentSplitters;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.chat.response.ChatResponse;
import dev.langchain4j.model.chat.response.StreamingChatResponseHandler;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.openai.OpenAiStreamingChatModel;
import dev.langchain4j.rag.content.Content;
import dev.langchain4j.rag.content.retriever.ContentRetriever;
import dev.langchain4j.rag.content.retriever.EmbeddingStoreContentRetriever;
import dev.langchain4j.rag.query.Query;
import dev.langchain4j.store.embedding.milvus.MilvusEmbeddingStore;
import io.milvus.common.clientenum.ConsistencyLevelEnum;
import io.milvus.param.IndexType;
import io.milvus.param.MetricType;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.io.InputStream;
import java.util.*;
import java.util.stream.Collectors;
import java.util.UUID;
import java.util.stream.IntStream;

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
    private final ModelConfig modelConfig;
    private final ObjectMapper objectMapper;
    private final DocumentService documentService;
    private final EmbeddingService embeddingService;
    //    private final MilvusService milvusService;
    private final MinioService minioService;

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

        // 查询用户是否有已经存在的同名称知识库
        List<KnowledgeBase> existingKbs = knowledgeBaseRepository.findByUserOrderByCreatedAtDesc(user);
        boolean nameExists = existingKbs.stream()
                .anyMatch(kb -> kb.getName().equals(createKBRequest.getName().trim()));

        if (nameExists) {
            return ApiResponse.error("已存在同名知识库，请更换名称后重试");
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
            // TODO 删除 Minio 中的文档
            documentRepository.findAll().stream()
                    .filter(doc -> Objects.equals(doc.getKnowledgeBaseId(), knowledgeBaseId))
                    .forEach(doc -> {
                        doc.setKnowledgeBaseId(null);
                        documentRepository.save(doc);
                        log.info("文档从知识库中移除，文档ID：{}", doc.getId());
                    });

            // 删除知识库
            knowledgeBaseRepository.delete(knowledgeBase);

            // TODO 知识库的索引也要删除

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
     * 批量向指定知识库添加文档
     *
     * @param id     知识库ID，字符串格式
     * @param user   当前登录用户
     * @param files  要上传的文件列表
     * @param titles 与 files 数组一一对应的文档标题列表
     * @return 每个布尔值表示对应文档的上传结果（true：成功，false：失败）
     */
    @Override
    public ApiResponse<List<Boolean>> addDocs(String id, User user, MultipartFile[] files, String[] titles) {

        List<Boolean> uploaded = new ArrayList<>();
        try {
            for (int i = 0; i < files.length; i++) {
                if (!files[i].isEmpty()) {
                    DocumentPO document = documentService.uploadDocument(files[i], titles[i], user, Long.valueOf(id));

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

        try {
            // 使用 RagConfigFactory 创建 RAG 配置对象
            BaseRagConfig ragConfig = RagConfigFactory.createRagConfig(ragMethodName, embeddingModelName, indexParam);

            // 查询未被索引的文档
            List<DocumentPO> documentPOList = documentRepository.findByKnowledgeBaseIdOrderByCreatedAtDesc(Long.valueOf(id))
                    .stream()
                    .filter(doc -> !Boolean.TRUE.equals(doc.getIndexed()))
                    .toList();

            if (documentPOList.isEmpty()) {
                return ApiResponse.success("没有未被索引的文档");
            }

            List<Document> documents = new ArrayList<>();

            ApacheTikaDocumentParser documentParser = new ApacheTikaDocumentParser();

            for (DocumentPO documentPO : documentPOList) {
                String filePath = documentPO.getFilePath();
                String fileUrl = minioService.getFileUrl(filePath);

                try (InputStream inputStream = minioService.getFileContent(filePath)) {
                    // 使用Apache Tika解析器解析文档
                    Document document = documentParser.parse(inputStream);
                    documents.add(document);

                    log.debug("成功从URL加载文档, 文档路径: {}", filePath);
                } catch (Exception e) {
                    log.error("解析文档失败: {}, 错误: {}", filePath, e.getMessage(), e);
                }
            }

            List<Boolean> success = buildIndex(kbName, ragConfig, documents);

            for (int i = 0; i < success.size(); i++) {
                // TODO 没成功的现在没有提示
                if (success.get(i)) {
                    // 更新文档的索引状态
                    DocumentPO documentPO = documentPOList.get(i);
                    documentPO.setIndexed(true);
                    documentRepository.save(documentPO);
                }
            }

            return ApiResponse.success("索引构建成功：");
        } catch (Exception e) {
            log.error("索引构建失败", e);
            return ApiResponse.error("索引构建失败：" + e.getMessage());
        }
    }

    private List<Boolean> buildIndex(String kbName, BaseRagConfig ragConfig, List<Document> documents) {
        String embeddingModelName = ragConfig.getEmbeddingModel();

        // 创建Embedding模型
        EmbeddingModel embeddingModel = embeddingService.createEmbeddingModel(embeddingModelName);
        log.info("使用嵌入模型：{} 创建索引", embeddingModelName);

        List<Boolean> success = new ArrayList<>();

        try {
            if (ragConfig instanceof NaiveRagConfig naiveConfig) {
                // 获取配置参数
                Integer chunkSize = naiveConfig.getChunkSize();
                Integer chunkOverlap = naiveConfig.getChunkOverlap();

                log.info("使用朴素RAG配置，块大小：{}，重叠大小：{}", chunkSize, chunkOverlap);

                Long userId = getCurrentUserId();
                if (null == userId) {
                    throw new BadCredentialsException("请登录");
                }

                String collectionName = getStoreKnowledgeBaseName(kbName);

                MilvusEmbeddingStore embeddingStore = MilvusEmbeddingStore.builder()
                        .host("10.0.30.172")
                        .port(19530)
//                        .databaseName(userId.toString())
                        // Name of the collection 知识库名称 + userId
                        .collectionName(collectionName)
                        .dimension(embeddingModel.dimension())
                        .indexType(IndexType.FLAT)
                        .metricType(MetricType.COSINE)
//                        .username("username")
//                        .password("password")
                        // Consistency level
                        .consistencyLevel(ConsistencyLevelEnum.EVENTUALLY)
                        .autoFlushOnInsert(false)
                        .idFieldName("id")
                        .textFieldName("text")
                        .metadataFieldName("metadata")
                        .vectorFieldName("vector")
                        .build();

                for (Document document : documents) {
                    log.debug("处理文档，元数据：{}", document.metadata());

                    if (document.text() != null && !document.text().isEmpty()) {
                        log.debug("文档内容预览：{}", document.text().substring(0, Math.min(200, document.text().length())) + "...");

                        // 使用配置的chunkSize和chunkOverlap进行文档切分
                        DocumentSplitter splitter = DocumentSplitters.recursive(chunkSize, chunkOverlap);
                        List<TextSegment> segments = splitter.split(document);

                        log.info("文档已切分为{}个片段", segments.size());

                        // 将文档片段转换为向量并存入向量库
                        if (segments.isEmpty()) {
                            log.warn("文档内容为空，跳过处理");
                            continue;
                        }

                        List<Embedding> embeddings = embeddingModel.embedAll(segments).content();

                        embeddingStore.addAll(embeddings, segments);

                        success.add(true);

                        continue;
                    }

                    success.add(false);
                }
            } else if (ragConfig instanceof HiSemRagConfig hiSemConfig) {
                // 获取配置参数
                Integer chunkSize = hiSemConfig.getChunkSize();
                Boolean generateAbstract = hiSemConfig.getGenerateAbstract();

                log.info("使用层次语义RAG配置，块大小：{}，生成摘要：{}", chunkSize, generateAbstract);

                // 层次语义RAG处理示例
                for (Document document : documents) {
                    if (generateAbstract) {
                        // 调用Embedding模型生成文档摘要
                        String docText = document.text().substring(0, Math.min(1000, document.text().length()));
                        float[] docEmbedding = embeddingModel.embed(docText).content().vector();
                        log.debug("文档摘要向量维度: {}", docEmbedding.length);

                        // TODO: 实现层次语义RAG的索引构建逻辑
                    }
                }
            }

            // 返回索引构建成功
            return success;

        } catch (Exception e) {
            log.error("构建索引过程中发生错误: {}", e.getMessage(), e);
            return success;
        }
    }

    /**
     * 获取当前登录用户的ID
     *
     * @return 当前登录用户ID
     */
    private Long getCurrentUserId() {
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

    private String getStoreKnowledgeBaseName(String kbName) {
        return "kb_" + getCurrentUserId() + "_" + kbName;
    }

    private final LLMService llmService;

    /**
     * @param id
     * @param question
     * @param topk
     * @param qr
     * @param qd
     * @return
     */
    @Override
    public Flux<String> naiveQa(String id, String question, int topk, boolean qr, boolean qd) {
        Optional<KnowledgeBase> knowledgeBaseOpt = knowledgeBaseRepository.findById(Long.valueOf(id));

        if (knowledgeBaseOpt.isEmpty()) {
            log.error("知识库: {}, 不存在，请确认知识库ID是否正确。", id);
            // 发送错误信息
            return sendFluxMessage("知识库不存在，请确认知识库ID是否正确。");
        }

        KnowledgeBase knowledgeBase = knowledgeBaseOpt.get();

        String kbName = knowledgeBase.getName();

        String ragMethodName = knowledgeBase.getRag();

        String embeddingModelName = knowledgeBase.getEmbeddingModel();

        try {
            // 使用 RagConfigFactory 创建 RAG 配置对象
            BaseRagConfig ragConfig = RagConfigFactory.createRagConfig(ragMethodName, embeddingModelName, "{}");

            // 创建Embedding模型
            EmbeddingModel embeddingModel = embeddingService.createEmbeddingModel(embeddingModelName);

            String collectionName = getStoreKnowledgeBaseName(kbName);

            MilvusEmbeddingStore embeddingStore = MilvusEmbeddingStore.builder()
                    .host("10.0.30.172")
                    .port(19530)
                    .collectionName(collectionName)
                    .dimension(embeddingModel.dimension())

                    .metricType(MetricType.COSINE)
                    .consistencyLevel(ConsistencyLevelEnum.EVENTUALLY)
                    .autoFlushOnInsert(false)
                    .idFieldName("id")
                    .textFieldName("text")
                    .metadataFieldName("metadata")
                    .vectorFieldName("vector")
                    .build();

            ContentRetriever contentRetriever = EmbeddingStoreContentRetriever.builder()
                    .embeddingStore(embeddingStore)
                    .embeddingModel(embeddingModel)
                    .maxResults(topk)
                    .build();

            List<Content> contents = new ArrayList<>(contentRetriever.retrieve(new Query(question)));

            if (contents.isEmpty()) {
                log.warn("知识库中没有找到与您问题相关的信息。");
                return sendFluxMessage("知识库中没有找到与您问题相关的信息。");
            }

            // 构建提示词
            String promptTemplate = """
                    请基于以下已知信息回答用户的问题。如果已知信息不足以回答问题，请回答根据已知信息无法回答。
                    
                    已知信息：
                    %s
                    
                    用户问题：%s
                    
                    请根据上述已知信息回答问题，保持专业、准确。
                    """;

            // 准备检索到的文档列表和提示词片段
            List<String> docContents = new ArrayList<>();
            StringBuilder contextBuilder = new StringBuilder();

            // 使用IntStream处理文档片段
            IntStream.range(0, contents.size()).forEach(i -> {
                String segmentText = contents.get(i).textSegment().text();
                contextBuilder.append(String.format("【片段%d】\n%s\n\n", i + 1, segmentText));
//                docContents.add(String.format("出处 [%d] %s\n\n", i + 1, segmentText));
                docContents.add(segmentText);
            });

            String prompt = String.format(promptTemplate, contextBuilder.toString(), question);

            return handleStreamingChatResponse(prompt, docContents);
        } catch (Exception e) {
            log.error("RAG问答处理失败", e);
            // 生成错误对象的新格式响应
            String errorMessage = "抱歉，处理您的问题时遇到了错误：" + e.getMessage();
            String escapedError = errorMessage.replace("\"", "\\\"").replace("\n", "\\n");
            return sendFluxMessage("escapedError");
        }
    }

    /**
     * 构建SSE消息响应格式
     *
     * @param content 消息内容
     * @return 格式化的SSE消息 Json字符串
     */
    private String buildJsonSseMessage(String content, List<String> docs) {
        try {
            Map<String, Object> message = new HashMap<>();
            message.put("id", "chat" + UUID.randomUUID());
            message.put("object", "chat.completion.chunk");

            List<Map<String, Object>> choices = new ArrayList<>();
            Map<String, Object> choice = new HashMap<>();
            Map<String, String> delta = new HashMap<>();

            if (null != docs) {
                message.put("docs", docs);
                return "data: " + objectMapper.writeValueAsString(message) + "\n\n";
            }

            delta.put("content", content);
            choice.put("delta", delta);
            choice.put("role", "assistant");
            choices.add(choice);
            message.put("choices", choices);

            return "data: " + objectMapper.writeValueAsString(message) + "\n\n";
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
    private Flux<String> sendFluxMessage(String message) {
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
    private Flux<String> handleStreamingChatResponse(String prompt, List<String> docContents) {
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