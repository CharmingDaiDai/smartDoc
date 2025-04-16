package com.mtmn.smartdoc.service.impl;

import com.mtmn.smartdoc.entity.UserActivity;
import com.mtmn.smartdoc.repository.UserActivityRepository;
import com.mtmn.smartdoc.service.UserActivityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 用户活动服务实现类
 */
@Service
@RequiredArgsConstructor
@Log4j2
public class UserActivityServiceImpl implements UserActivityService {

    private final UserActivityRepository userActivityRepository;
    
    @Override
    public UserActivity recordActivity(Long userId, String activityType, Long documentId, 
                                    String documentName, String description) {
        log.info("记录用户活动: userId={}, activityType={}, documentId={}", userId, activityType, documentId);
        
        UserActivity activity = UserActivity.builder()
                .userId(userId)
                .activityType(activityType)
                .documentId(documentId)
                .documentName(documentName)
                .description(description)
                .createdAt(LocalDateTime.now())
                .build();
        
        return userActivityRepository.save(activity);
    }

    @Override
    public UserActivity recordSummaryAnalysis(Long userId, Long documentId, String documentName) {
        return recordActivity(
            userId, 
            UserActivity.ActivityType.SUMMARY.name(), 
            documentId, 
            documentName, 
            "生成文档摘要"
        );
    }

    @Override
    public UserActivity recordKeywordsAnalysis(Long userId, Long documentId, String documentName) {
        return recordActivity(
            userId, 
            UserActivity.ActivityType.KEYWORDS.name(), 
            documentId, 
            documentName, 
            "提取文档关键词"
        );
    }

    @Override
    public UserActivity recordSecurityAnalysis(Long userId, Long documentId, String documentName) {
        return recordActivity(
            userId, 
            UserActivity.ActivityType.SECURITY.name(), 
            documentId, 
            documentName, 
            "进行文档安全检查"
        );
    }

    @Override
    public UserActivity recordPolishAnalysis(Long userId, Long documentId, String documentName) {
        return recordActivity(
            userId, 
            UserActivity.ActivityType.POLISH.name(), 
            documentId, 
            documentName, 
            "进行文档润色优化"
        );
    }

    @Override
    public List<UserActivity> getUserActivities(Long userId) {
        return userActivityRepository.findByUserId(userId);
    }

    @Override
    public Page<UserActivity> getUserActivitiesPaged(Long userId, Pageable pageable) {
        return userActivityRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    @Override
    public List<UserActivity> getDocumentActivities(Long documentId) {
        return userActivityRepository.findByDocumentIdOrderByCreatedAtDesc(documentId);
    }
}