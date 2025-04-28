package com.mtmn.smartdoc.service;

import com.mtmn.smartdoc.po.Document;
import com.mtmn.smartdoc.po.User;
import com.mtmn.smartdoc.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;

/**
 * @author charmingdaidai
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final MinioService minioService;

    /**
     * 获取用户的所有文档
     * 
     * @param user 用户
     * @return 文档列表
     */
    public List<Document> getUserDocuments(User user) {
        return documentRepository.findByUserOrderByCreatedAtDesc(user);
    }

    /**
     * 上传文档
     * 
     * @param file 文件
     * @param title 标题
     * @param user 用户
     * @return 文档对象
     */
    @Transactional
    public Document uploadDocument(MultipartFile file, String title, User user) {
        String originalFilename = file.getOriginalFilename();
        String fileType = file.getContentType();
        long fileSize = file.getSize();
        
        // 上传文件到MinIO
        String filePath = minioService.uploadFile(file, originalFilename);
        
        // 创建文档记录
        Document document = Document.builder()
                .title(title)
                .fileName(originalFilename)
                .fileType(fileType)
                .fileSize(fileSize)
                .filePath(filePath)
                .user(user)
                .build();
        
        return documentRepository.save(document);
    }

    /**
     * 删除文档
     * 
     * @param documentId 文档ID
     * @param user 用户
     * @return 是否删除成功
     */
    @Transactional
    public boolean deleteDocument(Long documentId, User user) {
        // 校验文档是否属于该用户
        if (!documentRepository.existsByIdAndUser(documentId, user)) {
            return false;
        }
        
        // 获取文档信息
        Optional<Document> documentOpt = documentRepository.findById(documentId);
        if (documentOpt.isEmpty()) {
            return false;
        }
        
        Document document = documentOpt.get();
        
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
     * 批量删除文档
     * 
     * @param documentIds 文档ID列表
     * @param user 用户
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
     * 获取文档详情
     * 
     * @param documentId 文档ID
     * @param user 用户
     * @return 文档对象
     */
    public Optional<Document> getDocumentById(Long documentId, User user) {
        Optional<Document> documentOpt = documentRepository.findById(documentId);
        
        // 验证文档是否属于该用户
        if (documentOpt.isPresent() && documentOpt.get().getUser().getId().equals(user.getId())) {
            return documentOpt;
        }
        
        return Optional.empty();
    }

    /**
     * 更新文档信息
     * 
     * @param document 文档
     * @return 更新后的文档
     */
    @Transactional
    public Document updateDocument(Document document) {
        return documentRepository.save(document);
    }
    
    /**
     * 获取文档访问URL
     * 
     * @param documentId 文档ID
     * @param user 用户
     * @return 文档URL
     */
    public String getDocumentUrl(Long documentId, User user) {
        Optional<Document> documentOpt = getDocumentById(documentId, user);
        if (documentOpt.isEmpty()) {
            return null;
        }
        
        Document document = documentOpt.get();
        return minioService.getFileUrl(document.getFilePath());
    }
}