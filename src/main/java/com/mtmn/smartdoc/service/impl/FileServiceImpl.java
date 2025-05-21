package com.mtmn.smartdoc.service.impl;

import com.mtmn.smartdoc.common.ApacheTikaDocumentParser;
import com.mtmn.smartdoc.service.FileService;
import com.mtmn.smartdoc.service.MinioService;
import dev.langchain4j.data.document.Document;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;

/**
 * 文件内容读取服务实现类
 * 
 * @author charmingdaidai
 */
@Service
@Log4j2
@RequiredArgsConstructor
public class FileServiceImpl implements FileService {

    private final MinioService minioService;

    @Override
    public String readFileContent(String filePath, String fileType) {
        ApacheTikaDocumentParser documentParser = new ApacheTikaDocumentParser();

        try (InputStream inputStream = minioService.getFileContent(filePath)) {
            if (fileType == null) {
                log.warn("文件类型未指定，无法解析文件内容：{}", filePath);
                return "";
            }

            Document document = documentParser.parse(inputStream);
            return document.text();

        } catch (IOException e) {
            log.error("读取文件内容出错：{}", e.getMessage(), e);
            return "读取文件内容出错：" + e.getMessage();
        }
    }
}