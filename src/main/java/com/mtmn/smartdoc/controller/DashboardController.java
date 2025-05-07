package com.mtmn.smartdoc.controller;

import com.mtmn.smartdoc.common.ApiResponse;
import com.mtmn.smartdoc.dto.DashboardStatisticsDto;
import com.mtmn.smartdoc.dto.UserActivityDto;
import com.mtmn.smartdoc.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * @author charmingdaidai
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/dashboard")
@Tag(name = "仪表盘接口", description = "提供仪表盘数据统计和用户活动记录")
@Log4j2
public class DashboardController {

    private final DashboardService dashboardService;
    
    @GetMapping("/statistics")
    @Operation(summary = "获取仪表盘统计数据", description = "返回用户的文档总数、分析次数等统计数据")
    public ApiResponse<DashboardStatisticsDto> getStatistics(Authentication authentication) {
        DashboardStatisticsDto statistics = dashboardService.getUserStatistics(authentication);
        return ApiResponse.success(statistics);
    }
    
    @GetMapping("/activities")
    @Operation(summary = "获取用户最近活动", description = "返回用户的最近操作记录，可指定返回数量")
    public ApiResponse<List<UserActivityDto>> getRecentActivities(
            Authentication authentication,
            @RequestParam(defaultValue = "5") int limit) {
        
        List<UserActivityDto> activities = dashboardService.getUserRecentActivities(authentication, limit);
        return ApiResponse.success(activities);
    }
}