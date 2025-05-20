package com.mtmn.smartdoc.service.impl;

import com.mtmn.smartdoc.po.DocumentPO;
import com.mtmn.smartdoc.repository.DocumentRepository;
import com.mtmn.smartdoc.service.AnalysisService;
import com.mtmn.smartdoc.service.FileService;
import com.mtmn.smartdoc.service.LLMService;
import com.mtmn.smartdoc.vo.KeywordsResult;
import com.mtmn.smartdoc.vo.PolishResult;
import com.mtmn.smartdoc.vo.SecurityResult;
import com.mtmn.smartdoc.vo.SummaryResult;
import jakarta.annotation.Resource;
import jakarta.persistence.EntityNotFoundException;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.concurrent.*;
import java.util.stream.Collectors;

/**
 * @author charmingdaidai
 */
@Service
@Log4j2
public class AnalysisServiceImpl implements AnalysisService {

    /**
     * 内容块的最大字符数
     */
    private static final int MAX_BLOCK_SIZE = 4000;

    @Resource
    private DocumentRepository documentRepository;

    @Resource
    private LLMService llmService;

    @Resource
    private FileService fileService;

    /**
     * 将长文本内容分割成不超过最大大小的小块，保持句子完整性
     *
     * @param content  原始文本内容
     * @param maxSize  每个块的最大大小(字符数)
     * @return 分割后的内容块列表
     */
    private List<String> splitContentIntoChunks(String content, int maxSize) {
        if (content == null || content.isEmpty() || content.length() <= maxSize) {
            List<String> result = new ArrayList<>();
            if (content != null && !content.isEmpty()) {
                result.add(content);
            }
            return result;
        }
        
        // 定义句子结束的标点符号
        List<Character> sentenceEndings = Arrays.asList('.', '!', '?', '。', '！', '？', ';', '；');
        
        List<String> chunks = new ArrayList<>();
        StringBuilder currentChunk = new StringBuilder();
        StringBuilder currentSentence = new StringBuilder();
        
        // 按字符遍历内容
        for (int i = 0; i < content.length(); i++) {
            char c = content.charAt(i);
            currentSentence.append(c);
            
            // 检查是否句子结束  检查是否为段落结束（两个连续地换行）
            boolean isSentenceEnd = c == '\n' && i + 1 < content.length() && content.charAt(i + 1) == '\n';

            // 检查是否为句子结束标点符号
            if (!isSentenceEnd && sentenceEndings.contains(c)) {
                isSentenceEnd = true;
            }
            
            // 如果句子结束，检查加入该句子后是否超过大小限制
            if (isSentenceEnd) {
                if (currentChunk.length() + currentSentence.length() <= maxSize) {
                    currentChunk.append(currentSentence);
                    currentSentence.setLength(0);
                } else {
                    // 如果加上这个句子会超过大小限制，先保存当前块，再开始新块
                    if (!currentChunk.isEmpty()) {
                        chunks.add(currentChunk.toString());
                    }
                    currentChunk = new StringBuilder(currentSentence);
                    currentSentence.setLength(0);
                }
            }
        }
        
        // 处理最后一个句子和块
        if (!currentSentence.isEmpty()) {
            if (currentChunk.length() + currentSentence.length() <= maxSize) {
                currentChunk.append(currentSentence);
            } else {
                chunks.add(currentChunk.toString());
                currentChunk = new StringBuilder(currentSentence);
            }
        }
        
        if (!currentChunk.isEmpty()) {
            chunks.add(currentChunk.toString());
        }
        
        return chunks;
    }
    
    /**
     * 重载方法，使用默认最大块大小
     * 
     * @param content 原始文本内容
     * @return 分割后的内容块列表
     */
    private List<String> splitContentIntoChunks(String content) {
        return splitContentIntoChunks(content, MAX_BLOCK_SIZE);
    }

    @Override
    public SummaryResult generateSummary(String content) {
        // 计算原始内容长度
        int originalLength = content != null ? content.length() : 0;

        // 如果长度太长超过MAX_BLOCK_SIZE，则进行拆分
        List<String> chunks = splitContentIntoChunks(content);

        // 创建一个线程池，数量为5
        ExecutorService executorService = Executors.newFixedThreadPool(5);
        List<Future<String>> futures = new ArrayList<>();

        // 提交摘要生成任务
        for (String chunk : chunks) {
            Callable<String> task = () -> llmService.generateSummary(chunk);
            futures.add(executorService.submit(task));
        }

        // 收集摘要结果
        StringBuilder summaryBuilder = new StringBuilder();
        for (Future<String> future : futures) {
            try {
                summaryBuilder.append(future.get()).append(" ");
            } catch (InterruptedException | ExecutionException e) {
                log.error("Error generating summary for a chunk", e);
                // 恢复机制：继续处理下一个chunk
                continue;
            }
        }

        // 关闭线程池
        executorService.shutdown();
        try {
            if (!executorService.awaitTermination(60, TimeUnit.SECONDS)) {
                executorService.shutdownNow();
            }
        } catch (InterruptedException e) {
            executorService.shutdownNow();
        }

        String summary = summaryBuilder.toString().trim();

        return SummaryResult.builder()
                .summary(summary)
                .timestamp(System.currentTimeMillis())
                .originalLength(originalLength)
                .summaryLength(summary.length())
                .build();
    }

    @Override
    @Transactional
    public SummaryResult generateSummaryFromDocument(Long documentId) {
        // 查找文档
        DocumentPO document = documentRepository.findById(documentId)
                .orElseThrow(() -> new EntityNotFoundException("文档不存在，ID: " + documentId));
        
        // 读取文档内容
        String content = readDocumentContent(document);
        
        // 生成摘要
        SummaryResult result = generateSummary(content);
        
        // 将摘要保存到文档实体
        document.setSummary(result.getSummary());
        documentRepository.save(document);
        log.info("已将摘要保存到文档，ID: {}, 摘要长度: {}", documentId, result.getSummaryLength());
        
        return result;
    }

    @Override
    public KeywordsResult extractKeywords(String content) {
        // 计算原始内容长度
        int originalLength = content != null ? content.length() : 0;
        
        // 如果长度太长超过MAX_BLOCK_SIZE，则进行拆分
        List<String> chunks = splitContentIntoChunks(content);
        
        // 创建一个线程池，数量为5
        ExecutorService executorService = Executors.newFixedThreadPool(5);
        List<Future<List<String>>> futures = new ArrayList<>();
        
        // 提交关键词提取任务
        for (String chunk : chunks) {
            Callable<List<String>> task = () -> {
                return llmService.extractKeywords(chunk);
            };
            futures.add(executorService.submit(task));
        }
        
        // 收集所有关键词结果并去重
        Set<String> uniqueKeywords = new HashSet<>();
        for (Future<List<String>> future : futures) {
            try {
                List<String> keywords = future.get();
                if (keywords != null) {
                    uniqueKeywords.addAll(keywords);
                }
            } catch (InterruptedException | ExecutionException e) {
                log.error("Error extracting keywords for a chunk", e);
                // 恢复机制：继续处理下一个chunk
                continue;
            }
        }
        
        // 关闭线程池
        executorService.shutdown();
        try {
            if (!executorService.awaitTermination(60, TimeUnit.SECONDS)) {
                executorService.shutdownNow();
                log.warn("ExecutorService did not terminate in the specified time for keyword extraction");
            }
        } catch (InterruptedException e) {
            executorService.shutdownNow();
            log.error("ExecutorService termination interrupted for keyword extraction", e);
            Thread.currentThread().interrupt();
        }
        
        // 将Set转换为List返回
        List<String> keywordsList = new ArrayList<>(uniqueKeywords);
        
        // 如果没有提取到关键词，使用模拟数据
        if (keywordsList.isEmpty()) {
            log.warn("No keywords extracted, using mock data");
            keywordsList = List.of(
                    "无提取到的关键词"
            );
        }
        
        return KeywordsResult.builder()
                .keywords(keywordsList)
                .timestamp(System.currentTimeMillis())
                .originalLength(originalLength)
                .build();
    }

    @Override
    @Transactional
    public KeywordsResult extractKeywordsFromDocument(Long documentId) {
        // 查找文档
        DocumentPO document = documentRepository.findById(documentId)
                .orElseThrow(() -> new EntityNotFoundException("文档不存在，ID: " + documentId));
        
        // 读取文档内容
        String content = readDocumentContent(document);
        
        // 提取关键词
        KeywordsResult result = extractKeywords(content);
        
        // 将关键词保存到文档实体
        document.setKeywords(String.join(",", result.getKeywords()));
        documentRepository.save(document);
        log.info("已将关键词保存到文档，ID: {}, 关键词数量: {}", documentId, result.getKeywords().size());
        
        return result;
    }

    @Override
    public PolishResult polishDocument(String content, String polishType) {
        // 计算原始内容长度
        int originalLength = content != null ? content.length() : 0;
        
        // 默认使用formal润色类型
        if (polishType == null || polishType.isEmpty()) {
            polishType = "formal";
        }
        
        final String finalPolishType = polishType;
        
        // 如果长度太长超过MAX_BLOCK_SIZE，则进行拆分
        List<String> chunks = splitContentIntoChunks(content);
        
        // 创建一个线程池，数量为5
        ExecutorService executorService = Executors.newFixedThreadPool(5);
        List<Future<String>> futures = new ArrayList<>();
        
        // 提交润色任务
        for (String chunk : chunks) {
            Callable<String> task = () -> {
                // 实际项目中，这里应该调用文本润色算法或外部API
                return llmService.polishDocument(chunk, finalPolishType);
            };
            futures.add(executorService.submit(task));
        }
        
        // 收集润色结果
        StringBuilder polishedBuilder = new StringBuilder();
        for (Future<String> future : futures) {
            try {
                String result = future.get();
                if (result != null) {
                    polishedBuilder.append(result).append("\n\n");
                }
            } catch (InterruptedException | ExecutionException e) {
                log.error("Error polishing document chunk with type {}: {}", finalPolishType, e.getMessage(), e);
                // 恢复机制：继续处理下一个chunk
                continue;
            }
        }
        
        // 关闭线程池
        executorService.shutdown();
        try {
            if (!executorService.awaitTermination(60, TimeUnit.SECONDS)) {
                executorService.shutdownNow();
                log.warn("ExecutorService did not terminate in the specified time for document polishing");
            }
        } catch (InterruptedException e) {
            executorService.shutdownNow();
            log.error("ExecutorService termination interrupted for document polishing", e);
            Thread.currentThread().interrupt();
        }
        
        String polishedContent = polishedBuilder.toString().trim();
        
        // 如果润色结果为空，根据润色类型返回默认内容
        if (polishedContent.isEmpty()) {
            log.warn("Polished content is empty, using default content for type: {}", finalPolishType);
            polishedContent = "润色失败，返回内容为空";
        }
        
        return PolishResult.builder()
                .polishedContent(polishedContent)
                .polishType(finalPolishType)
                .timestamp(System.currentTimeMillis())
                .originalLength(originalLength)
                .polishedLength(polishedContent.length())
                .build();
    }

    @Override
    @Transactional
    public PolishResult polishDocumentFromDocument(Long documentId, String polishType) {
        // 查找文档
        DocumentPO document = documentRepository.findById(documentId)
                .orElseThrow(() -> new EntityNotFoundException("文档不存在，ID: " + documentId));
        
        // 读取文档内容
        String content = readDocumentContent(document);
        
        // 润色文档
        PolishResult result = polishDocument(content, polishType);
        
        // 将润色结果保存到文档实体
        // 注意：这里假设我们将润色后的内容作为新文档的内容来处理
        // 如果Document实体没有专门用于保存润色结果的字段，可以考虑添加一个
        document.setSummary(document.getSummary() + "\n\n【润色结果】\n" + 
                "润色类型：" + result.getPolishType() + "\n" + 
                "润色时间：" + new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date(result.getTimestamp())));
        
        documentRepository.save(document);
        log.info("已将润色信息保存到文档，ID: {}, 润色类型: {}, 润色后长度: {}", 
                documentId, result.getPolishType(), result.getPolishedLength());
        
        return result;
    }

    @Override
    public SecurityResult detectSensitiveInfo(String content) {
        // 计算原始内容长度
        int originalLength = content != null ? content.length() : 0;
        
        if (content == null || content.isEmpty()) {
            log.warn("检测敏感信息时收到空内容");
            return SecurityResult.builder()
                    .sensitiveInfoList(new ArrayList<>())
                    .timestamp(System.currentTimeMillis())
                    .originalLength(0)
                    .totalCount(0)
                    .build();
        }
        
        // 如果内容太长，分块处理
        if (originalLength > MAX_BLOCK_SIZE) {
            log.info("内容过长，分块检测敏感信息，总长度: {}", originalLength);
            return detectSensitiveInfoInChunks(content);
        }
        
        // 调用LLMService进行敏感信息检测
        List<SecurityResult.SensitiveInfo> sensitiveInfoList;
        try {
            sensitiveInfoList = llmService.detectSensitiveInfo(content);
            log.info("敏感信息检测完成，找到{}条敏感信息", sensitiveInfoList.size());
        } catch (Exception e) {
            log.error("检测敏感信息时发生错误: {}", e.getMessage(), e);
            sensitiveInfoList = new ArrayList<>();
        }

        return SecurityResult.builder()
                .sensitiveInfoList(sensitiveInfoList)
                .timestamp(System.currentTimeMillis())
                .originalLength(originalLength)
                .totalCount(sensitiveInfoList.size())
                .build();
    }
    
    /**
     * 对长内容分块检测敏感信息
     * 
     * @param content 需要检测的长内容
     * @return 合并后的敏感信息检测结果
     */
    private SecurityResult detectSensitiveInfoInChunks(String content) {
        // 分块处理
        List<String> chunks = splitContentIntoChunks(content);
        log.info("长内容被分为{}个块进行敏感信息检测", chunks.size());
        
        // 创建一个线程池
        ExecutorService executorService = Executors.newFixedThreadPool(5);
        List<Future<List<SecurityResult.SensitiveInfo>>> futures = new ArrayList<>();
        
        // 提交敏感信息检测任务
        for (int i = 0; i < chunks.size(); i++) {
            final String chunk = chunks.get(i);
            final int chunkOffset = i > 0 
                    ? chunks.subList(0, i).stream().mapToInt(String::length).sum() 
                    : 0;
            
            Callable<List<SecurityResult.SensitiveInfo>> task = () -> {
                List<SecurityResult.SensitiveInfo> chunkResults = llmService.detectSensitiveInfo(chunk);
                
                // 调整位置信息，加上之前块的长度偏移
                if (chunkOffset > 0) {
                    chunkResults = chunkResults.stream()
                            .map(info -> {
                                SecurityResult.Position adjustedPos = new SecurityResult.Position(
                                        info.getPosition().getStart() + chunkOffset,
                                        info.getPosition().getEnd() + chunkOffset
                                );
                                return SecurityResult.SensitiveInfo.builder()
                                        .type(info.getType())
                                        .content(info.getContent())
                                        .risk(info.getRisk())
                                        .position(adjustedPos)
                                        .build();
                            })
                            .collect(Collectors.toList());
                }
                return chunkResults;
            };
            
            futures.add(executorService.submit(task));
        }
        
        // 收集所有块的检测结果
        List<SecurityResult.SensitiveInfo> allSensitiveInfo = new ArrayList<>();
        for (Future<List<SecurityResult.SensitiveInfo>> future : futures) {
            try {
                List<SecurityResult.SensitiveInfo> result = future.get();
                if (result != null) {
                    allSensitiveInfo.addAll(result);
                }
            } catch (InterruptedException | ExecutionException e) {
                log.error("敏感信息检测任务执行出错: {}", e.getMessage(), e);
                // 继续处理其他结果
            }
        }
        
        // 关闭线程池
        executorService.shutdown();
        try {
            if (!executorService.awaitTermination(60, TimeUnit.SECONDS)) {
                executorService.shutdownNow();
            }
        } catch (InterruptedException e) {
            executorService.shutdownNow();
            Thread.currentThread().interrupt();
        }
        
        return SecurityResult.builder()
                .sensitiveInfoList(allSensitiveInfo)
                .timestamp(System.currentTimeMillis())
                .originalLength(content.length())
                .totalCount(allSensitiveInfo.size())
                .build();
    }

    @Override
    @Transactional
    public SecurityResult detectSensitiveInfoFromDocument(Long documentId) {
        // 查找文档
        DocumentPO document = documentRepository.findById(documentId)
                .orElseThrow(() -> new EntityNotFoundException("文档不存在，ID: " + documentId));
        
        // 读取文档内容
        String content = readDocumentContent(document);
        
        // 检测敏感信息
        SecurityResult result = detectSensitiveInfo(content);
        
        // 将敏感信息检测结果保存到文档实体
        // 将检测到的敏感信息转换为JSON格式存储
        try {
            // 使用jackson或gson等库将对象转换为json
            String jsonResult = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(result);
            document.setSensitiveInfo(jsonResult);
            documentRepository.save(document);
            log.info("已将敏感信息检测结果保存到文档，ID: {}, 敏感信息数量: {}", documentId, result.getTotalCount());
        } catch (Exception e) {
            log.error("将敏感信息检测结果转换为JSON时出错: {}", e.getMessage(), e);
        }
        
        return result;
    }
    
    /**
     * 读取文档内容
     * 从文件存储服务（如MinIO）中获取文件内容
     */
    private String readDocumentContent(DocumentPO document) {
        if (document == null || document.getFilePath() == null) {
            log.warn("文档或文档路径为空，无法读取内容");
            return "";
        }
        
        try {
            String fileType = document.getFileType();
            String filePath = document.getFilePath();
            
            // 使用FileService读取文件内容，会根据文件类型自动选择合适的读取方法
            String content = fileService.readFileContent(filePath, fileType);
            
            log.info("成功读取文档内容，文档ID：{}，文件路径：{}，内容长度：{}", 
                    document.getId(), filePath, content.length());
                    
            return content;
        } catch (Exception e) {
            log.error("读取文档内容出错，文档ID：{}，错误：{}", 
                    document.getId(), e.getMessage(), e);
            return "读取文档内容出错：" + e.getMessage();
        }
    }
}