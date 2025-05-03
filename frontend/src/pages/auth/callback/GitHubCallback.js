import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { message, Spin } from 'antd';
import { useAuth } from '../../../context/AuthContext';
import { authAPI } from '../../../services/api';

/**
 * GitHub登录回调处理组件
 * 用于接收后端重定向过来的授权码，安全地交换JWT令牌
 */
const GitHubCallback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth(); // 获取整个auth对象
  const [loading, setLoading] = useState(true);
  const [exchangeAttempted, setExchangeAttempted] = useState(false);
  
  useEffect(() => {
    // 使用标志变量防止重复调用
    if (exchangeAttempted) {
      return;
    }
    
    const exchangeAuthCode = async () => {
      setExchangeAttempted(true); // 标记已尝试交换授权码
      try {
        // 从URL查询参数中获取授权码
        const params = new URLSearchParams(location.search);
        const authCode = params.get('code');
        
        if (!authCode) {
          throw new Error('未能获取授权码');
        }

        console.log('获取到GitHub授权码，准备交换令牌');
        
        // 使用授权码交换JWT令牌 (POST请求，将code作为查询参数传递)
        const response = await authAPI.exchangeAuthCode(authCode);
        
        if (!response || !response.data) {
          throw new Error('服务器响应无效');
        }
        
        const { accessToken, refreshToken } = response.data;
        
        if (!accessToken || !refreshToken) {
          throw new Error('响应中缺少令牌数据');
        }
        
        // 保存令牌到本地存储
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        
        // 显示成功消息
        message.success('GitHub登录成功！');
        
        // 强制重新加载页面，确保正确应用新的认证状态
        // 然后重定向到仪表盘
        console.log('准备跳转到仪表盘...');
        
        // 直接导航到仪表盘
        window.location.href = '/dashboard';
      } catch (error) {
        console.error('GitHub登录处理失败:', error);
        message.error(`登录处理失败: ${error.message || '未知错误'}`);
        // 跳转到登录页
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 100);
      } finally {
        setLoading(false);
      }
    };

    exchangeAuthCode();
  }, [location, navigate, exchangeAttempted]);
  
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh' 
    }}>
      <Spin size="large" spinning={loading} />
      <p style={{ marginTop: 24 }}>正在处理GitHub登录，请稍候...</p>
    </div>
  );
};

export default GitHubCallback;