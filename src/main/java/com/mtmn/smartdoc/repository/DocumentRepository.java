package com.mtmn.smartdoc.repository;

import com.mtmn.smartdoc.po.Document;
import com.mtmn.smartdoc.po.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * @author charmingdaidai
 */
@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {
    
    /**
     * 根据用户ID统计文档数量
     */
    long countByUserId(Long userId);
    
    /**
     * 根据用户统计文档数量
     */
    long countByUser(User user);
    
    /**
     * 根据用户查询所有文档（按创建时间降序）
     */
    List<Document> findByUserOrderByCreatedAtDesc(User user);
    
    /**
     * 根据用户ID查询所有文档（按创建时间降序）
     */
    List<Document> findByUserIdOrderByCreatedAtDesc(Long userId);
    
    /**
     * 检查文档是否属于特定用户
     */
    boolean existsByIdAndUser(Long id, User user);
    
    /**
     * 根据知识库ID查询所有文档（按创建时间降序）
     */
    List<Document> findByKnowledgeBaseIdOrderByCreatedAtDesc(Long knowledgeBaseId);
}