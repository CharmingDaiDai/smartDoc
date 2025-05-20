package com.mtmn.smartdoc.service;

import com.mtmn.smartdoc.common.CustomException;
import com.mtmn.smartdoc.dto.ChangePasswordRequest;
import com.mtmn.smartdoc.dto.UpdateProfileRequest;
import com.mtmn.smartdoc.dto.UserProfileDto;
import com.mtmn.smartdoc.po.User;
import com.mtmn.smartdoc.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * 用户服务
 * author charmingdaidai
 */
@Log4j2
@Service
@RequiredArgsConstructor
public class UserService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final MinioService minioService;
    
    /**
     * 获取用户个人资料
     * 
     * @param username 用户名
     * @return 用户个人资料DTO
     */
    public UserProfileDto getUserProfile(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new CustomException(404, "用户不存在"));
        
        return convertToDTO(user);
    }
    
    /**
     * 更新用户个人资料
     * 
     * @param username 用户名
     * @param request 更新请求
     * @return 更新后的用户个人资料DTO
     */
    @Transactional
    public UserProfileDto updateProfile(String username, UpdateProfileRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new CustomException(404, "用户不存在"));
        
        // 如果要更改邮箱，检查邮箱是否已被其他用户使用
        if (!user.getEmail().equals(request.getEmail()) &&
                userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new CustomException(400, "该邮箱已被使用");
        }
        
        user.setEmail(request.getEmail());
        // user.setFullName(request.getFullName());
        
        User updatedUser = userRepository.save(user);
        return convertToDTO(updatedUser);
    }
    
    /**
     * 上传用户头像
     * 
     * @param username 用户名
     * @param file 头像文件
     * @return 更新后的用户个人资料DTO
     */
    @Transactional
    public UserProfileDto uploadAvatar(String username, MultipartFile file) {
        if (file.isEmpty()) {
            throw new CustomException(400, "头像文件不能为空");
        }
        
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new CustomException(404, "用户不存在"));
        
        try {
            // 如果用户已有头像，先删除旧头像
            if (user.getAvatarPath() != null && !user.getAvatarPath().isEmpty()) {
                try {
                    minioService.deleteFile(user.getAvatarPath());
                } catch (Exception e) {
                    log.warn("删除旧头像失败: {}", e.getMessage());
                    // 继续上传新头像，不中断流程
                }
            }
            
            // 上传新头像到 MinIO
            String originalFilename = file.getOriginalFilename();
            String filePath = minioService.uploadFile(file, originalFilename);
            
            // 更新用户头像路径
            user.setAvatarPath(filePath);
            User updatedUser = userRepository.save(user);
            
            return convertToDTO(updatedUser);
        } catch (Exception e) {
            log.error("上传头像失败: {}", e.getMessage(), e);
            throw new CustomException(500, "上传头像失败");
        }
    }
    
    /**
     * 修改密码
     * 
     * @param username 用户名
     * @param request 修改密码请求
     * @return 是否修改成功
     */
    @Transactional
    public boolean changePassword(String username, ChangePasswordRequest request) {
        // 验证新密码与确认密码是否一致
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new CustomException(400, "新密码与确认密码不一致");
        }
        
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new CustomException(404, "用户不存在"));
        
        // 验证当前密码是否正确
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new CustomException(401, "当前密码不正确");
        }
        
        // 更新密码
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        
        return true;
    }
    
    /**
     * 将用户实体转换为DTO
     */
    private UserProfileDto convertToDTO(User user) {
        UserProfileDto dto = UserProfileDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                // .fullName(user.getFullName())
                .vip(user.isVip())
                .build();
        
        // 如果用户有头像，获取头像URL
        if (user.getAvatarPath() != null && !user.getAvatarPath().isEmpty()) {
            String avatarUrl = minioService.getFileUrl(user.getAvatarPath());
            dto.setAvatarUrl(avatarUrl);
        }
        
        return dto;
    }
}