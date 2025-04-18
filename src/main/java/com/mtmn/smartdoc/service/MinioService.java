package com.mtmn.smartdoc.service;

import io.minio.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDate;
import java.util.UUID;

@Slf4j
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
            
            // 生成存储路径：年/月/日/UUID-原始文件名
            LocalDate now = LocalDate.now();
            String year = String.valueOf(now.getYear());
            String month = String.format("%02d", now.getMonthValue());
            String day = String.format("%02d", now.getDayOfMonth());
            
            String filename = UUID.randomUUID().toString() + "-" + originalFilename;
            String objectName = year + "/" + month + "/" + day + "/" + filename;
            
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
}