package com.mtmn.smartdoc.service;

import com.mtmn.smartdoc.dto.DashboardStatisticsDTO;
import com.mtmn.smartdoc.dto.UserActivityDTO;
import com.mtmn.smartdoc.entity.User;
import com.mtmn.smartdoc.entity.UserActivity;
import com.mtmn.smartdoc.repository.DocumentRepository;
import com.mtmn.smartdoc.repository.UserActivityRepository;
import com.mtmn.smartdoc.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardService {

    private final UserActivityRepository userActivityRepository;
    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    
    /**
     * 从Authentication获取用户对象
     */
    private User getUserFromAuthentication(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        
        String username = authentication.getName();
        return userRepository.findByUsername(username).orElse(null);
    }
    
    /**
     * 记录用户活动
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
     */
    public DashboardStatisticsDTO getUserStatistics(Authentication authentication) {
        User user = getUserFromAuthentication(authentication);
        if (user == null) {
            log.warn("无法获取用户统计: 用户未找到");
            return new DashboardStatisticsDTO(0, 0, 0, 0);
        }
        
        // 获取用户的文档总数
        long documentCount = documentRepository.countByUserId(user.getId());
        
        // 获取用户的分析活动统计
        long analysisCount = userActivityRepository.countAnalysisActivitiesByUserId(user.getId());
        long keywordsCount = userActivityRepository.countByUserIdAndActivityType(user.getId(), "KEYWORDS");
        long securityCount = userActivityRepository.countByUserIdAndActivityType(user.getId(), "SECURITY");
        
        return DashboardStatisticsDTO.builder()
                .documents(documentCount)
                .analysis(analysisCount)
                .keywords(keywordsCount)
                .security(securityCount)
                .build();
    }
    
    /**
     * 获取用户的最近活动
     */
    public List<UserActivityDTO> getUserRecentActivities(Authentication authentication, int limit) {
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
     * 将实体转换为DTO
     */
    private UserActivityDTO convertToDTO(UserActivity activity) {
        UserActivityDTO dto = UserActivityDTO.builder()
                .id(activity.getId())
                .type(activity.getActivityType())
                .documentId(activity.getDocumentId())
                .documentName(activity.getDocumentName())
                .description(activity.getDescription())
                .createdAt(activity.getCreatedAt())
                .build();
        
        // 设置友好的时间表示
        dto.setTimestamp(UserActivityDTO.formatTimestamp(activity.getCreatedAt()));
        
        return dto;
    }
}