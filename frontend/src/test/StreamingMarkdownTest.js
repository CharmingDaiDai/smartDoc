import { UserOutlined, RobotOutlined } from '@ant-design/icons';
import { Bubble } from '@ant-design/x';
import { Typography, Button, Space, Card } from 'antd';
import markdownit from 'markdown-it';
import React from 'react';

const md = markdownit({ html: true, breaks: true });

// 测试用的markdown内容
const testMarkdowns = [
  {
    title: "基础Markdown测试",
    content: `
> 这是一个引用块，用于测试markdown渲染效果！

**粗体文本** 和 *斜体文本*

链接测试: [Ant Design X](https://x.ant.design)

代码块测试:
\`\`\`javascript
const hello = () => {
  console.log("Hello World!");
};
\`\`\`

列表测试:
- 第一项
- 第二项
- 第三项
`.trim()
  },
  {
    title: "技术文档测试",
    content: `
# React组件开发指南

## 1. 组件设计原则

### 1.1 单一职责原则
每个组件应该只负责一个功能模块。

### 1.2 可复用性
组件应该设计得足够通用，可以在不同场景下使用。

## 2. 代码示例

\`\`\`jsx
import React, { useState } from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <h2>计数器: {count}</h2>
      <button onClick={() => setCount(count + 1)}>
        增加
      </button>
    </div>
  );
};
\`\`\`

## 3. 最佳实践

| 实践 | 描述 | 重要性 |
|------|------|--------|
| Props验证 | 使用PropTypes进行类型检查 | ⭐⭐⭐ |
| 状态管理 | 合理使用useState和useEffect | ⭐⭐⭐⭐ |
| 性能优化 | 使用memo和useMemo | ⭐⭐⭐ |
`.trim()
  },
  {
    title: "流式响应模拟",
    content: `
## 📊 数据分析结果

### 关键发现
通过对用户数据的深入分析，我们发现了以下几个重要趋势：

1. **用户活跃度提升**
   - 日活跃用户增长 **23.5%**
   - 平均会话时长增加 **18分钟**

2. **功能使用情况**
   - 知识库搜索功能使用率: **85%**
   - AI问答功能满意度: **4.7/5.0**

### 技术指标

\`\`\`json
{
  "response_time": "120ms",
  "accuracy": "94.2%",
  "uptime": "99.9%",
  "user_satisfaction": 4.7
}
\`\`\`

### 改进建议

> 💡 **提示**: 基于数据分析，建议重点优化以下功能模块

- [ ] 搜索结果相关性算法优化
- [ ] 响应速度进一步提升
- [ ] 用户界面体验优化
- [x] 流式输出功能实现
`.trim()
  }
];

// 自定义消息渲染组件
const CustomMessageRender = ({ content }) => {
  console.log('CustomMessageRender 接收到的内容:', content?.length || 0, content?.substring(0, 100) || 'empty');
  
  if (!content || content.trim() === '') {
    return <Typography><div>等待内容...</div></Typography>;
  }
  
  try {
    const htmlContent = md.render(content);
    return (
      <Typography>
        <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
      </Typography>
    );
  } catch (error) {
    console.error('Markdown渲染错误:', error);
    return (
      <Typography>
        <div style={{ color: 'red' }}>
          Markdown渲染出错: {error.message}
        </div>
      </Typography>
    );
  }
};

// 自定义流式消息组件
const StreamingBubble = ({ content, isTyping, avatar }) => {
  const [displayContent, setDisplayContent] = React.useState('');
  
  React.useEffect(() => {
    setDisplayContent(content);
    console.log('StreamingBubble 更新内容:', content?.length || 0);
  }, [content]);

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'flex-start', 
      gap: '12px',
      marginBottom: '16px'
    }}>
      {/* Avatar */}
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        backgroundColor: avatar?.style?.backgroundColor || '#1890ff',
        color: avatar?.style?.color || 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        {avatar?.icon}
      </div>
      
      {/* Content */}
      <div style={{
        backgroundColor: '#f6f7f9',
        borderRadius: '12px',
        padding: '12px 16px',
        maxWidth: '70%',
        position: 'relative'
      }}>
        {displayContent && displayContent.trim() ? (
          <CustomMessageRender content={displayContent} />
        ) : (
          <Typography>
            <div style={{ color: '#999' }}>
              {isTyping ? '正在输入...' : '等待内容...'}
            </div>
          </Typography>
        )}
        
        {/* Typing indicator */}
        {isTyping && (
          <div style={{ 
            marginTop: '8px', 
            color: '#999', 
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>●</span>
            <span>●</span>
            <span>●</span>
          </div>
        )}
      </div>
    </div>
  );
};

const StreamingMarkdownTest = () => {
  const [currentTestIndex, setCurrentTestIndex] = React.useState(0);
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [streamedContent, setStreamedContent] = React.useState('');
  const [renderKey, setRenderKey] = React.useState(0);
  const [forceRenderKey, setForceRenderKey] = React.useState(0);

  const currentTest = testMarkdowns[currentTestIndex];

  // 监听streamedContent变化，强制重新渲染
  React.useEffect(() => {
    if (streamedContent) {
      setForceRenderKey(prev => prev + 1);
    }
  }, [streamedContent]);

  // 模拟流式输出
  const startStreaming = React.useCallback(() => {
    if (isStreaming) return;
    
    setIsStreaming(true);
    setStreamedContent('');
    
    const content = currentTest.content;
    let currentIndex = 0;
    
    const streamInterval = setInterval(() => {
      if (currentIndex >= content.length) {
        clearInterval(streamInterval);
        setIsStreaming(false);
        console.log('流式输出完成，最终内容长度:', currentIndex);
        return;
      }
      
      // 每次添加1-3个字符，模拟真实的流式输出
      const chunkSize = Math.floor(Math.random() * 3) + 1;
      const nextChunk = content.slice(currentIndex, currentIndex + chunkSize);
      
      setStreamedContent(prev => {
        const newContent = prev + nextChunk;
        console.log('流式更新，当前长度:', newContent.length, '新增内容:', nextChunk);
        return newContent;
      });
      currentIndex += chunkSize;
    }, 50); // 50ms间隔，模拟快速输出
    
    // 保存interval引用以便清理
    return () => clearInterval(streamInterval);
  }, [currentTest.content, isStreaming]);

  // 停止流式输出
  const stopStreaming = () => {
    setIsStreaming(false);
    setStreamedContent(currentTest.content);
  };

  // 重置测试
  const resetTest = () => {
    setIsStreaming(false);
    setStreamedContent('');
    setRenderKey(prev => prev + 1);
    setForceRenderKey(0);
    console.log('测试已重置');
  };

  // 切换测试内容
  const switchTest = (index) => {
    setCurrentTestIndex(index);
    resetTest();
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <Card title="流式Markdown渲染测试" style={{ marginBottom: '20px' }}>
        <Space wrap style={{ marginBottom: '20px' }}>
          {testMarkdowns.map((test, index) => (
            <Button
              key={index}
              type={index === currentTestIndex ? 'primary' : 'default'}
              onClick={() => switchTest(index)}
              disabled={isStreaming}
            >
              {test.title}
            </Button>
          ))}
        </Space>
        
        <Space style={{ marginBottom: '20px' }}>
          <Button 
            type="primary" 
            onClick={startStreaming}
            disabled={isStreaming}
          >
            开始流式输出
          </Button>
          <Button 
            onClick={stopStreaming}
            disabled={!isStreaming}
          >
            停止输出
          </Button>
          <Button 
            onClick={resetTest}
            disabled={isStreaming}
          >
            重置测试
          </Button>
        </Space>

        <div style={{ 
          border: '1px solid #d9d9d9', 
          borderRadius: '6px', 
          padding: '16px',
          minHeight: '400px',
          backgroundColor: '#fafafa'
        }}>
          <div key={`${renderKey}-${forceRenderKey}`}>
            <StreamingBubble
              content={streamedContent || '点击"开始流式输出"查看效果...'}
              isTyping={isStreaming}
              avatar={{ 
                icon: <RobotOutlined />,
                style: { backgroundColor: '#52c41a', color: 'white' }
              }}
            />
          </div>
        </div>

        <Card size="small" style={{ marginTop: '20px' }} title="当前测试信息">
          <p><strong>测试内容:</strong> {currentTest.title}</p>
          <p><strong>是否正在流式输出:</strong> {isStreaming ? '是' : '否'}</p>
          <p><strong>已输出字符数:</strong> {streamedContent.length} / {currentTest.content.length}</p>
          <p><strong>输出进度:</strong> {currentTest.content.length > 0 ? Math.round((streamedContent.length / currentTest.content.length) * 100) : 0}%</p>
          <p><strong>渲染Key:</strong> {renderKey}-{forceRenderKey}</p>
          <p><strong>实时渲染状态:</strong> {streamedContent && streamedContent.trim() ? '已启用' : '等待内容'}</p>
        </Card>
      </Card>
    </div>
  );
};

export default StreamingMarkdownTest;
