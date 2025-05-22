package com.mtmn.smartdoc.common;

import lombok.Data;
import lombok.Getter;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * @author charmingdaidai
 */
@Data
public class MyNode {
    private String id;
    private String pageContent;
    private int level;
    private String title;
    private String parentId;
    private List<String> children;
    private Map<String, Object> metadata;

    public MyNode(String pageContent, int level, String title) {
        this(pageContent, level, title, null);
    }

    public MyNode(String pageContent, int level, String title, String blockNumber) {
        this.id = UUID.randomUUID().toString();
        this.pageContent = pageContent;
        this.level = level;
        this.title = title;
        this.children = new ArrayList<>();
        this.metadata = new HashMap<>();

        if (blockNumber != null && !blockNumber.isEmpty()) {
            this.metadata.put("block_number", blockNumber);
        }
    }

    public void addChild(String childId) {
        this.children.add(childId);
    }
}