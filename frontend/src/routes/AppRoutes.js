import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import Dashboard from '../pages/dashboard/Dashboard';
import SummaryAnalysis from '../pages/analysis/SummaryAnalysis';
import KeywordsAnalysis from '../pages/analysis/KeywordsAnalysis';
import PolishAnalysis from '../pages/analysis/PolishAnalysis';
import ProtectedRoute from '../components/ProtectedRoute';

const AppRoutes = () => {
  return (
    <Routes>
      {/* 公共路由 */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* 保护的路由 - 需要认证 */}
      <Route path="/" element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }>
        {/* 默认路由重定向到仪表盘 */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        
        {/* 文档分析相关路由 */}
        <Route path="analysis">
          <Route path="summary" element={<SummaryAnalysis />} />
          <Route path="keywords" element={<KeywordsAnalysis />} />
          <Route path="polish" element={<PolishAnalysis />} />
          {/* 其他分析功能路由可在此处添加 */}
        </Route>
        
        {/* VIP功能路由 - 需要VIP角色 */}
        <Route path="vip">
          <Route path="advanced-analysis" element={
            <ProtectedRoute requiredRole="VIP">
              <div>高级分析功能（VIP专属）</div>
            </ProtectedRoute>
          } />
          <Route path="batch-processing" element={
            <ProtectedRoute requiredRole="VIP">
              <div>批量处理功能（VIP专属）</div>
            </ProtectedRoute>
          } />
        </Route>
        
        {/* 其他路由可在此处添加 */}
      </Route>
      
      {/* 未匹配路由 - 重定向到登录页面 */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;