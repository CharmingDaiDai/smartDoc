package com.mtmn.smartdoc.repository;

import com.mtmn.smartdoc.entity.User;
import com.mtmn.smartdoc.entity.UserActivity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserActivityRepository extends JpaRepository<UserActivity, Long> {
    
    /**
     * 查询指定用户的活动记录，按时间降序排列
     */
    List<UserActivity> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);
    
    /**
     * 统计用户的分析类型活动数量
     */
    @Query("SELECT COUNT(ua) FROM UserActivity ua WHERE ua.user = ?1 AND ua.activityType = ?2")
    long countByUserAndActivityType(User user, String activityType);
    
    /**
     * 统计用户的所有分析类活动数量（包括summary, keywords, security, polish）
     */
    @Query("SELECT COUNT(ua) FROM UserActivity ua WHERE ua.user = ?1 AND ua.activityType IN ('summary', 'keywords', 'security', 'polish')")
    long countAnalysisActivitiesByUser(User user);
}