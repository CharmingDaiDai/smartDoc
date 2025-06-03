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
 * 知识库服务接口
 * 负责知识库的创建、删除、查询以及文档管理等功能
 * 
 * @author charmingdaidai
 * @version 1.0
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

    /**
     * 向知识库添加文档
     * 
     * @param id 知识库ID
     * @param user 当前用户
     * @param files 文档文件数组
     * @param titles 文档标题数组
     * @return 添加结果列表
     */
    ApiResponse<List<Boolean>> addDocs(Long id, User user, MultipartFile[] files, String[] titles);

    /**
     * 构建知识库索引
     * 
     * @param id 知识库ID
     * @return 构建结果
     */
    ApiResponse<String> buildIndex(String id);

    /**
     * 基于朴素RAG的问答
     * 
     * @param id 知识库ID
     * @param question 问题
     * @param topk 返回的top-k结果数量
     * @param ir 是否启用信息检索
     * @param qr 是否启用查询重写
     * @param qd 是否启用查询分解
     * @return 流式回答
     */
    Flux<String> naiveQa(Long id, String question, int topk, boolean ir, boolean qr, boolean qd);

    /**
     * 基于HiSem RAG的问答
     * 
     * @param id 知识库ID
     * @param question 问题
     * @param maxRes 最大结果数量
     * @param ir 是否启用信息检索
     * @param qr 是否启用查询重写
     * @param qd 是否启用查询分解
     * @return 流式回答
     */
    Flux<String> hisemQa(Long id, String question, int maxRes, boolean ir, boolean qr, boolean qd);
}