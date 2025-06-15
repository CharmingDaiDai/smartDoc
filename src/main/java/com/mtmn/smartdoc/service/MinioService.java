package com.mtmn.smartdoc.service;

import com.mtmn.smartdoc.common.CustomException;
import io.minio.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.jetbrains.annotations.NotNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.util.UUID;

/**
 * MinIO对象存储服务
 * 负责文件的上传、下载、删除等操作
 * 
 * @author charmingdaidai
 */
@Log4j2
@Service
@RequiredArgsConstructor
public class MinioService {

    private final MinioClient minioClient;

    @Value("${minio.bucket.files}")
    private String bucketName;

    /**
     * 初始化MinIO存储桶
     * 
     * 实现思路：
     * 1. 检查指定的存储桶是否已存在
     * 2. 如果存储桶不存在，则创建新的存储桶
     * 3. 记录存储桶创建的成功日志
     * 4. 异常处理：捕获并转换为自定义异常
     * 5. 确保后续文件操作有可用的存储空间
     */
    public void initBucket() {
        try {
            boolean found = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
            if (!found) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
                log.info("Created bucket: {}", bucketName);
            }
        } catch (Exception e) {
            log.error("初始化存储桶失败: {}", e.getMessage(), e);
            throw new CustomException(500, "初始化存储桶失败");
        }
    }

    /**
     * 上传文件到MinIO存储
     * 
     * 实现思路：
     * 1. 确保存储桶已初始化，如未存在则创建
     * 2. 使用getFilePath生成唯一的文件存储路径
     * 3. 构建PutObjectArgs对象，配置上传参数：
     *    - 指定存储桶名称
     *    - 设置对象名称（文件路径）
     *    - 提供文件输入流和大小信息
     *    - 设置内容类型以便正确处理
     * 4. 执行文件上传操作到MinIO服务器
     * 5. 记录上传成功的日志信息
     * 6. 异常处理：捕获并转换为自定义异常
     * 7. 返回生成的文件存储路径供后续引用
     * 
     * @param file MultipartFile文件对象
     * @param originalFilename 原始文件名
     * @return 在MinIO中的文件存储路径
     * @throws CustomException 文件上传失败时
     */
    public String uploadFile(MultipartFile file, String originalFilename) {
        try {
            initBucket();

            String objectName = getFilePath(originalFilename);

            // 上传文件
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .stream(file.getInputStream(), file.getSize(), -1)
                            .contentType(file.getContentType())
                            .build()
            );
            
            log.info("文件上传成功: {}", objectName);
            return objectName;
        } catch (Exception e) {
            log.error("文件上传失败: {}", e.getMessage(), e);
            throw new CustomException(500, "文件上传到 MinIO 失败");
        }
    }

    /**
     * 生成文件存储路径
     * 格式：年/月/日/UUID-原始文件名
     * 
     * 实现思路：
     * 1. 获取当前日期LocalDate.now()
     * 2. 提取年份、月份、日期并格式化为两位数
     * 3. 生成UUID作为文件唯一标识前缀
     * 4. 构建路径格式：YYYY/MM/DD/UUID-原始文件名
     * 5. 确保文件名的唯一性，避免冲突
     * 6. 按日期分层存储，便于管理和查找
     * 
     * @param originalFilename 原始文件名
     * @return 格式化的文件存储路径
     */
    @NotNull
    private static String getFilePath(String originalFilename) {
        // 生成存储路径：年/月/日/UUID-原始文件名
        LocalDate now = LocalDate.now();
        String year = String.valueOf(now.getYear());
        String month = String.format("%02d", now.getMonthValue());
        String day = String.format("%02d", now.getDayOfMonth());

        String filename = UUID.randomUUID().toString() + "-" + originalFilename;
        return year + "/" + month + "/" + day + "/" + filename;
    }

    /**
     * 从MinIO删除文件
     * 
     * 实现思路：
     * 1. 构建RemoveObjectArgs对象，指定存储桶和文件路径
     * 2. 调用MinIO客户端的removeObject方法删除文件
     * 3. 记录文件删除成功的日志
     * 4. 异常处理：捕获删除失败的异常并转换
     * 5. 提供统一的错误信息和日志记录
     * 
     * @param filePath MinIO中的文件路径
     * @throws CustomException 文件删除失败时
     */
    public void deleteFile(String filePath) {
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucketName)
                            .object(filePath)
                            .build()
            );
            log.info("文件删除成功: {}", filePath);
        } catch (Exception e) {
            log.error("文件删除失败: {}", e.getMessage(), e);
            throw new CustomException(500, "从 MinIO 删除文件失败");
        }
    }

    /**
     * 获取文件的预签名访问URL
     * 
     * 实现思路：
     * 1. 使用MinIO客户端的getPresignedObjectUrl方法
     * 2. 构建GetPresignedObjectUrlArgs，配置参数：
     *    - 指定存储桶名称
     *    - 指定文件对象路径
     *    - 设置HTTP方法为GET
     * 3. 生成带有临时访问权限的URL
     * 4. URL具有时效性，适合临时文件访问
     * 5. 异常处理：捕获并转换为自定义异常
     * 
     * @param filePath MinIO中的文件路径
     * @return 预签名的文件访问URL
     * @throws CustomException URL生成失败时
     */
    public String getFileUrl(String filePath) {
        try {
            return minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .bucket(bucketName)
                            .object(filePath)
                            .method(io.minio.http.Method.GET)
                            .build()
            );
        } catch (Exception e) {
            log.error("获取文件 URL 失败: {}", e.getMessage(), e);
            throw new CustomException(500, "获取 MinIO 文件 URL 失败");
        }
    }

    /**
     * 获取文件内容输入流
     * 
     * 实现思路：
     * 1. 构建GetObjectArgs对象，指定存储桶和文件路径
     * 2. 调用MinIO客户端的getObject方法获取文件流
     * 3. 返回InputStream供调用方读取文件内容
     * 4. 调用方负责关闭输入流以释放资源
     * 5. 异常处理：捕获并转换为自定义异常
     * 6. 适用于文件内容读取、解析等场景
     * 
     * @param filePath MinIO中的文件路径
     * @return 文件内容的输入流
     * @throws CustomException 文件读取失败时
     */
    public InputStream getFileContent(String filePath) {
        try {
            return minioClient.getObject(
                GetObjectArgs.builder()
                    .bucket(bucketName)
                    .object(filePath)
                    .build()
            );
        } catch (Exception e) {
            log.error("获取文件内容失败: {}", e.getMessage(), e);
            throw new CustomException(500, "获取 MinIO 文件内容失败");
        }
    }

    /**
     * 从URL下载文件并上传到MinIO
     * 
     * 实现思路：
     * 1. 验证文件URL的有效性，不能为空
     * 2. 如果未提供文件名，则从URL自动生成：
     *    - 使用UUID确保唯一性
     *    - 提取URL最后部分作为文件名
     *    - 移除URL参数（?后的内容）
     * 3. 根据文件扩展名确定MIME内容类型：
     *    - 支持常见图片格式：jpg/jpeg、png、gif
     *    - 其他文件类型使用application/octet-stream
     * 4. 创建临时文件用于下载：
     *    - 使用Files.createTempFile创建临时文件
     *    - 从URL读取输入流并复制到临时文件
     * 5. 生成MinIO存储路径并确保存储桶存在
     * 6. 上传文件到MinIO：
     *    - 构建PutObjectArgs设置上传参数
     *    - 使用文件输入流和内容类型
     *    - 指定文件大小以优化传输
     * 7. 清理资源：删除临时文件
     * 8. 异常处理：统一捕获并转换为自定义异常
     * 9. 返回MinIO中的文件存储路径
     * 
     * @param fileUrl 要下载的文件URL
     * @param fileName 可选的文件名，为空时自动生成
     * @return MinIO中的文件存储路径
     * @throws CustomException URL无效或下载上传失败时
     */
    public String uploadFileFromUrl(String fileUrl, String fileName) {
        if (fileUrl == null || fileUrl.isEmpty()) {
            throw new CustomException(400, "文件 URL 不能为空");
        }
        
        try {
            log.info("开始从 URL 下载文件: {}", fileUrl);
            
            // 如果没有提供文件名，从 URL 生成
            if (fileName == null || fileName.isEmpty()) {
                fileName = UUID.randomUUID().toString() + "_" + 
                          fileUrl.substring(fileUrl.lastIndexOf('/') + 1);
                
                // 移除 URL 参数
                if (fileName.contains("?")) {
                    fileName = fileName.substring(0, fileName.indexOf('?'));
                }
            }
            
            // 确定文件类型
            String contentType;
            if (fileName.toLowerCase().endsWith(".jpg") || fileName.toLowerCase().endsWith(".jpeg")) {
                contentType = "image/jpeg";
            } else if (fileName.toLowerCase().endsWith(".png")) {
                contentType = "image/png";
            } else if (fileName.toLowerCase().endsWith(".gif")) {
                contentType = "image/gif";
            } else {
                contentType = "application/octet-stream";
            }
            
            // 创建临时文件
            Path tempFile = Files.createTempFile("minio_upload_", "_" + fileName);
            
            // 下载文件到临时文件
            URL url = new URL(fileUrl);
            try (InputStream in = url.openStream()) {
                Files.copy(in, tempFile, StandardCopyOption.REPLACE_EXISTING);
            }

            String objectName = getFilePath(fileName);
            
            // 确保 bucket 存在
            initBucket();
            
            // 直接使用 MinIO 客户端上传文件，不经过 MultipartFile
            try (InputStream fileInputStream = Files.newInputStream(tempFile)) {
                minioClient.putObject(
                    PutObjectArgs.builder()
                        .bucket(bucketName)
                        .object(objectName)
                        .stream(fileInputStream, Files.size(tempFile), -1)
                        .contentType(contentType)
                        .build()
                );
                
                log.info("从 URL 下载并上传到 MinIO 成功: {}", objectName);
                
                // 清理临时文件
                Files.deleteIfExists(tempFile);
                
                return objectName;
            }
        } catch (Exception e) {
            log.error("从 URL 下载并上传文件失败: {}", e.getMessage(), e);
            throw new CustomException(500, "从 URL 下载并上传文件到 MinIO 失败");
        }
    }
}