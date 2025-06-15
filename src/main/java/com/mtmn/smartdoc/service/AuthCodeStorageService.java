package com.mtmn.smartdoc.service;

import com.mtmn.smartdoc.vo.AuthenticationResponse;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 授权码存储服务
 * 用于临时存储一次性授权码和对应的认证信息
 * 
 * 注意：这是一个简化实现，实际生产环境应使用Redis等分布式缓存
 * @author charmingdaidai
 */
@Service
@Log4j2
// TODO 换成 Redis
public class AuthCodeStorageService {
    
    // 存储格式：授权码 -> (认证响应, 过期时间)
    private final Map<String, AuthCodeEntry> codeStore = new ConcurrentHashMap<>();
    
    // 授权码过期时间（秒）
    private static final long CODE_EXPIRATION_SECONDS = 120; // 2分钟
    
    /**
     * 存储授权码及对应的认证响应
     * 
     * 实现思路：
     * 1. 计算授权码过期时间（当前时间+120秒）
     * 2. 创建AuthCodeEntry对象包装认证响应和过期时间
     * 3. 将授权码作为key存储到ConcurrentHashMap中
     * 4. 记录存储操作的调试日志，包含过期时间
     * 5. 调用清理方法移除已过期的授权码
     * 6. 确保授权码的时效性和存储安全
     * 
     * @param code 一次性授权码，用作存储的key
     * @param response 认证响应对象，包含JWT令牌等信息
     */
    public void storeAuthCode(String code, AuthenticationResponse response) {
        LocalDateTime expiryTime = LocalDateTime.now().plusSeconds(CODE_EXPIRATION_SECONDS);
        codeStore.put(code, new AuthCodeEntry(response, expiryTime));
        log.debug("存储授权码: {}, 过期时间: {}", code, expiryTime);
        
        // 定期清理过期的授权码（简化实现）
        cleanupExpiredCodes();
    }
    
    /**
     * 获取并删除授权码对应的认证响应
     * 
     * 实现思路：
     * 1. 验证授权码的有效性（非空且存在于存储中）
     * 2. 如果授权码无效，记录警告日志并返回null
     * 3. 获取授权码对应的存储条目
     * 4. 检查授权码是否已过期：
     *    - 如果过期，从存储中移除并记录警告
     *    - 如果过期，返回null表示无效
     * 5. 如果有效，从存储中移除（确保一次性使用特性）
     * 6. 记录成功获取和移除的调试日志
     * 7. 返回认证响应对象供调用方使用
     * 
     * @param code 一次性授权码
     * @return 认证响应对象（如果授权码有效），否则返回null
     */
    public AuthenticationResponse getAndRemoveAuthResponse(String code) {
        if (code == null || !codeStore.containsKey(code)) {
            log.warn("无效的授权码: {}", code);
            return null;
        }
        
        AuthCodeEntry entry = codeStore.get(code);
        
        // 检查是否过期
        if (entry.isExpired()) {
            codeStore.remove(code);
            log.warn("授权码已过期: {}", code);
            return null;
        }
        
        // 获取并移除（一次性使用）
        codeStore.remove(code);
        log.debug("成功使用并移除授权码: {}", code);
        return entry.getResponse();
    }
    
    /**
     * 清理过期的授权码
     * 
     * 实现思路：
     * 1. 遍历ConcurrentHashMap中的所有条目
     * 2. 使用removeIf方法移除已过期的条目
     * 3. 通过AuthCodeEntry.isExpired()判断过期状态
     * 4. 自动清理机制减少内存占用
     * 5. 简化实现，生产环境建议使用定时任务
     */
    private void cleanupExpiredCodes() {
        codeStore.entrySet().removeIf(entry -> entry.getValue().isExpired());
    }
    
    /**
     * 授权码条目，包含认证响应和过期时间
     */
    private static class AuthCodeEntry {
        private final AuthenticationResponse response;
        private final LocalDateTime expiryTime;
        
        public AuthCodeEntry(AuthenticationResponse response, LocalDateTime expiryTime) {
            this.response = response;
            this.expiryTime = expiryTime;
        }
        
        public AuthenticationResponse getResponse() {
            return response;
        }
        
        public boolean isExpired() {
            return LocalDateTime.now().isAfter(expiryTime);
        }
    }
}