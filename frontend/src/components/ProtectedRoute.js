import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '../context/AuthContext';

// 受保护的路由组件，用于需要登录才能访问的页面
const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, currentUser, loading } = useAuth();
  const location = useLocation();

  // 如果正在加载认证状态，显示加载中
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  // 如果未登录，重定向到登录页面
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 如果需要特定角色，检查用户是否有该角色
  if (requiredRole && requiredRole === 'VIP' && !currentUser.isVip) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 已登录且有权限，渲染子组件
  return children;
};

export default ProtectedRoute;