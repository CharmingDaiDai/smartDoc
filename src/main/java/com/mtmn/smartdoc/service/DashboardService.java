package com.mtmn.smartdoc.service;

import com.mtmn.smartdoc.dto.DashboardStatisticsDto;
import com.mtmn.smartdoc.dto.UserActivityDto;
import com.mtmn.smartdoc.po.User;
import com.mtmn.smartdoc.po.UserActivity;
import com.mtmn.smartdoc.repository.DocumentRepository;
import com.mtmn.smartdoc.repository.UserActivityRepository;
import com.mtmn.smartdoc.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 仪表盘服务
 * 负责用户活动记录、统计数据计算和活动历史查询
 * 
 * @author charmingdaidai
 */
@Log4j2
@Service
@RequiredArgsConstructor
public class DashboardService {

    private final UserActivityRepository userActivityRepository;
    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    
    /**
     * 从认证信息中获取用户对象
     * 
     * 实现思路：
     * 1. 检查认证信息的有效性和认证状态
     * 2. 从认证信息中提取用户名
     * 3. 根据用户名从数据库查询用户实体
     * 4. 如果查询失败则返回null，便于调用方处理
     * 
     * @param authentication Spring Security的认证信息
     * @return 用户实体对象，认证失败或用户不存在时返回null
     */
    private User getUserFromAuthentication(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        
        String username = authentication.getName();
        return userRepository.findByUsername(username).orElse(null);
    }
    
    /**
     * 记录用户活动到数据库
     * 
     * 实现思路：
     * 1. 从认证信息中提取用户实体
     * 2. 验证用户的有效性，无效用户记录警告并跳过
     * 3. 构建UserActivity实体对象，包含活动详情
     * 4. 设置当前时间作为活动时间戳
     * 5. 保存活动记录到数据库
     * 6. 捕获异常并记录错误日志，不影响主业务流程
     * 
     * @param authentication 用户认证信息
     * @param activityType 活动类型（如SUMMARY、KEYWORDS等）
     * @param documentId 关联的文档ID
     * @param documentName 文档名称
     * @param description 活动描述信息
     */
    public void recordUserActivity(Authentication authentication, String activityType, Long documentId, String documentName, String description) {
        User user = getUserFromAuthentication(authentication);
        if (user == null) {
            log.warn("无法记录用户活动: 用户未找到");
            return;
        }
        
        try {
            UserActivity activity = UserActivity.builder()
                    .userId(user.getId())
                    .activityType(activityType)
                    .documentId(documentId)
                    .documentName(documentName)
                    .description(description)
                    .createdAt(LocalDateTime.now())
                    .build();
            
            userActivityRepository.save(activity);
        } catch (Exception e) {
            log.error("记录用户活动失败", e);
            // 这里只记录日志，不抛出异常，避免影响主要业务流程
        }
    }
    
    /**
     * 获取用户的仪表盘统计数据
     * 
     * 实现思路：
     * 1. 从认证信息中提取用户实体
     * 2. 验证用户有效性，无效用户返回全零统计数据
     * 3. 查询用户的文档总数
     * 4. 分别统计各类型的分析活动数量
     * 5. 包括关键词提取、安全检查、摘要生成、文档润色等
     * 6. 构建并返回包含完整统计信息的DTO对象
     * 
     * @param authentication 用户认证信息
     * @return 仪表盘统计数据DTO，包含文档数和各类分析活动统计
     */
    public DashboardStatisticsDto getUserStatistics(Authentication authentication) {
        User user = getUserFromAuthentication(authentication);
        if (user == null) {
            log.warn("无法获取用户统计: 用户未找到");
            return new DashboardStatisticsDto(0, 0, 0, 0, 0, 0);
        }
        
        // 获取用户的文档总数
        long documentCount = documentRepository.countByUserId(user.getId());
        
        // 获取用户的分析活动统计
        long analysisCount = userActivityRepository.countAnalysisActivitiesByUserId(user.getId());
        long keywordsCount = userActivityRepository.countByUserIdAndActivityType(user.getId(), "KEYWORDS");
        long securityCount = userActivityRepository.countByUserIdAndActivityType(user.getId(), "SECURITY");
        long summaryCount = userActivityRepository.countByUserIdAndActivityType(user.getId(), "SUMMARY");
        long polishCount = userActivityRepository.countByUserIdAndActivityType(user.getId(), "POLISH");
        
        return DashboardStatisticsDto.builder()
                .documents(documentCount)
                .analysis(analysisCount)
                .keywords(keywordsCount)
                .security(securityCount)
                .summary(summaryCount)
                .polish(polishCount)
                .build();
    }
    
    /**
     * 获取用户的最近活动
     * 
     * @param authentication 认证信息
     * @param limit 限制返回的活动数量
     * @return 用户活动DTO列表
     */
    public List<UserActivityDto> getUserRecentActivities(Authentication authentication, int limit) {
        User user = getUserFromAuthentication(authentication);
        if (user == null) {
            log.warn("无法获取用户活动: 用户未找到");
            return Collections.emptyList();
        }
        
        Pageable pageable = PageRequest.of(0, limit);
        Page<UserActivity> activitiesPage = userActivityRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), pageable);
        
        return activitiesPage.getContent().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    /**
     * 将用户活动实体转换为DTO
     * 
     * @param activity 用户活动实体
     * @return 用户活动DTO
     */
    private UserActivityDto convertToDTO(UserActivity activity) {
        UserActivityDto dto = UserActivityDto.builder()
                .id(activity.getId())
                .type(activity.getActivityType())
                .documentId(activity.getDocumentId())
                .documentName(activity.getDocumentName())
                .description(activity.getDescription())
                .createdAt(activity.getCreatedAt())
                .build();
        
        // 设置友好的时间表示
        dto.setTimestamp(UserActivityDto.formatTimestamp(activity.getCreatedAt()));
        
        return dto;
    }
}