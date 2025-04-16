import axios from 'axios';

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

// 响应拦截器 - 处理401错误(token过期)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // 如果是401错误(未授权)且原请求未标记为已重试，尝试刷新token
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
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
        const { accessToken, refreshToken: newRefreshToken } = response.data;
        
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

// 文档分析相关API
export const documentAPI = {
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