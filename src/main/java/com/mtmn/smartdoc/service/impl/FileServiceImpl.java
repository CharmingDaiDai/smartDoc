package com.mtmn.smartdoc.service.impl;

import com.mtmn.smartdoc.service.FileService;
import com.mtmn.smartdoc.service.MinioService;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
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
        try (InputStream inputStream = minioService.getFileContent(filePath)) {
            if (fileType == null) {
                log.warn("文件类型未指定，无法解析文件内容：{}", filePath);
                return "";
            }
            
            // 根据文件类型选择不同的解析方法
            if (fileType.contains("pdf")) {
                return readPdfContent(inputStream);
            } else if (fileType.contains("docx") || fileType.contains("document") || 
                    fileType.contains("msword") || fileType.contains("application/vnd.openxmlformats-officedocument.wordprocessingml")) {
                return readDocxContent(inputStream);
            } else if (fileType.contains("text") || fileType.contains("markdown") || fileType.contains("md")) {
                // 直接读取文本文件
                return new String(inputStream.readAllBytes());
            } else {
                log.warn("不支持的文件类型：{}，文件路径：{}", fileType, filePath);
                return "不支持的文件类型：" + fileType;
            }
        } catch (IOException e) {
            log.error("读取文件内容出错：{}", e.getMessage(), e);
            return "读取文件内容出错：" + e.getMessage();
        }
    }

    @Override
    public String readPdfContent(InputStream inputStream) {
        try (PDDocument document = PDDocument.load(inputStream)) {
            PDFTextStripper stripper = new PDFTextStripper();
            // 设置提取顺序为由上到下，由左到右
            stripper.setSortByPosition(true);
            // 提取文本
            String content = stripper.getText(document);
            log.debug("成功提取PDF文件内容，长度：{}", content.length());
            return content;
        } catch (IOException e) {
            log.error("读取PDF文件内容出错：{}", e.getMessage(), e);
            return "读取PDF文件内容出错：" + e.getMessage();
        }
    }

    @Override
    public String readDocxContent(InputStream inputStream) {
        try (XWPFDocument document = new XWPFDocument(inputStream)) {
            XWPFWordExtractor extractor = new XWPFWordExtractor(document);
            String content = extractor.getText();
            log.debug("成功提取DOCX文件内容，长度：{}", content.length());
            return content;
        } catch (IOException e) {
            log.error("读取DOCX文件内容出错：{}", e.getMessage(), e);
            return "读取DOCX文件内容出错：" + e.getMessage();
        }
    }
}