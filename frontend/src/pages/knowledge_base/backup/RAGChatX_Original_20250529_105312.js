import React, {useEffect, useRef, useState} from "react";
import {Avatar, Button, Card, Col, Divider, Empty, Input, message, Row, Select, Spin, Typography,} from "antd";
import {BookOutlined, QuestionCircleOutlined, RobotOutlined, SendOutlined, UserOutlined,} from "@ant-design/icons";
import {Bubble, Conversations, Welcome} from "@ant-design/x";
import {useNavigate, useParams} from "react-router-dom";
import api, {knowledgeBaseAPI} from "../../services/api";
import {getMethodConfig} from "../../config/ragConfig";
import markdownit from "markdown-it";
import "../../styles/components/markdown.css";
import "../../styles/components/ragChat.css";
import RagMethodParams from "../../components/knowledge_base/RagMethodParams";
import {createAuthEventSource} from "../../utils/eventSourceAuth";

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

// 初始化 markdown-it 渲染器
const md = markdownit({ html: true, breaks: true });

  const RAGChatX = () => {
  // 调试模式开关 - 生产环境应设为false
  const DEBUG_MODE = false;

  const { id: knowledgeBaseId } = useParams();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();

  // 状态管理
  const [knowledgeBase, setKnowledgeBase] = useState(null);
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [kbSelectLoading, setKbSelectLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  // RAG 方法相关状态
  const [loadingMethodDetails, setLoadingMethodDetails] = useState(false);
  const [ragParams, setRagParams] = useState({});
  const [ragMethodType, setRagMethodType] = useState(null);

  // 获取知识库列表
  const fetchKnowledgeBases = React.useCallback(async () => {
    setListLoading(true);
    setKbSelectLoading(true);
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
      setKbSelectLoading(false);
    }
  }, [messageApi]);

  // 获取RAG方法详情
  const fetchRagMethodDetails = React.useCallback((methodId) => {
    if (!methodId) {
      setRagParams({});
      return;
    }

    setLoadingMethodDetails(true);
    try {
      const methodConfig = getMethodConfig(methodId);
      if (methodConfig) {
        setRagMethodType(methodId);
        const initialSearchParams = { ...methodConfig.searchParams };
        setRagParams(initialSearchParams);
      } else {
        messageApi.warning("未找到RAG方法配置信息，将使用默认参数");
        setRagParams({});
      }
    } catch (error) {
      console.error("获取RAG方法详情失败:", error);
      messageApi.error("获取RAG方法参数失败，将使用默认参数");
      setRagParams({});
    } finally {
      setLoadingMethodDetails(false);
    }
  }, [messageApi]);

  // 获取知识库详情
  const fetchKnowledgeBaseDetails = React.useCallback(async (id) => {
    if (!id) {
      setKnowledgeBase(null);
      setRagParams({});
      return;
    }

    setDetailsLoading(true);
    try {
      const response = await knowledgeBaseAPI.getKnowledgeBase(id);
      
        console.log(response.data)

      if (response) {
        const kb = response.data;
        setKnowledgeBase(kb);
        
        if (kb.ragMethod) {
          fetchRagMethodDetails(kb.ragMethod);
        } else {
          setRagParams({});
        }
      } else {
        messageApi.error(response.message || "获取知识库详情失败");
        setKnowledgeBase(null);
      }
    } catch (error) {
      console.error("获取知识库详情失败:", error);
      messageApi.error("获取知识库详情失败，请稍后再试");
      setKnowledgeBase(null);
    } finally {
      setDetailsLoading(false);
    }
  }, [messageApi, fetchRagMethodDetails]);

  // 处理知识库切换
  const handleKnowledgeBaseChange = (selectedId) => {
    const selectedKb = knowledgeBases.find(kb => kb.id === selectedId);
    if (selectedKb) {
      setMessages([]);
      fetchKnowledgeBaseDetails(selectedId);
    }
  };

  // 处理RAG参数变化
  const handleRagParamsChange = (newParams) => {
    setRagParams(newParams);
  };

  // 转换消息格式为 Ant Design X 需要的格式
  const convertMessagesToAntDX = (messages) => {
    if (DEBUG_MODE) {
      console.log('转换消息到AntDX格式:', messages.length, '条消息');
      messages.forEach((msg, idx) => {
        console.log(`消息${idx}:`, {
          id: msg.id,
          role: msg.role,
          content: msg.content?.substring(0, 30),
          isStreaming: msg.isStreaming,
          sourcesCount: msg.sources?.length || 0
        });
      });
    }
    
    return messages.map((msg, index) => ({
      id: msg.id || `msg-${index}`,
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
      status: msg.isStreaming ? 'loading' : msg.error ? 'error' : 'success',
      sources: msg.sources || [],
      isStreaming: msg.isStreaming
    }));
  };

  // 构建API请求参数 - 参考RAGChat实现
  const buildApiRequestParams = (question, kb, methodType, params) => {
    const apiUrl = buildApiUrlForMethod(kb.id, methodType || kb.ragMethod);
    const queryParams = new URLSearchParams();
    queryParams.append("question", question);

    // 根据方法类型添加参数
    const topk = params["top-k"] || 5;
    const maxRes = params["max-res"] || 10;
    const queryRewriting = params["query-rewriting"] || false;
    const queryDecomposition = params["query-decomposition"] || false;

    // 附加参数取决于RAG方法
    const methodId = methodType || kb.ragMethod;
    if (methodId === "naive") {
      queryParams.append("topk", topk);
      queryParams.append("query_rewriting", queryRewriting);
      queryParams.append("query_decomposition", queryDecomposition);
    } else if (methodId === "hisem" || methodId === "hisem-tree") {
      queryParams.append("max_res", maxRes);
      queryParams.append("query_rewriting", queryRewriting);
      queryParams.append("query_decomposition", queryDecomposition);
    } else {
      // 默认参数
      queryParams.append("topk", topk);
    }

    return { apiUrl, queryParams };
  };

  // 根据方法类型构建API URL - 参考RAGChat实现
  const buildApiUrlForMethod = (kbId, methodId) => {
    let apiUrl;

    switch (methodId) {
      case "naive":
        apiUrl = `/api/kb/chat/naive/${kbId}`;
        break;
      case "hisem":
        apiUrl = `/api/kb/chat/hisem/${kbId}`;
        break;
      case "hisem-tree":
        apiUrl = `/api/kb/chat/hisem-tree/${kbId}`;
        break;
      default:
        apiUrl = `/api/kb/chat/kbqa/${kbId}`;
    }

    // 确保以斜杠开头
    if (apiUrl && !apiUrl.startsWith("/")) {
      apiUrl = "/" + apiUrl;
    }

    return apiUrl;
  };

  // 处理流式响应 - 参考RAGChat实现
  const handleStreamResponse = async () => {
    if (!input.trim() || sending || !knowledgeBase) return;

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

    // 创建初始的AI回复消息
    const aiMessageId = new Date().getTime();
    const initialAiMessage = {
      id: aiMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      sources: [],
      isStreaming: true,
    };

    setMessages(prev => [...prev, initialAiMessage]);

    try {
      // 构建API URL和参数 - 使用RAGChat的方式
      const { apiUrl, queryParams } = buildApiRequestParams(
        userQuestion,
        knowledgeBase,
        ragMethodType,
        ragParams
      );

      // 创建完整的URL
      const baseApiUrl = api.defaults.baseURL || "";
      const fullUrl = `${baseApiUrl}${apiUrl}?${queryParams.toString()}`;
      if (DEBUG_MODE) console.log("Streaming API URL:", fullUrl);

      // 创建带认证的EventSource - 使用GET请求
      const eventSource = createAuthEventSource(fullUrl);

      let contentBuffer = "";
      let sourcesData = [];

      // 处理SSE消息
      eventSource.onmessage = (event) => {
        try {
          // 处理[DONE]结束标记
          if (
            typeof event.data === "string" &&
            (event.data === "[DONE]" || event.data.includes("[DONE]"))
          ) {
            if (DEBUG_MODE) console.log("收到结束标记");
            completeStreamResponse(eventSource, aiMessageId, contentBuffer, sourcesData);
            return;
          }

          // 处理原始数据
          let rawData = event.data;
          if (DEBUG_MODE) console.log("收到原始数据:", rawData);

          // 预处理和解析数据
          const result = parseStreamData(rawData);

          // 如果解析成功并提取到内容
          if (result.success) {
            // 处理文档出处
            if (
              result.docs &&
              Array.isArray(result.docs) &&
              result.docs.length > 0
            ) {
              if (DEBUG_MODE) console.log("处理出处数据");
              sourcesData = processDocSources(result.docs);

              // 更新消息出处
              setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                  msg.id === aiMessageId
                    ? { ...msg, sources: sourcesData }
                    : msg
                )
              );
            }

            // 处理内容增量
            if (result.contentDelta) {
              contentBuffer += result.contentDelta;

              // 更新消息内容
              setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                  msg.id === aiMessageId
                    ? { ...msg, content: contentBuffer }
                    : msg
                )
              );
            }

            // 处理完成事件
            if (result.isCompleted) {
              completeStreamResponse(eventSource, aiMessageId, contentBuffer, sourcesData);
              return;
            }
          }
        } catch (error) {
          if (DEBUG_MODE) console.error("处理SSE消息时出错:", error);
          // 尝试恢复但不中断流
        }
      };

      // 处理错误
      eventSource.onerror = (error) => {
        console.error("流式响应错误:", error);
        handleStreamError(error, eventSource, aiMessageId, contentBuffer, sourcesData, navigate);
      };

    } catch (error) {
      console.error("创建流式连接失败:", error);
      messageApi.error("创建连接失败，请稍后再试");

      // 更新消息为错误状态
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === aiMessageId
            ? {
                ...msg,
                content: "无法创建流式连接，请稍后再试",
                isStreaming: false,
                error: true,
              }
            : msg
        )
      );

      setSending(false);
    }
  };

  // 解析流式数据 - 修复以匹配后端返回格式
  const parseStreamData = (rawData) => {
    const result = {
      success: false,
      contentDelta: null,
      docs: null,
      isCompleted: false,
    };

    if (typeof rawData !== "string") {
      return result;
    }

    // 处理纯文本数据
    rawData = rawData.trim();
    if (rawData.startsWith("data:")) {
      rawData = rawData.substring(5).trim();
    }

    // 检查是否是结束标记
    if (rawData === "[DONE]") {
      result.isCompleted = true;
      return result;
    }

    // 如果是纯文本且非JSON
    if (!rawData.startsWith("{") && !rawData.startsWith("[")) {
      if (rawData !== "[DONE]") {
        result.success = true;
        result.contentDelta = rawData;
      }
      return result;
    }

    // 尝试解析JSON
    try {
      const data = JSON.parse(rawData);
      if (DEBUG_MODE) console.log("解析JSON数据:", data);

      result.success = true;

      // 处理出处数据（第一条消息格式）
      if (data.docs !== undefined && data.docs !== null) {
        result.docs = data.docs;
        if (DEBUG_MODE) console.log("提取到出处数据:", result.docs);
      }

      // 处理内容增量（choices格式）
      if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
        const choice = data.choices[0];
        if (choice.delta && choice.delta.content) {
          result.contentDelta = choice.delta.content;
          if (DEBUG_MODE) console.log("提取到内容增量:", result.contentDelta);
        }
        
        // 检查是否完成
        if (choice.finish_reason === "stop") {
          result.isCompleted = true;
        }
      }

      // 处理直接内容格式（备用）
      if (
        data.content !== undefined &&
        data.content !== null &&
        data.content !== "[DONE]"
      ) {
        result.contentDelta = data.content;
      }

    } catch (error) {
      if (DEBUG_MODE) console.error("JSON解析失败:", error, "原始数据:", rawData);
      
      // JSON解析失败 - 尝试提取内容
      try {
        const contentMatch = rawData.match(/"content":\s*"([^"]*?)"/);
        if (contentMatch && contentMatch[1]) {
          result.success = true;
          result.contentDelta = contentMatch[1]
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
        }
      } catch (e) {
        if (DEBUG_MODE) console.warn("内容提取也失败:", e);
      }
    }

    return result;
  };

  // 处理文档出处数据
  const processDocSources = (docs) => {
    if (!docs || !Array.isArray(docs) || docs.length === 0) {
      return [];
    }

    const firstDoc = docs[0];
    const isComplexFormat = typeof firstDoc === 'string' && 
      (firstDoc.includes(' -> ') || firstDoc.length > 200);

    if (isComplexFormat) {
      return processComplexDocuments(docs);
    }

    return docs
      .map((doc, index) => {
        if (!doc) {
          return {
            id: `source-${index}`,
            number: index + 1,
            title: `出处 [${index + 1}]`,
            content: "无法解析出处内容",
            relevance: "未知",
          };
        }

        if (typeof doc !== "string") {
          try {
            return {
              id: `source-${index}`,
              number: index + 1,
              title: `出处 [${index + 1}]`,
              content: JSON.stringify(doc),
              relevance: "未知",
            };
          } catch (e) {
            return {
              id: `source-${index}`,
              number: index + 1,
              title: `出处 [${index + 1}]`,
              content: "无法解析出处内容",
              relevance: "未知",
            };
          }
        }

        const isLongDocument = doc.length > 300;
        const sourceMatch = doc.match(/出处\s*\[(\d+)\]/);
        const sourceNumber = sourceMatch ? sourceMatch[1] : `${index + 1}`;

        let cleanedContent = doc;
        if (sourceMatch) {
          cleanedContent = doc.replace(/出处\s*\[\d+\]\s*/, "");
        }

        cleanedContent = cleanedContent
          .replace(/\n+/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        if (isLongDocument && cleanedContent.length > 3000) {
          cleanedContent = cleanedContent.substring(0, 3000) + "... (内容已截断)";
        }

        return {
          id: `source-${index}`,
          number: sourceNumber,
          title: `出处 [${sourceNumber}]`,
          content: cleanedContent || "未提供内容",
          relevance: "高",
          isLongDocument: isLongDocument,
        };
      })
      .filter(source => 
        source.content &&
        source.content !== "无法解析出处内容" &&
        source.content !== "未提供内容"
      );
  };

  // 处理复杂文档格式
  const processComplexDocuments = (docs) => {
    if (!docs || !Array.isArray(docs)) {
      return [];
    }

    return docs.map((doc, index) => {
      if (typeof doc !== 'string') {
        return {
          id: `source-${index}`,
          number: index + 1,
          title: `出处 [${index + 1}]`,
          content: JSON.stringify(doc),
          relevance: "未知"
        };
      }

      const parts = doc.split(' -> ');
      let docTitle = '';
      let docPath = '';
      let content = '';

      if (parts.length >= 2) {
        docTitle = parts[0].trim();
        docPath = parts.slice(1, -1).join(' -> ');
        
        const lastPart = parts[parts.length - 1];
        const contentMatch = lastPart.match(/^[^\\n]*\\n(.+)$/s);
        if (contentMatch) {
          content = contentMatch[1].replace(/\\n/g, '\n').replace(/\\r/g, '\r').trim();
        } else {
          content = lastPart.replace(/\\n/g, '\n').replace(/\\r/g, '\r').trim();
        }
      } else {
        content = doc.replace(/\\n/g, '\n').replace(/\\r/g, '\r').trim();
        docTitle = `文档 ${index + 1}`;
      }

      if (content.length > 3000) {
        content = content.substring(0, 3000) + '...';
      }

      return {
        id: `source-${index}`,
        number: index + 1,
        title: docTitle || `出处 [${index + 1}]`,
        path: docPath || '',
        content: content || '无内容',
        relevance: "高"
      };
    }).filter(source => source.content && source.content !== '无内容');
  };

  // 完成流式响应
  const completeStreamResponse = (eventSource, messageId, content, sources) => {
    setMessages(prevMessages =>
      prevMessages.map(msg =>
        msg.id === messageId
          ? {
              ...msg,
              content,
              sources,
              isStreaming: false,
            }
          : msg
      )
    );

    eventSource.close();
    setSending(false);
  };

  // 处理流错误
  const handleStreamError = (error, eventSource, messageId, content, sources, navigate) => {
    if (error.type === "auth_error") {
      messageApi.error("认证失败，请重新登录");
      handleAuthError(eventSource, navigate);
    } else {
      if (error.message && 
          (error.message.includes("NetworkError") ||
           error.message.includes("Failed to fetch") ||
           error.message.includes("Network request failed"))) {
        messageApi.error("网络连接错误，请检查您的网络连接");
      } else {
        messageApi.error("接收回复时发生错误，请重试");
      }
    }

    setMessages(prevMessages =>
      prevMessages.map(msg =>
        msg.id === messageId
          ? {
              ...msg,
              content: content || "接收回复时发生错误，请重试",
              sources,
              isStreaming: false,
              error: true,
            }
          : msg
      )
    );

    eventSource.close();
    setSending(false);
  };

  // 处理认证错误
  const handleAuthError = (eventSource, navigate) => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      api.post("/api/auth/refresh-token", { refreshToken })
        .then((response) => {
          const { accessToken, refreshToken: newRefreshToken } = response.data;
          localStorage.setItem("token", accessToken);
          localStorage.setItem("refreshToken", newRefreshToken);

          if (eventSource.reconnect) {
            eventSource.reconnect();
          }
        })
        .catch(() => {
          messageApi.error("认证失败，请重新登录");
          navigate("/login");
        });
    } else {
      navigate("/login");
    }
  };

  // Markdown 渲染函数
  const renderMarkdown = (content) => {
    if (!content) return null;
    
    return (
      <Typography>
        <div dangerouslySetInnerHTML={{ __html: md.render(content) }} />
      </Typography>
    );
  };

  // 自定义渲染消息气泡
  const renderBubble = ({ item }) => {
    const isUser = item.role === 'user';
    
    if (DEBUG_MODE) {
      console.log('渲染消息:', {
        role: item.role,
        content: item.content?.substring(0, 50),
        isStreaming: item.isStreaming,
        sources: item.sources?.length
      });
    }
    
    return (
      <Bubble
        avatar={{ 
          icon: isUser ? <UserOutlined /> : <RobotOutlined />,
          style: { 
            backgroundColor: isUser ? '#1890ff' : '#52c41a',
            color: 'white'
          }
        }}
        typing={item.isStreaming}
        content={item.content}
        messageRender={isUser ? undefined : renderMarkdown}
        placement={isUser ? 'end' : 'start'}
      />
    );
  };

  // 欢迎组件配置
  const welcomeConfig = {
    title: "知识库问答助手",
    description: "基于RAG技术的智能问答系统，从您的文档中检索精准信息",
    suggestions: [
      "这个文档主要讲什么？",
      "帮我总结一下关键信息",
      "有什么需要注意的要点？",
      "相关的技术规范是什么？"
    ]
  };

  // 组件挂载时获取知识库列表
  useEffect(() => {
    fetchKnowledgeBases();
  }, []);

  // URL参数变化时获取对应知识库详情
  useEffect(() => {
    if (knowledgeBaseId && knowledgeBases.length > 0) {
      const kb = knowledgeBases.find(kb => kb.id === knowledgeBaseId);
      if (kb) {
        setKnowledgeBase(kb);
        fetchKnowledgeBaseDetails(knowledgeBaseId);
      }
    }
  }, [knowledgeBaseId, knowledgeBases]);

  // 自动滚动到消息底部
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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
          知识库问答
        </Title>
        <Paragraph
          style={{
            color: "rgba(255, 255, 255, 0.85)",
            fontSize: "14px",
            marginBottom: 0,
          }}
        >
          基于RAG技术的智能问答系统，从您的文档中检索精准信息
        </Paragraph>
      </div>

      {knowledgeBases.length === 0 ? (
        // 无知识库状态
        <Card style={{ marginTop: 24, borderRadius: "8px", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)" }}>
          <Empty
            description="您还没有创建任何知识库。请先创建知识库，然后才能开始问答。"
            style={{ padding: "40px 0" }}
          >
            <Button type="primary" onClick={() => navigate("/knowledge-base/manage")}>
              管理我的知识库
            </Button>
          </Empty>
        </Card>
      ) : (
        // 主要布局
        <Row gutter={[24, 24]}>
          {/* 左侧: 对话界面 */}
          <Col xs={24} md={16}>
            <Card
              title={
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <Avatar
                      icon={<BookOutlined />}
                      style={{ backgroundColor: "#52c41a", marginRight: 8 }}
                    />
                    <span>
                      知识库问答 {knowledgeBase ? `(${knowledgeBase.name})` : ""}
                    </span>
                  </div>
                  <Select
                    style={{ width: 200 }}
                    placeholder="选择知识库"
                    loading={kbSelectLoading}
                    value={knowledgeBase?.id}
                    onChange={handleKnowledgeBaseChange}
                    notFoundContent={
                      kbSelectLoading ? (
                        <Spin size="small" />
                      ) : (
                        <Text type="secondary">无可用知识库</Text>
                      )
                    }
                  >
                    {knowledgeBases.map((kb) => (
                      <Option key={kb.id} value={kb.id}>
                        {kb.name}
                      </Option>
                    ))}
                  </Select>
                </div>
              }
              style={{
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
                display: "flex",
                flexDirection: "column",
                height: "calc(100vh - 220px)",
              }}
              styles={{
                body: {
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  padding: "12px 24px",
                  overflowY: "hidden",
                },
              }}
            >
              {detailsLoading ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Spin size="large" tip="加载知识库中..." />
                </div>
              ) : !knowledgeBase ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Empty description="请从上方选择一个知识库开始对话。" style={{ margin: "40px 0" }} />
                </div>
              ) : (
                <>
                  {/* 使用 Ant Design X 的 Conversations 组件 */}
                  <div style={{ flex: 1, overflowY: "auto", marginBottom: "16px" }}>
                    {messages.length === 0 ? (
                      <Welcome
                        title={welcomeConfig.title}
                        description={welcomeConfig.description}
                        style={{ height: "100%", padding: "40px 0" }}
                        extra={
                          <div style={{ marginTop: 24 }}>
                            <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
                              您可以尝试以下问题:
                            </Text>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                              {welcomeConfig.suggestions.map((suggestion, index) => (
                                <Button
                                  key={index}
                                  size="small"
                                  onClick={() => setInput(suggestion)}
                                  style={{ marginBottom: 8 }}
                                >
                                  {suggestion}
                                </Button>
                              ))}
                            </div>
                          </div>
                        }
                      />
                    ) : (
                      <Conversations
                        items={convertMessagesToAntDX(messages)}
                        renderBubble={renderBubble}
                        style={{ height: "100%" }}
                      />
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* 输入区域 - 使用传统的Input.TextArea先测试基本功能 */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                    <Input.TextArea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onPressEnter={(e) => {
                        if (!e.shiftKey && input.trim() && !sending && knowledgeBase) {
                          e.preventDefault();
                          handleStreamResponse();
                        }
                      }}
                      placeholder="输入您的问题..."
                      disabled={sending || !knowledgeBase}
                      autoSize={{ minRows: 1, maxRows: 4 }}
                      style={{ borderRadius: "8px", flex: 1 }}
                    />
                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      onClick={handleStreamResponse}
                      disabled={!input.trim() || sending || !knowledgeBase}
                      loading={sending}
                      style={{ borderRadius: "8px" }}
                    >
                      发送
                    </Button>
                  </div>
                </>
              )}
            </Card>
          </Col>

          {/* 右侧: 信息面板 */}
          <Col xs={24} md={8}>
            <Card
              title={
                <div style={{ display: "flex", alignItems: "center" }}>
                  <Avatar
                    icon={<QuestionCircleOutlined />}
                    style={{ backgroundColor: "#52c41a", marginRight: 8 }}
                  />
                  <span>问答信息</span>
                </div>
              }
              style={{ borderRadius: "8px", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)" }}
            >
              {detailsLoading && !knowledgeBase ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <Spin tip="加载信息中..." />
                </div>
              ) : knowledgeBase ? (
                <div style={{ padding: "0 4px" }}>
                  {/* 知识库信息 */}
                  <div style={{ marginBottom: 16 }}>
                    <Title level={5} style={{ marginTop: 0 }}>
                      知识库信息
                    </Title>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <Text type="secondary">知识库名称:</Text>
                      <Text strong>{knowledgeBase.name}</Text>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <Text type="secondary">RAG方法:</Text>
                      <Text strong>{knowledgeBase.ragMethod || "N/A"}</Text>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <Text type="secondary">嵌入模型:</Text>
                      <Text strong>{knowledgeBase.embeddingModel || "N/A"}</Text>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <Text type="secondary">创建时间:</Text>
                      <Text>{new Date(knowledgeBase.createdAt).toLocaleString()}</Text>
                    </div>
                  </div>

                  <Divider style={{ margin: "12px 0" }} />

                  {/* RAG参数配置 */}
                  <div style={{ background: "#fff", marginBottom: "16px" }}>
                    {loadingMethodDetails ? (
                      <div style={{ textAlign: "center", padding: "20px 0" }}>
                        <Spin size="small" tip="加载参数中..." />
                      </div>
                    ) : knowledgeBase.ragMethod ? (
                      <RagMethodParams
                        methodId={knowledgeBase.ragMethod}
                        initialParams={ragParams}
                        onChange={handleRagParamsChange}
                        showSearchParams={true}
                        showIndexParams={false}
                      />
                    ) : (
                      <Text type="secondary">当前知识库未配置RAG方法，无法设置参数。</Text>
                    )}
                  </div>

                  <Divider style={{ margin: "12px 0" }} />

                  {/* 使用提示 */}
                  <div style={{ marginBottom: 16 }}>
                    <Title level={5} style={{ marginTop: 0 }}>
                      提示
                    </Title>
                    <ul style={{ paddingLeft: "20px", marginTop: "8px" }}>
                      <li>问题尽量具体明确</li>
                      <li>可以进行多轮对话</li>
                      <li>系统会保持上下文理解</li>
                      <li>文档内容越丰富，回答越精准</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div style={{ padding: "20px", textAlign: "center" }}>
                  <Text type="secondary">
                    请先从左侧选择一个知识库以查看详细信息和配置参数。
                  </Text>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default RAGChatX;