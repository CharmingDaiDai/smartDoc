package com.mtmn.smartdoc.repository;

import com.mtmn.smartdoc.po.KnowledgeBase;
import com.mtmn.smartdoc.po.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * @author charmingdaidai
 * @version 1.0
 * @description 知识库存储库接口
 * @date 2025/5/4 17:05
 */
@Repository
public interface KnowledgeBaseRepository extends JpaRepository<KnowledgeBase, Long> {
    
    /**
     * 根据用户查询所有知识库（按创建时间降序）
     */
    List<KnowledgeBase> findByUserOrderByCreatedAtDesc(User user);
    
    /**
     * 根据用户ID查询所有知识库（按创建时间降序）
     */
    List<KnowledgeBase> findByUserIdOrderByCreatedAtDesc(Long userId);
    
    /**
     * 检查知识库是否属于特定用户
     */
    boolean existsByIdAndUser(Long id, User user);
    
    /**
     * 根据用户ID统计知识库数量
     */
    long countByUserId(Long userId);
}