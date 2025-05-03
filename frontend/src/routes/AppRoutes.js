import React from 'react';
import {Navigate, Route, Routes} from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import PublicLayout from '../components/layout/PublicLayout';
import HomePage from '../pages/HomePage';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import GitHubCallback from '../pages/auth/callback/GitHubCallback';
import Dashboard from '../pages/dashboard/Dashboard';
import SummaryAnalysis from '../pages/analysis/SummaryAnalysis';
import KeywordsAnalysis from '../pages/analysis/KeywordsAnalysis';
import PolishAnalysis from '../pages/analysis/PolishAnalysis';
import SecurityAnalysis from '../pages/analysis/SecurityAnalysis';
import DocumentManagement from '../pages/documents/DocumentManagement';
import UserProfile from '../pages/profile/UserProfile';
import VipMembership from '../pages/vip/VipMembership';
import ProtectedRoute from '../components/ProtectedRoute';

const AppRoutes = () => {
  return (
    <Routes>
      {/* 公共路由 - 无需认证 */}
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="auth/callback/github" element={<GitHubCallback />} />
      </Route>
      
      {/* 保护的路由 - 需要认证 */}
      <Route path="/" element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<Dashboard />} />
        
        {/* 文档管理路由 */}
        <Route path="documents" element={<DocumentManagement />} />
        
        {/* 文档分析相关路由 */}
        <Route path="analysis">
          <Route path="summary" element={<SummaryAnalysis />} />
          <Route path="keywords" element={<KeywordsAnalysis />} />
          <Route path="polish" element={<PolishAnalysis />} />
          <Route path="security" element={<SecurityAnalysis />} />
          {/* 其他分析功能路由可在此处添加 */}
        </Route>
        
        {/* VIP功能路由 - 需要VIP角色 */}
        <Route path="vip">
          <Route path="membership" element={<VipMembership />} />
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
        
        {/* 个人资料路由 */}
        <Route path="profile" element={<UserProfile />} />
        
        {/* 其他路由可在此处添加 */}
      </Route>
      
      {/* 未匹配路由 - 重定向到首页 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;