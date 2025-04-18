import React, {createContext, useContext, useEffect, useState} from 'react';
import {message} from 'antd';
import api, {authAPI} from '../services/api';

// 创建认证上下文
const AuthContext = createContext(null);

// 认证提供者组件
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 检查token是否过期
  const isTokenExpired = (token) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // 将过期时间转换为毫秒并与当前时间比较
      return payload.exp * 1000 < Date.now();
    } catch (error) {
      console.error('Token解析错误', error);
      return true; // 解析出错视为过期
    }
  };

  // 刷新token
  const refreshAuthToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('没有刷新令牌');
      }

      // 调用刷新token的API
      const response = await authAPI.refreshToken({ refreshToken });
      const { accessToken, refreshToken: newRefreshToken } = response.data;

      // 更新存储的token
      localStorage.setItem('token', accessToken);
      localStorage.setItem('refreshToken', newRefreshToken);

      // 更新用户信息
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      setCurrentUser({
        username: payload.sub,
        userId: payload.userId,
        email: payload.email,
        isVip: payload.vip,
      });
      setIsAuthenticated(true);
      return accessToken;
    } catch (error) {
      console.error('刷新令牌失败', error);
      // 刷新失败，清除所有token并登出
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setCurrentUser(null);
      setIsAuthenticated(false);
      return null;
    }
  };

  // 在组件挂载时检查本地存储的token
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        // 检查token是否过期
        if (isTokenExpired(token)) {
          console.log('Token已过期，尝试刷新');
          const newToken = await refreshAuthToken();
          if (!newToken) {
            setLoading(false);
            return;
          }
        } else {
          // token有效，设置用户信息
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setCurrentUser({
              username: payload.sub,
              userId: payload.userId,
              email: payload.email,
              isVip: payload.vip,
            });
            setIsAuthenticated(true);
            
            // 在这里获取用户完整资料（包括头像）
            try {
              const profileResponse = await api.get('/api/profile');
              if (profileResponse && profileResponse.data) {
                setCurrentUser(prev => ({
                  ...prev,
                  avatarUrl: profileResponse.data.avatarUrl,
                  email: profileResponse.data.email,
                  fullName: profileResponse.data.fullName
                }));
              }
            } catch (profileError) {
              console.error('获取用户资料失败', profileError);
            }
          } catch (error) {
            console.error('Token解析错误', error);
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
          }
        }
      }
      setLoading(false);
    };

    checkAuthStatus();

    // 设置定时器，定期检查token是否快过期，如果快过期则刷新
    const tokenCheckInterval = setInterval(async () => {
      const token = localStorage.getItem('token');
      if (token && isAuthenticated) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          // 如果token将在5分钟内过期，则提前刷新
          const expiresIn = payload.exp * 1000 - Date.now();
          if (expiresIn < 300000) { // 5分钟 = 300000毫秒
            console.log('Token即将过期，提前刷新');
            await refreshAuthToken();
          }
        } catch (error) {
          console.error('Token检查错误', error);
        }
      }
    }, 60000); // 每分钟检查一次

    return () => {
      clearInterval(tokenCheckInterval);
    };
  }, [isAuthenticated]);

  // 登录函数
  const login = async (credentials) => {
    try {
      setLoading(true);
      const response = await authAPI.login(credentials);
      const { accessToken, refreshToken } = response.data;

      // 存储token
      localStorage.setItem('token', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      // 解析JWT获取用户信息
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      setCurrentUser({
        username: payload.sub,
        userId: payload.userId,
        email: payload.email,
        isVip: payload.vip,
      });
      
      setIsAuthenticated(true);
      message.success('登录成功！');
      return true;
    } catch (error) {
      console.error('登录失败', error);
      const errorMsg = error.response?.data?.message || '登录失败，请检查用户名和密码';
      message.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 注册函数
  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await authAPI.register(userData);
      const { accessToken, refreshToken } = response.data;

      // 存储token
      localStorage.setItem('token', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      // 解析JWT获取用户信息
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      setCurrentUser({
        username: payload.sub,
        userId: payload.userId,
        email: payload.email,
        isVip: payload.vip,
      });
      
      setIsAuthenticated(true);
      message.success('注册成功！');
      return true;
    } catch (error) {
      console.error('注册失败', error);
      const errorMsg = error.response?.data?.message || '注册失败，请稍后再试';
      message.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 登出函数
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setCurrentUser(null);
    setIsAuthenticated(false);
    message.success('已退出登录');
  };

  // 提供认证状态和方法给子组件
  const contextValue = {
    currentUser,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    refreshUserInfo: async () => {
      try {
        // 获取用户个人资料并更新状态
        const response = await api.get('/api/profile');
        
        if (response && response.data) {
          // 更新当前用户信息
          setCurrentUser(prev => ({
            ...prev,
            email: response.data.email,
            // 如果有头像信息，也可以更新
            avatarUrl: response.data.avatarUrl
          }));
        }
      } catch (error) {
        console.error('刷新用户信息失败', error);
      }
    }
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// 自定义hook方便在组件中使用认证上下文
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth必须在AuthProvider内部使用');
  }
  return context;
};