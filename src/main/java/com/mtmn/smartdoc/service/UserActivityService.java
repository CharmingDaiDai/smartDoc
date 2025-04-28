package com.mtmn.smartdoc.service;

import com.mtmn.smartdoc.po.UserActivity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

/**
 * 用户活动服务接口
 * @author charmingdaidai
 */
public interface UserActivityService {
    
    /**
     * 记录用户活动
     * 
     * @param userId 用户ID
     * @param activityType 活动类型
     * @param documentId 文档ID，可为null
     * @param documentName 文档名称，可为null
     * @param description 活动描述，可为null
     * @return 保存的活动记录
     */
    UserActivity recordActivity(Long userId, String activityType, Long documentId, 
                              String documentName, String description);
    
    /**
     * 记录文档分析活动（摘要生成）
     */
    UserActivity recordSummaryAnalysis(Long userId, Long documentId, String documentName);
    
    /**
     * 记录文档分析活动（关键词提取）
     */
    UserActivity recordKeywordsAnalysis(Long userId, Long documentId, String documentName);
    
    /**
     * 记录文档分析活动（安全检查）
     */
    UserActivity recordSecurityAnalysis(Long userId, Long documentId, String documentName);
    
    /**
     * 记录文档分析活动（文档润色）
     */
    UserActivity recordPolishAnalysis(Long userId, Long documentId, String documentName);
    
    /**
     * 根据用户ID获取活动列表
     */
    List<UserActivity> getUserActivities(Long userId);
    
    /**
     * 分页获取用户活动
     */
    Page<UserActivity> getUserActivitiesPaged(Long userId, Pageable pageable);
    
    /**
     * 获取特定文档的活动记录
     */
    List<UserActivity> getDocumentActivities(Long documentId);
}