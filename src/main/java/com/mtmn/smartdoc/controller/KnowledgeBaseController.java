package com.mtmn.smartdoc.controller;

import com.mtmn.smartdoc.common.ApiResponse;
import com.mtmn.smartdoc.dto.CreateKBRequest;
import com.mtmn.smartdoc.dto.KnowledgeBaseDTO;
import com.mtmn.smartdoc.po.User;
import com.mtmn.smartdoc.service.KnowledgeBaseService;
import com.mtmn.smartdoc.vo.DocumentVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/**
 * @author charmingdaidai
 * @version 1.0
 * @description 知识库相关接口
 * @date 2025/5/3 15:00
 */
@Log4j2
@RestController
@RequestMapping("/api/kb")
@RequiredArgsConstructor
@Tag(name = "知识库管理", description = "知识库创建、删除，知识库文档上传、查询和删除等接口")
public class KnowledgeBaseController {

    private final KnowledgeBaseService knowledgeBaseService;

    // =============================== 知识库相关 ===============================

    /**
     * 获取用户的知识库列表
     * <p>
     * 注: @AuthenticationPrincipal User user 参数的原理：
     * 1. 当请求到达时，Spring Security的过滤器链会先验证JWT token
     * 2. 验证成功后，会从UserDetailsService加载用户信息并存入SecurityContext
     * 3. @AuthenticationPrincipal注解由Spring Security提供，它会从SecurityContext中提取
     *    当前认证用户的Principal对象
     * 4. 由于我们的认证对象是User类型，因此可以直接注入到controller方法参数中
     * 5. 这样可以避免在方法内手动获取Authentication对象的繁琐过程
     * </p>
     * 
     * @param user 当前登录用户（由Spring Security自动注入）
     * @return 知识库列表
     */
    @GetMapping("/list")
    @Operation(summary = "获取知识库列表", description = "获取当前用户的所有知识库")
    public ApiResponse<List<KnowledgeBaseDTO>> listKnowledgeBase(@AuthenticationPrincipal User user){
        log.info("获取用户知识库列表，用户：{}", user.getUsername());
        return knowledgeBaseService.listKnowledgeBase(user);
    }

    /**
     * 新增知识库
     * <p>
     * 注: @AuthenticationPrincipal User user 参数的获取原理：
     * 1. 请求携带JWT令牌通过Authorization头传递到后端
     * 2. JwtAuthenticationFilter过滤器会验证令牌并解析用户信息
     * 3. 用户信息被封装到SecurityContextHolder.getContext().getAuthentication()中
     * 4. @AuthenticationPrincipal注解会从Authentication对象中提取Principal（即User对象）
     * 5. Spring自动将这个User对象注入到方法参数中，无需手动从SecurityContext获取
     * </p>
     * 
     * @param createKBRequest 创建知识库请求
     * @param user 当前登录用户（由Spring Security注入）
     * @return 创建结果
     */
    @PostMapping("/create")
    @Operation(summary = "创建知识库", description = "创建一个新的知识库")
    public ApiResponse<Boolean> createKnowledgeBase(@RequestBody CreateKBRequest createKBRequest,
                                                @AuthenticationPrincipal User user){
        log.info("创建知识库，用户：{}，请求：{}", user.getUsername(), createKBRequest);
        return knowledgeBaseService.createKnowledgeBase(createKBRequest, user);
    }

    /**
     * 删除知识库
     * <p>
     * 注: @AuthenticationPrincipal User user 参数原理：
     * 1. 该注解是Spring Security提供的便捷方式，用于获取当前已认证用户
     * 2. 在请求处理前，认证信息通过JWT过滤器解析并存储在SecurityContextHolder中
     * 3. @AuthenticationPrincipal注解指示Spring从SecurityContext中提取认证主体
     * 4. 系统自动将其转换为我们的User实体类并注入到参数中
     * 5. 这样可以在控制器方法中直接使用用户信息，而不需要编写重复的认证获取代码
     * </p>
     * 
     * @param id 知识库ID
     * @param user 当前登录用户（通过Spring Security上下文注入）
     * @return 删除结果
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "删除知识库", description = "删除指定ID的知识库及其关联文档")
    public ApiResponse<Boolean> deleteKnowledgeBase(@PathVariable("id") Long id,
                                                  @AuthenticationPrincipal User user){
        log.info("删除知识库，ID：{}，用户：{}", id, user.getUsername());
        return knowledgeBaseService.deleteKnowledgeBase(id, user);
    }

    /**
     * 获取知识库详情
     *
     * @param id 知识库ID
     * @param user 当前登录用户
     * @return 知识库详情
     */
    @GetMapping("/{id}")
    @Operation(summary = "获取知识库详情", description = "获取指定ID的知识库详细信息")
    public ApiResponse<KnowledgeBaseDTO> getKnowledgeBase(@PathVariable("id") Long id,
                                                          @AuthenticationPrincipal User user){
        log.info("获取知识库详情，ID：{}，用户：{}", id, user.getUsername());
        return knowledgeBaseService.getKnowledgeBase(id, user);
    }

    // ===============================  RAG 相关 ===============================

    /**
     * 获取所有可用的嵌入模型列表
     *
     * @return 嵌入模型列表
     */
    @GetMapping("/listEmbeddingModels")
    @Operation(summary = "获取嵌入模型列表", description = "获取系统支持的所有嵌入模型")
    public ApiResponse<List<Map<String, String>>> listEmbeddingModels(){
        log.info("获取嵌入模型列表");
        return knowledgeBaseService.listEmbeddingModels();
    }

    // =============================== 知识库文档相关 ===============================

    /**
     * 获取知识库文档列表
     * 
     * @param id 知识库ID
     * @param user 当前登录用户
     * @return 文档列表
     */
    @GetMapping("/listDocs/{id}")
    @Operation(summary = "获取知识库文档列表", description = "获取指定知识库中的所有文档")
    public ApiResponse<List<DocumentVO>> listDocs(@PathVariable Long id, @AuthenticationPrincipal User user){
        // TODO 改为分页查询
        log.info("获取知识库文档列表，知识库ID：{}，用户：{}", id, user.getUsername());
        return knowledgeBaseService.listKnowledgeBaseDocs(id, user);
    }

    /**
     * 知识库新增文档
     * @return
     */
    @PostMapping(value = "/addDocs/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "知识库添加文档", description = "向知识库添加文档")
    public ApiResponse<List<Boolean>> addDocs(
            @PathVariable String id,
            @AuthenticationPrincipal User user,
            @RequestParam("files") MultipartFile[] files,
            @RequestParam("titles") String[] titles){

        log.info("向知识库添加文档，知识库ID：{}，用户：{}", id, user.getUsername());

        return knowledgeBaseService.addDocs(id, user, files, titles);
    }

    /**
     * 知识库删除文档
     * @return
     */
    @PostMapping("/deleteDocs/{id}")
    @Operation(summary = "知识库删除文档", description = "删除知识库的文档")
    public ApiResponse<List<Boolean>> deleteDocs(@RequestBody String ids, @PathVariable String id, @AuthenticationPrincipal User user){
        // TODO: 实现删除知识库文档的功能（先放一放）
        // 文档从 Minio 中删除
        // 文档从向量库（索引）中删除
        // 文档从文档表中删除
        return null;
    }

    @PostMapping("index/{id}")
    @Operation(summary = "构建知识库索引", description = "构建知识库索引")
    public ApiResponse<String> buildIndex(@PathVariable String id, @AuthenticationPrincipal User user){
        log.info("构建知识库索引，知识库ID：{}，用户：{}", id, user.getUsername());
        // TODO
        return knowledgeBaseService.buildIndex(id);
    }

    @GetMapping("kbqa/{id}")
    @Operation(summary = "知识库问答", description = "知识库问答")
    public ApiResponse<String> kbqa(@PathVariable String id, @AuthenticationPrincipal User user){
        // 需要查询参数（检索参数）、用户问题

        log.info("知识库问答，知识库ID：{}，用户：{}", id, user.getUsername());
        // TODO
        return knowledgeBaseService.buildIndex(id);
    }
}