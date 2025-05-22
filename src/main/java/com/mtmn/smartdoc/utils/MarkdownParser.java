package com.mtmn.smartdoc.utils;

import com.mtmn.smartdoc.common.MyNode;
import lombok.Data;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * @author charmingdaidai
 */
public class MarkdownParser {

    /**
     * 解析Markdown文本，构建层级结构（两阶段解析）
     *
     * @param markdownText  Markdown格式的文本内容
     * @param documentTitle 文档标题，作为根节点
     * @param maxLevel      最大解析的标题层级，超过此层级的内容作为上级标题内容处理，设置为null则不限制
     * @return 返回根节点和所有节点的字典映射 (root_node, {节点ID: 节点对象})
     */
    public static Map.Entry<MyNode, Map<String, MyNode>> parseMarkdownStructure(
            String markdownText, String documentTitle, Integer maxLevel) {

        // 创建根节点
        MyNode rootNode = new MyNode("", 0, documentTitle);

        // 存储所有节点的字典，键为节点ID
        Map<String, MyNode> nodesDict = new HashMap<>();
        nodesDict.put(rootNode.getId(), rootNode);

        // 按行分割Markdown文本
        String[] lines = markdownText.split("\\n");

        // 正则表达式匹配标题
        Pattern headerPattern = Pattern.compile("^(#+)\\s+(.*)$");

        // 阶段1: 收集所有标题和内容，但不建立层级关系
        List<HeaderInfo> allHeaders = new ArrayList<>();
        List<String> currentContent = new ArrayList<>();
        HeaderInfo currentHeader = null;

        // 先处理根节点的内容
        List<String> rootContent = new ArrayList<>();

        for (String line : lines) {
            Matcher headerMatcher = headerPattern.matcher(line);

            if (headerMatcher.find()) {
                // 获取标题级别和文本
                // '#'的数量表示级别
                int level = headerMatcher.group(1).length();
                String titleText = headerMatcher.group(2).trim();

                // 检查是否超过最大层级
                if (maxLevel != null && level > maxLevel) {
                    // 如果超过最大层级，将其当作普通文本处理
                    if (currentHeader != null) {
                        currentContent.add(line);
                    } else {
                        rootContent.add(line);
                    }
                    continue;
                }

                // 如果遇到新标题，先保存之前的内容
                if (currentHeader != null) {
                    // 保存之前的标题和内容
                    String contentText = String.join("\n", currentContent).trim();
                    currentHeader.setContent(contentText);
                    currentHeader.setOriginalLevel(currentHeader.getLevel());
                    allHeaders.add(currentHeader);
                    currentContent = new ArrayList<>();
                }

                // 提取标题编号 - 改进的编号提取逻辑
                Pattern titleNumberPattern = Pattern.compile("^(\\d+(?:\\.\\d+)*)\\s*(.*)$");
                Matcher titleNumberMatcher = titleNumberPattern.matcher(titleText);
                String blockNumber = "";

                if (titleNumberMatcher.find()) {
                    blockNumber = titleNumberMatcher.group(1);
                    // 标题可能仅包含数字，如 "3"
                    String restOfTitle = titleNumberMatcher.group(2);
                    titleText = !restOfTitle.isEmpty() ? restOfTitle : blockNumber;
                }

                currentHeader = new HeaderInfo(level, titleText, blockNumber);
            } else {
                // 如果尚未遇到任何标题，则内容属于根节点
                if (currentHeader == null) {
                    rootContent.add(line);
                } else {
                    currentContent.add(line);
                }
            }
        }

        // 处理最后一个标题的内容
        if (currentHeader != null) {
            String contentText = String.join("\n", currentContent).trim();
            currentHeader.setContent(contentText);
            currentHeader.setOriginalLevel(currentHeader.getLevel());
            allHeaders.add(currentHeader);
        }

        // 设置根节点内容
        rootNode.setPageContent(String.join("\n", rootContent).trim());

        // 阶段2: 创建所有节点对象
        // 首先按标题编号排序，确保父节点在子节点之前处理
        allHeaders.sort(Comparator.comparing(h -> h.getBlockNumber() != null ? h.getBlockNumber() : ""));

        // 编号到节点ID的映射，用于快速查找父节点
        Map<String, String> numberToNodeId = new HashMap<>();

        // 创建所有节点对象
        for (HeaderInfo header : allHeaders) {
            int level = header.getLevel();
            String title = header.getTitle();
            String number = header.getBlockNumber();
            String content = header.getContent();
            int originalLevel = header.getOriginalLevel();

            // 创建新节点
            MyNode newNode = new MyNode(
                    content,
                    level,
                    title,
                    number
            );

            // 将原始级别保存到元数据中，以便后续需要时使用
            newNode.getMetadata().put("original_level", originalLevel);

            nodesDict.put(newNode.getId(), newNode);

            // 记录编号到节点ID的映射
            if (number != null && !number.isEmpty()) {
                numberToNodeId.put(number, newNode.getId());
            }

            // 根据编号确定父节点
            if (number != null && !number.isEmpty() && number.contains(".")) {
                // 提取父编号，如 "3.1" -> "3"
                String parentNumber = number.substring(0, number.lastIndexOf('.'));
                if (numberToNodeId.containsKey(parentNumber)) {
                    // 找到父节点
                    String parentId = numberToNodeId.get(parentNumber);
                    newNode.setParentId(parentId);
                    nodesDict.get(parentId).addChild(newNode.getId());
                    continue;
                }
            }

            // 如果没有通过编号找到父节点，则根据级别关系确定
            if (level == 1) {
                // 一级标题直接挂到根节点
                newNode.setParentId(rootNode.getId());
                rootNode.addChild(newNode.getId());
            } else {
                // 寻找合适的上一级标题作为父节点
                boolean parentFound = false;
                for (int i = allHeaders.size() - 1; i >= 0; i--) {
                    HeaderInfo prevHeader = allHeaders.get(i);
                    int prevLevel = prevHeader.getLevel();
                    String prevNumber = prevHeader.getBlockNumber();

                    // 跳过当前标题及其后面的标题
                    if (i >= allHeaders.indexOf(header)) {
                        continue;
                    }

                    if (prevLevel == level - 1) {
                        if (prevNumber != null && !prevNumber.isEmpty() && numberToNodeId.containsKey(prevNumber)) {
                            String parentId = numberToNodeId.get(prevNumber);
                            newNode.setParentId(parentId);
                            nodesDict.get(parentId).addChild(newNode.getId());
                            parentFound = true;
                            break;
                        }
                    }
                }

                // 如果仍未找到父节点，则连接到根节点
                if (!parentFound) {
                    newNode.setParentId(rootNode.getId());
                    rootNode.addChild(newNode.getId());
                }
            }
        }

        return new AbstractMap.SimpleEntry<>(rootNode, nodesDict);
    }

    /**
     * 构建文档的层级结构
     *
     * @param markdownText  Markdown文本内容
     * @param documentTitle 文档标题
     * @param maxLevel      最大解析的标题层级，超过此层级的内容作为上级标题内容处理，设置为null则不限制
     * @return 根节点和所有节点的字典
     */
    public static Map.Entry<MyNode, Map<String, MyNode>> buildDocumentStructure(
            String markdownText, String documentTitle, Integer maxLevel) {

        try {
            return parseMarkdownStructure(markdownText, documentTitle, maxLevel);
        } catch (Exception e) {
            System.err.println("解析文档结构时出错: " + e.getMessage());
            // 创建一个基本的根节点作为后备
            MyNode rootNode = new MyNode(
                    // 将全部内容放入根节点
                    markdownText,
                    0,
                    documentTitle
            );
            Map<String, MyNode> nodesDict = new HashMap<>();
            nodesDict.put(rootNode.getId(), rootNode);
            return new AbstractMap.SimpleEntry<>(rootNode, nodesDict);
        }
    }

    /**
     * 打印文档结构，确保同级标题缩进一致且按正确数值顺序排列
     *
     * @param rootNode   根节点
     * @param nodesDict  所有节点的字典
     * @param baseIndent 基础缩进级别
     */
    public static void printDocumentStructure(MyNode rootNode, Map<String, MyNode> nodesDict, int baseIndent) {
        // 根据节点级别确定实际缩进
        int actualIndent = baseIndent + rootNode.getLevel();
        StringBuilder prefix = new StringBuilder();
        prefix.append("  ".repeat(Math.max(0, actualIndent)));

        // 获取标题原始级别（如果有）
        int originalLevel = rootNode.getMetadata().containsKey("original_level") ?
                (int) rootNode.getMetadata().get("original_level") : rootNode.getLevel();

        // 显示块编号（如果有）
        String blockInfo = rootNode.getMetadata().containsKey("block_number") ?
                " [块 " + rootNode.getMetadata().get("block_number") + "]" : "";

        System.out.println(prefix + "- " + rootNode.getTitle() + blockInfo +
                " (级别: " + rootNode.getLevel() + ", 原始级别: " + originalLevel + ")");

        // 显示内容摘要（最多100个字符）
        String contentPreview = rootNode.getPageContent().length() > 100 ?
                rootNode.getPageContent().substring(0, 100) + "..." : rootNode.getPageContent();
        if (!contentPreview.isEmpty()) {
            System.out.println(prefix + "  内容: " + contentPreview);
        }

        // 获取所有子节点
        List<MyNode> childNodes = new ArrayList<>();
        for (String childId : rootNode.getChildren()) {
            childNodes.add(nodesDict.get(childId));
        }

        // 对子节点进行排序
        childNodes.sort((node1, node2) -> {
            // 先按级别排序
            int levelCompare = Integer.compare(node1.getLevel(), node2.getLevel());
            if (levelCompare != 0) {
                return levelCompare;
            }

            String blockNumber1 = (String) node1.getMetadata().getOrDefault("block_number", "");
            String blockNumber2 = (String) node2.getMetadata().getOrDefault("block_number", "");

            // 如果两者都有块编号，则按块编号排序
            if (!blockNumber1.isEmpty() && !blockNumber2.isEmpty()) {
                return compareBlockNumbers(blockNumber1, blockNumber2);
            }

            // 尝试从标题中提取数字前缀
            String title1 = node1.getTitle();
            String title2 = node2.getTitle();

            return naturalCompare(title1, title2);
        });

        // 递归打印子节点
        for (MyNode childNode : childNodes) {
            printDocumentStructure(childNode, nodesDict, baseIndent);
        }
    }

    /**
     * 比较两个块编号的大小
     */
    private static int compareBlockNumbers(String num1, String num2) {
        // 将块编号拆分为数字部分
        String[] parts1 = num1.split("\\.");
        String[] parts2 = num2.split("\\.");

        // 逐部分比较
        for (int i = 0; i < Math.min(parts1.length, parts2.length); i++) {
            try {
                int n1 = Integer.parseInt(parts1[i]);
                int n2 = Integer.parseInt(parts2[i]);
                int comp = Integer.compare(n1, n2);
                if (comp != 0) {
                    return comp;
                }
            } catch (NumberFormatException e) {
                // 如果解析失败，则按字符串比较
                int comp = parts1[i].compareTo(parts2[i]);
                if (comp != 0) {
                    return comp;
                }
            }
        }

        // 如果公共部分相同，则比较长度
        return Integer.compare(parts1.length, parts2.length);
    }

    /**
     * 自然排序比较两个字符串
     */
    private static int naturalCompare(String s1, String s2) {
        Pattern numberPattern = Pattern.compile("^(\\d+(?:\\.\\d+)*)");
        Matcher m1 = numberPattern.matcher(s1);
        Matcher m2 = numberPattern.matcher(s2);

        boolean hasNumber1 = m1.find();
        boolean hasNumber2 = m2.find();

        // 如果两者都有数字前缀
        if (hasNumber1 && hasNumber2) {
            return compareBlockNumbers(m1.group(1), m2.group(1));
        }

        // 如果只有一个有数字前缀，有数字的优先
        if (hasNumber1) {
            return -1;
        }
        if (hasNumber2) {
            return 1;
        }

        // 都没有数字前缀，按字母顺序
        return s1.compareTo(s2);
    }

    /**
     * 辅助类用于存储标题信息
     */
    @Data
    private static class HeaderInfo {
        private int level;
        private String title;
        private String blockNumber;
        private String content;
        private int originalLevel;

        public HeaderInfo(int level, String title, String blockNumber) {
            this.level = level;
            this.title = title;
            this.blockNumber = blockNumber;
        }
    }
}