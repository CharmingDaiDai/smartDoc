package com.mtmn.smartdoc.service;

import com.mtmn.smartdoc.common.ApiResponse;
import com.mtmn.smartdoc.dto.CreateKbRequest;
import com.mtmn.smartdoc.dto.KnowledgeBaseDTO;
import com.mtmn.smartdoc.po.User;
import com.mtmn.smartdoc.vo.DocumentVO;
import org.springframework.web.multipart.MultipartFile;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Map;

/**
 * @author charmingdaidai
 * @version 1.0
 * @description 知识库相关接口
 * @date 2025/5/4 14:49
 */
public interface KnowledgeBaseService {
    /**
     * 获取用户的知识库列表
     * @param user 当前用户
     * @return 知识库列表
     */
    ApiResponse<List<KnowledgeBaseDTO>> listKnowledgeBase(User user);

    /**
     * 创建知识库
     * @param createKBRequest 创建知识库的请求参数
     * @param user 当前用户
     * @return 是否创建成功
     */
    ApiResponse<Boolean> createKnowledgeBase(CreateKbRequest createKBRequest, User user);

    /**
     * 删除知识库
     * @param knowledgeBaseId 知识库ID
     * @param user 当前用户
     * @return 是否删除成功
     */
    ApiResponse<Boolean> deleteKnowledgeBase(Long knowledgeBaseId, User user);
    
//    /**
//     * 获取所有可用的RAG方法
//     * @return RAG方法列表
//     */
//    ApiResponse<List<RagMethodDTO>> listRagMethods();
    
    /**
     * 获取所有可用的嵌入模型列表
     * @return 嵌入模型列表
     */
    ApiResponse<List<Map<String, String>>> listEmbeddingModels();

    /**
     * 获取知识库详情
     * @param id 知识库ID
     * @param user 当前用户
     * @return 知识库详情
     */
    ApiResponse<KnowledgeBaseDTO> getKnowledgeBase(Long id, User user);
    
    /**
     * 获取知识库文档列表
     * @param knowledgeBaseId 知识库ID
     * @param user 当前用户
     * @return 文档列表
     */
    ApiResponse<List<DocumentVO>> listKnowledgeBaseDocs(Long knowledgeBaseId, User user);

    ApiResponse<List<Boolean>> addDocs(Long id, User user, MultipartFile[] files, String[] titles);

    ApiResponse<String> buildIndex(String id);

    Flux<String> naiveQa(Long id, String question, int topk, boolean ir, boolean qr, boolean qd);

    Flux<String> hisemQa(Long id, String question, int maxRes, boolean ir, boolean qr, boolean qd);
}