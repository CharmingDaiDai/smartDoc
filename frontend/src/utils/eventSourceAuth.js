import { EventSourcePolyfill } from 'event-source-polyfill';

/**
 * 创建带有认证头的EventSource连接
 * @param {string} url API端点URL
 * @param {Object} options 附加配置选项
 * @returns {EventSource} 带有认证的EventSource实例
 */
export function createAuthEventSource(url, options = {}) {
  // 获取JWT令牌
  const token = localStorage.getItem("token");
  
  // 添加时间戳以避免缓存问题
  const timestampedUrl = url.includes('?') 
    ? `${url}&_t=${Date.now()}` 
    : `${url}?_t=${Date.now()}`;
  
  // 合并默认选项和用户提供的选项
  const eventSourceOptions = {
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
      // 确保Content-Type正确设置
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
    withCredentials: options.withCredentials !== undefined ? options.withCredentials : false,
    heartbeatTimeout: options.heartbeatTimeout || 60000, // 心跳超时时间，默认60秒
    // 添加重试配置
    errorRetryInterval: 3000, // 错误重试间隔
    connectionTimeout: 30000, // 连接超时
  };
  
  // 创建一个增强型的EventSource实例
  const eventSource = new EventSourcePolyfill(timestampedUrl, eventSourceOptions);
  
  // 记录连接状态
  console.log(`[SSE] 创建连接: ${timestampedUrl}`);
  
  // 连接成功时的处理
  eventSource.onopen = function(event) {
    console.log('[SSE] 连接已打开', event);
  };
  
  // 增强断线重连功能
  eventSource.reconnect = function(customOptions = {}) {
    console.log('[SSE] 尝试重新连接...');
    
    // 获取最新令牌
    const freshToken = localStorage.getItem("token");
    
    // 创建新的连接选项，合并最新的令牌
    const reconnectOptions = {
      ...eventSourceOptions,
      headers: {
        ...eventSourceOptions.headers,
        Authorization: `Bearer ${freshToken}`,
        ...(customOptions.headers || {})
      },
      ...customOptions
    };
    
    // 创建新的EventSource连接
    try {
      console.log('[SSE] 创建新连接，使用更新的令牌');
      const newEventSource = new EventSourcePolyfill(timestampedUrl, reconnectOptions);
      
      // 复制重连方法到新实例
      newEventSource.reconnect = eventSource.reconnect;
      newEventSource.safeClose = eventSource.safeClose;
      
      return newEventSource;
    } catch (error) {
      console.error('[SSE] 重新连接失败:', error);
      throw error;
    }
  };
  
  // 安全关闭连接的方法
  eventSource.safeClose = function() {
    try {
      console.log('[SSE] 安全关闭连接');
      eventSource.close();
    } catch (error) {
      console.error('[SSE] 关闭连接时出错:', error);
    }
  };
  
  return eventSource;
}