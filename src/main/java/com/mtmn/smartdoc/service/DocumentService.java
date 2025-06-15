package com.mtmn.smartdoc.service;

import com.mtmn.smartdoc.po.DocumentPO;
import com.mtmn.smartdoc.po.User;
import com.mtmn.smartdoc.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;

/**
 * 文档服务
 * 负责文档的上传、删除、查询和管理等功能
 * 
 * @author charmingdaidai
 */
@Log4j2
@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final MinioService minioService;

    /**
     * 获取用户的所有文档
     * 
     * 实现思路：
     * 1. 通过DocumentRepository查询指定用户的所有文档
     * 2. 按创建时间倒序排列，最新的文档在前
     * 3. 返回完整的文档列表
     * 
     * @param user 用户实体对象
     * @return 用户的文档列表，按创建时间倒序排列
     */
    public List<DocumentPO> getUserDocuments(User user) {
        return documentRepository.findByUserOrderByCreatedAtDesc(user);
    }

    /**
     * 上传文档到系统
     * 
     * 实现思路：
     * 1. 提取文件的基本信息（原始文件名、类型、大小）
     * 2. 调用MinIO服务将文件上传到对象存储
     * 3. 获取文件在MinIO中的存储路径
     * 4. 构建文档实体对象，包含文件信息和用户关联
     * 5. 设置文档初始状态（未索引）
     * 6. 保存文档记录到数据库
     * 7. 使用事务确保数据一致性
     * 
     * @param file 上传的文件
     * @param title 文档标题
     * @param user 上传文档的用户
     * @param kid 关联的知识库ID
     * @return 保存后的文档实体对象
     */
    @Transactional
    public DocumentPO uploadDocument(MultipartFile file, String title, User user, Long kid) {
        String originalFilename = file.getOriginalFilename();
        String fileType = file.getContentType();
        long fileSize = file.getSize();
        
        // 上传文件到MinIO
        String filePath = minioService.uploadFile(file, originalFilename);
        
        // 创建文档记录
        DocumentPO document = DocumentPO.builder()
                .title(title)
                .fileName(originalFilename)
                .fileType(fileType)
                .fileSize(fileSize)
                .filePath(filePath)
                .user(user)
                .knowledgeBaseId(kid)
                .indexed(false)
                .build();
        
        return documentRepository.save(document);
    }

    /**
     * 删除用户文档
     * 
     * 实现思路：
     * 1. 验证文档是否属于指定用户，确保权限安全
     * 2. 根据文档ID查询文档详细信息
     * 3. 调用MinIO服务删除对象存储中的文件
     * 4. 处理MinIO删除失败的情况，记录错误但继续删除数据库记录
     * 5. 从数据库中删除文档记录
     * 6. 使用事务确保数据一致性
     * 7. 返回删除操作的结果状态
     * 
     * @param documentId 要删除的文档ID
     * @param user 执行删除操作的用户
     * @return true表示删除成功，false表示删除失败
     */
    @Transactional
    public boolean deleteDocument(Long documentId, User user) {
        // 校验文档是否属于该用户
        if (!documentRepository.existsByIdAndUser(documentId, user)) {
            return false;
        }
        
        // 获取文档信息
        Optional<DocumentPO> documentOpt = documentRepository.findById(documentId);
        if (documentOpt.isEmpty()) {
            return false;
        }
        
        DocumentPO document = documentOpt.get();
        
        // 删除MinIO中的文件
        try {
            minioService.deleteFile(document.getFilePath());
        } catch (Exception e) {
            log.error("Error deleting file from MinIO: {}", e.getMessage(), e);
            // 继续删除数据库记录，即使MinIO删除失败
        }
        
        // 删除数据库记录
        documentRepository.deleteById(documentId);
        return true;
    }

    /**
     * 批量删除用户文档
     * 
     * 实现思路：
     * 1. 遍历文档ID列表，逐个调用单个文档删除方法
     * 2. 统计成功删除的文档数量
     * 3. 即使部分文档删除失败，也继续处理剩余文档
     * 4. 利用单个删除方法的权限验证和错误处理机制
     * 5. 使用事务确保每个删除操作的原子性
     * 
     * @param documentIds 要删除的文档ID列表
     * @param user 执行删除操作的用户
     * @return 成功删除的文档数量
     */
    @Transactional
    public int deleteDocuments(List<Long> documentIds, User user) {
        int successCount = 0;
        
        for (Long documentId : documentIds) {
            if (deleteDocument(documentId, user)) {
                successCount++;
            }
        }
        
        return successCount;
    }

    /**
     * 获取文档详情并验证用户权限
     * 
     * 实现思路：
     * 1. 根据文档ID从数据库查询文档信息
     * 2. 验证文档是否存在
     * 3. 检查文档是否属于指定用户，确保访问权限
     * 4. 只有文档所有者才能获取文档详情
     * 5. 返回Optional包装的结果，便于调用方处理不存在的情况
     * 
     * @param documentId 文档ID
     * @param user 请求访问的用户
     * @return Optional包装的文档对象，如果文档不存在或无权限访问则返回空Optional
     */
    public Optional<DocumentPO> getDocumentById(Long documentId, User user) {
        Optional<DocumentPO> documentOpt = documentRepository.findById(documentId);
        
        // 验证文档是否属于该用户
        if (documentOpt.isPresent() && documentOpt.get().getUser().getId().equals(user.getId())) {
            return documentOpt;
        }
        
        return Optional.empty();
    }

    /**
     * 更新文档信息
     * 
     * 实现思路：
     * 1. 接收已修改的文档实体对象
     * 2. 调用Repository的save方法持久化更新
     * 3. 利用JPA的merge机制更新现有记录
     * 4. 使用事务确保更新操作的原子性
     * 5. 返回更新后的文档实体对象
     * 
     * @param document 要更新的文档实体对象
     * @return 更新后的文档实体对象
     */
    @Transactional
    public DocumentPO updateDocument(DocumentPO document) {
        return documentRepository.save(document);
    }
    
    /**
     * 获取文档的访问URL
     * 
     * 实现思路：
     * 1. 调用getDocumentById方法获取文档并验证用户权限
     * 2. 检查文档是否存在且用户有访问权限
     * 3. 从文档实体中获取文件在MinIO中的存储路径
     * 4. 调用MinIO服务生成文件的临时访问URL
     * 5. 返回可用于前端下载或预览的URL
     * 
     * @param documentId 文档ID
     * @param user 请求访问的用户
     * @return 文档的访问URL，如果文档不存在或无权限访问则返回null
     */
    public String getDocumentUrl(Long documentId, User user) {
        Optional<DocumentPO> documentOpt = getDocumentById(documentId, user);
        if (documentOpt.isEmpty()) {
            return null;
        }
        
        DocumentPO document = documentOpt.get();
        return minioService.getFileUrl(document.getFilePath());
    }

    /**
     * 根据知识库ID获取文档列表
     * 
     * 实现思路：
     * 1. 根据知识库ID查询属于该知识库的所有文档
     * 2. 按创建时间倒序排列，最新的文档在前
     * 3. 返回完整的文档列表用于知识库管理
     * 4. 不进行用户权限验证，适用于系统内部调用
     * 
     * @param knowledgeBaseId 知识库ID
     * @return 属于指定知识库的文档列表，按创建时间倒序排列
     */
    public List<DocumentPO> getDocumentsByKnowledgeBaseId(Long knowledgeBaseId) {
        return documentRepository.findByKnowledgeBaseIdOrderByCreatedAtDesc(knowledgeBaseId);
    }
}