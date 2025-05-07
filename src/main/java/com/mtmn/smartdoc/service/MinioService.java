package com.mtmn.smartdoc.service;

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
     * 初始化 bucket
     */
    public void initBucket() {
        try {
            boolean found = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
            if (!found) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
                log.info("Created bucket: {}", bucketName);
            }
        } catch (Exception e) {
            log.error("Error initializing bucket: {}", e.getMessage(), e);
            throw new RuntimeException("Error initializing MinIO bucket", e);
        }
    }

    /**
     * 上传文件
     * 
     * @param file 文件
     * @param originalFilename 原始文件名
     * @return 文件路径
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
            
            log.info("File uploaded successfully: {}", objectName);
            return objectName;
        } catch (Exception e) {
            log.error("Error uploading file: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to upload file to MinIO", e);
        }
    }

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
     * 删除文件
     * 
     * @param filePath 文件路径
     */
    public void deleteFile(String filePath) {
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucketName)
                            .object(filePath)
                            .build()
            );
            log.info("File deleted successfully: {}", filePath);
        } catch (Exception e) {
            log.error("Error deleting file: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to delete file from MinIO", e);
        }
    }

    /**
     * 获取文件访问URL
     * 
     * @param filePath 文件路径
     * @return 文件URL
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
            log.error("Error getting file URL: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to get file URL from MinIO", e);
        }
    }

    /**
     * 获取文件内容流
     * 
     * @param filePath 文件路径
     * @return 文件流
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
            log.error("Error getting file content: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to get file content from MinIO", e);
        }
    }

    /**
     * 从URL下载文件并上传到MinIO
     * 
     * @param fileUrl 文件URL
     * @param fileName 文件名（可选）
     * @return MinIO中的文件路径
     */
    public String uploadFileFromUrl(String fileUrl, String fileName) {
        if (fileUrl == null || fileUrl.isEmpty()) {
            throw new IllegalArgumentException("文件URL不能为空");
        }
        
        try {
            log.info("开始从URL下载文件: {}", fileUrl);
            
            // 如果没有提供文件名，从URL生成
            if (fileName == null || fileName.isEmpty()) {
                fileName = UUID.randomUUID().toString() + "_" + 
                          fileUrl.substring(fileUrl.lastIndexOf('/') + 1);
                
                // 移除URL参数
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
            
            // 确保bucket存在
            initBucket();
            
            // 直接使用MinIO客户端上传文件，不经过MultipartFile
            try (InputStream fileInputStream = Files.newInputStream(tempFile)) {
                minioClient.putObject(
                    PutObjectArgs.builder()
                        .bucket(bucketName)
                        .object(objectName)
                        .stream(fileInputStream, Files.size(tempFile), -1)
                        .contentType(contentType)
                        .build()
                );
                
                log.info("从URL下载并上传到MinIO成功: {}", objectName);
                
                // 清理临时文件
                Files.deleteIfExists(tempFile);
                
                return objectName;
            }
        } catch (Exception e) {
            log.error("从URL下载并上传文件失败: {}", e.getMessage(), e);
            throw new RuntimeException("从URL下载并上传文件到MinIO失败", e);
        }
    }
}