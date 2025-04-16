import axios from 'axios';
import { message } from 'antd';

const BASE_URL = 'http://localhost:8080';

// 创建一个axios实例
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 是否正在刷新token
let isRefreshing = false;
// 等待token刷新的请求队列
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// 请求拦截器 - 添加token到请求头
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理统一返回格式和401错误(token过期)
api.interceptors.response.use(
  (response) => {
    // 统一处理响应数据，解构ApiResponse格式
    const apiResponse = response.data;
    if (apiResponse && apiResponse.code !== undefined) {
      // 这是统一响应格式
      if (apiResponse.code === 200) {
        // 成功响应，直接返回data
        return { ...response, data: apiResponse.data };
      } else {
        // 业务错误，显示错误消息并拒绝Promise
        message.error(apiResponse.message || '请求失败');
        return Promise.reject(new Error(apiResponse.message || '未知错误'));
      }
    }
    // 兼容旧格式的响应
    return response;
  },
  async (error) => {
    // 处理后端返回的错误
    const errorResponse = error.response;
    
    if (errorResponse && errorResponse.data) {
      // 如果是ApiResponse格式的错误
      const apiError = errorResponse.data;
      if (apiError.code && apiError.message) {
        message.error(apiError.message);
      }
    } else if (error.message) {
      // 其他错误消息
      message.error(error.message);
    }

    const originalRequest = error.config;
    
    // 如果是401错误(未授权)且原请求未标记为已重试，尝试刷新token
    if (errorResponse && errorResponse.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // 如果已经在刷新token，将请求添加到队列
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return axios(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      // 尝试使用refreshToken获取新的accessToken
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('无刷新令牌');
        }
        
        const response = await axios.post(`${BASE_URL}/api/auth/refresh-token`, { refreshToken });
        // 处理新的响应格式
        const responseData = response.data.data || response.data;
        const accessToken = responseData.accessToken;
        const newRefreshToken = responseData.refreshToken;
        
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        
        // 更新原始请求的Authorization头
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        
        // 处理队列中的请求
        processQueue(null, accessToken);
        
        // 重试原始请求
        return axios(originalRequest);
      } catch (err) {
        processQueue(err, null);
        // 刷新token失败，清除本地存储并重定向到登录页
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);

// 认证相关API
export const authAPI = {
  login: (credentials) => api.post('/api/auth/login', credentials),
  register: (userData) => api.post('/api/auth/register', userData),
  refreshToken: (refreshData) => api.post('/api/auth/refresh-token', refreshData),
};

// 仪表盘相关API
export const dashboardAPI = {
  // 获取仪表盘统计数据
  getStatistics: () => api.get('/api/dashboard/statistics'),
  // 获取最近活动
  getRecentActivities: (limit = 5) => api.get(`/api/dashboard/activities?limit=${limit}`),
};

// 文档相关API
export const documentAPI = {
  // 获取所有文档
  getAllDocuments: () => api.get('/api/documents'),
  // 获取单个文档
  getDocument: (id) => api.get(`/api/documents/${id}`),
  // 上传文档
  uploadDocument: (formData) => api.post('/api/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),
  // 删除文档
  deleteDocument: (id) => api.delete(`/api/documents/${id}`),
  
  // 文档分析相关API
  // 文档摘要
  getSummary: (content) => api.post('/api/summary', { content }),
  // 提取关键词
  extractKeywords: (content) => api.post('/api/keywords', { content }),
  // 文档润色
  polishDocument: (content, type) => api.post('/api/polish', { content, type }),
  // 敏感信息检测
  detectSensitiveInfo: (content) => api.post('/api/security', { content }),
  // 文档分类
  classifyDocument: (content) => api.post('/api/classification', { content }),
};

export default api;