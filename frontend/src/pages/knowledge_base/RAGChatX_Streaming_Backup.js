// RAGChatX with Streaming Markdown Support - 修复版本
import React, { useEffect, useRef, useState } from "react";
import {
    Avatar,
    Button,
    Card,
    Col,
    Input,
    message,
    Row,
    Spin,
    Tag,
    Typography,
} from "antd";
import {
    BookOutlined,
    RobotOutlined,
    SendOutlined,
    UserOutlined,
} from "@ant-design/icons";
import { Bubble } from "@ant-design/x";
import { useNavigate, useParams } from "react-router-dom";
import api, { knowledgeBaseAPI } from "../../services/api";
import markdownit from "markdown-it";
import "../../styles/components/markdown.css";
import "../../styles/components/ragChat.css";

const { Title, Paragraph, Text } = Typography;

// 初始化 markdown-it 渲染器
const md = markdownit({ html: true, breaks: true });

// 自定义消息内容渲染组件
const CustomBubbleMessageRender = ({ content, sources = [] }) => {
  if (!content || content.trim() === '') {
    return (
      <Typography>
        <div style={{ color: '#999', fontStyle: 'italic' }}>等待内容...</div>
      </Typography>
    );
  }
  
  try {
    const htmlContent = md.render(content);
    return (
      <>
        <Typography>
          <div 
            className="markdown-content" 
            dangerouslySetInnerHTML={{ __html: htmlContent }} 
          />
        </Typography>
        
        {/* 文档来源 */}
        {sources && sources.length > 0 && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f0f0f0' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
              📚 参考文档:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {sources.slice(0, 3).map((source, index) => (
                <Tag 
                  key={index} 
                  size="small" 
                  color="blue"
                  style={{ fontSize: '11px', margin: 0 }}
                >
                  {source.fileName || `文档${index + 1}`}
                </Tag>
              ))}
              {sources.length > 3 && (
                <Tag size="small" style={{ fontSize: '11px', margin: 0 }}>
                  +{sources.length - 3}
                </Tag>
              )}
            </div>
          </div>
        )}
      </>
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

// 自定义流式消息气泡组件 - 使用Ant Design X原生组件
const StreamingBubble = ({ 
  content, 
  isTyping, 
  placement = 'start',
  sources = [],
  error = false,
  messageId
}) => {
  const isUser = placement === 'end';
  
  // 对于用户消息，使用简单的自定义组件
  if (isUser) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        gap: '12px',
        marginBottom: '16px',
        flexDirection: 'row-reverse'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          backgroundColor: '#1890ff',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <UserOutlined />
        </div>
        
        <div style={{
          backgroundColor: '#1890ff',
          color: 'white',
          borderRadius: '12px',
          padding: '12px 16px',
          maxWidth: '70%',
        }}>
          <Typography style={{ color: 'white', margin: 0 }}>
            <div>{content}</div>
          </Typography>
        </div>
      </div>
    );
  }

  // 对于AI消息，使用Ant Design X的Bubble组件
  return (
    <div data-message-id={messageId} style={{ marginBottom: '16px' }}>
      <Bubble
        avatar={{ 
          icon: <RobotOutlined />,
          style: { 
            backgroundColor: '#52c41a',
            color: 'white'
          }
        }}
        content={content}
        typing={isTyping ? { 
          step: 3,      // 每次显示3个字符，减少闪烁
          interval: 100  // 100ms间隔，减慢打字速度
        } : false}
        placement="start"
        messageRender={(content) => (
          <CustomBubbleMessageRender content={content} sources={sources} />
        )}
        style={{
          border: error ? '1px solid #ff4d4f' : 'none'
        }}
      />
    </div>
  );
};

const RAGChatXStreamingFixed = () => {
  // 调试模式开关
  const DEBUG_MODE = true;

  const { id: knowledgeBaseId } = useParams();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();

  // 状态管理
  const [knowledgeBase, setKnowledgeBase] = useState(null);
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesContainerRef = useRef(null);

  // 测试数据控制
  const [useTestData, setUseTestData] = useState(true);

  // 测试流式响应数据
  const testStreamingData = `# 知识库问答系统分析报告

## 📊 系统概览

基于您的知识库内容，我为您分析了以下关键信息：

### 核心功能特性

1. **智能检索能力**
   - 支持语义搜索和关键词匹配
   - 文档相关性评分机制
   - 多维度内容索引

2. **RAG技术架构**
   \`\`\`
   用户查询 → 向量检索 → 内容召回 → 生成回答
   \`\`\`

3. **支持的文档格式**
   - PDF文档处理
   - Word文档解析  
   - Markdown文件
   - 纯文本内容

### 📈 性能指标

| 指标 | 数值 | 状态 |
|------|------|------|
| 平均响应时间 | 1.2s | 🟢 优秀 |
| 检索准确率 | 94.5% | 🟢 优秀 |
| 系统可用性 | 99.9% | 🟢 稳定 |

### 💡 优化建议

> **提示**: 为了获得更好的问答效果，建议：

- ✅ 上传高质量的文档内容
- ✅ 定期更新知识库内容
- ✅ 使用具体明确的问题描述
- ✅ 充分利用多轮对话功能

这个系统可以帮助您快速从大量文档中找到所需信息，提高工作效率。`;

  // 测试用消息发送 - 使用Ant Design X的typing特性
  const handleTestStreaming = async () => {
    if (!input.trim() || sending) return;

    const userQuestion = input.trim();
    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userQuestion,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setSending(true);

    // 创建AI回复消息
    const aiMessageId = `ai-${Date.now()}`;
    const initialAiMessage = {
      id: aiMessageId,
      role: "assistant",
      content: testStreamingData, // 直接设置完整内容，让Bubble的typing属性处理动画
      timestamp: new Date().toISOString(),
      sources: [
        { fileName: "产品手册.pdf", confidence: 0.95 },
        { fileName: "技术文档.md", confidence: 0.88 },
        { fileName: "用户指南.docx", confidence: 0.82 }
      ],
      isStreaming: true,
    };

    setMessages(prev => [...prev, initialAiMessage]);

    // 模拟流式完成
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === aiMessageId 
            ? { ...msg, isStreaming: false }
            : msg
        )
      );
      setSending(false);
    }, 8000); // 8秒后结束，给typing动画足够时间
  };

  // 处理消息发送
  const handleSendMessage = () => {
    if (useTestData) {
      handleTestStreaming();
    } else {
      // 这里可以添加真实API调用逻辑
      message.info("真实API调用功能待实现");
    }
  };

  // 处理输入框回车事件
  const handleInputKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 获取知识库列表
  const fetchKnowledgeBases = React.useCallback(async () => {
    setListLoading(true);
    try {
      const response = await knowledgeBaseAPI.getKnowledgeBases();
      
      if (response.data && Array.isArray(response.data)) {
        const kbs = response.data;
        kbs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setKnowledgeBases(kbs);
      } else if (response.data && response.data.code === 200) {
        const kbs = response.data.data || [];
        kbs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setKnowledgeBases(kbs);
      } else {
        messageApi.error(response.data?.message || "获取知识库列表失败");
        setKnowledgeBases([]);
      }
    } catch (error) {
      console.error("获取知识库列表失败:", error);
      messageApi.error("获取知识库列表失败，请稍后再试");
      setKnowledgeBases([]);
    } finally {
      setListLoading(false);
    }
  }, [messageApi]);

  // 渲染消息列表
  const renderMessages = React.useCallback(() => {
    return messages.map((message) => (
      <StreamingBubble
        key={message.id}
        messageId={message.id}
        content={message.content}
        isTyping={message.isStreaming}
        placement={message.role === 'user' ? 'end' : 'start'}
        sources={message.sources}
        error={message.error}
      />
    ));
  }, [messages]);

  // 自动滚动到消息底部
  const scrollToBottom = React.useCallback(() => {
    const container = messagesContainerRef.current;
    if (container) {
      requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      });
    }
  }, []);

  // 组件挂载时获取知识库列表
  useEffect(() => {
    fetchKnowledgeBases();
  }, [fetchKnowledgeBases]);

  // 消息变化时滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 显示加载状态
  if (listLoading) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <Spin size="large" tip="加载知识库列表中..." />
      </div>
    );
  }

  return (
    <div>
      {contextHolder}
      
      {/* 标题区域 */}
      <div
        style={{
          background: "#52c41a",
          borderRadius: "6px",
          padding: "16px 24px",
          color: "white",
          marginBottom: "24px",
        }}
      >
        <Title level={4} style={{ color: "white", margin: 0 }}>
          知识库问答 (流式渲染修复版)
        </Title>
        <Paragraph
          style={{
            color: "rgba(255, 255, 255, 0.85)",
            fontSize: "14px",
            marginBottom: 0,
          }}
        >
          基于RAG技术的智能问答系统，使用Ant Design X原生typing特性
        </Paragraph>
      </div>

      {/* 测试模式切换 */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Text strong>测试模式:</Text>
          <Button 
            type={useTestData ? "primary" : "default"}
            onClick={() => setUseTestData(true)}
            size="small"
          >
            使用测试数据
          </Button>
          <Button 
            type={!useTestData ? "primary" : "default"}
            onClick={() => setUseTestData(false)}
            size="small"
          >
            使用真实API
          </Button>
          <Text type="secondary">
            {useTestData ? "当前使用模拟数据，展示原生typing效果" : "当前连接真实后端API"}
          </Text>
        </div>
      </Card>

      {/* 主要对话界面 */}
      <Card
        title={
          <div style={{ display: "flex", alignItems: "center" }}>
            <Avatar
              icon={<BookOutlined />}
              style={{ backgroundColor: "#52c41a", marginRight: 8 }}
            />
            <span>智能问答对话</span>
          </div>
        }
        style={{ 
          borderRadius: "8px", 
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
          minHeight: '600px'
        }}
      >
        {/* 消息显示区域 */}
        <div 
          ref={messagesContainerRef}
          style={{ 
            height: '500px', 
            overflowY: 'auto', 
            overflowX: 'hidden',
            padding: '16px 0',
            marginBottom: '16px',
          }}
        >
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '100px 20px', color: '#999' }}>
              <RobotOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
              <div>开始与AI助手对话吧！</div>
              <div style={{ fontSize: '14px', marginTop: '8px' }}>
                现在使用Ant Design X原生typing特性，无闪烁流式输出
              </div>
            </div>
          ) : (
            renderMessages()
          )}
        </div>

        {/* 输入区域 */}
        <div style={{ 
          borderTop: '1px solid #f0f0f0', 
          paddingTop: '16px',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-end'
        }}>
          <Input.TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleInputKeyPress}
            placeholder="输入您的问题..."
            autoSize={{ minRows: 1, maxRows: 4 }}
            disabled={sending}
            style={{ flex: 1 }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={sending}
            onClick={handleSendMessage}
            disabled={!input.trim()}
          >
            发送
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default RAGChatXStreamingFixed;
