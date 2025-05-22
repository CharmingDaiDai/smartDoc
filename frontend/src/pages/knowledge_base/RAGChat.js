import React, { useEffect, useRef, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Col,
  Collapse,
  Divider,
  Empty,
  Form,
  Input,
  List,
  message,
  Row,
  Select,
  Spin,
  Tag,
  Typography,
} from "antd";
import {
  BookOutlined,
  LoadingOutlined,
  QuestionCircleOutlined,
  RobotOutlined,
  SendOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api, { knowledgeBaseAPI } from "../../services/api";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { getMethodConfig } from "../../config/ragConfig";
import "../../styles/components/markdown.css";
import "../../styles/components/ragChat.css"; // 导入RAG Chat专用样式
import RagMethodParams from "../../components/knowledge_base/RagMethodParams";
import { createAuthEventSource } from "../../utils/eventSourceAuth";

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const RAGChat = () => {
  // 调试模式开关 - 设置为true时会在控制台输出更多日志
  const DEBUG_MODE = false;

  const { currentUser } = useAuth();
  const { id: knowledgeBaseId } = useParams(); // From URL
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage(); // 使用 useMessage 钩子

  const [knowledgeBase, setKnowledgeBase] = useState(null); // Stores the currently selected knowledge base object
  const [knowledgeBases, setKnowledgeBases] = useState([]); // Stores the list of all available knowledge bases

  const [listLoading, setListLoading] = useState(true); // Loading state for the initial list of knowledge bases
  const [detailsLoading, setDetailsLoading] = useState(false); // Loading state for the details of a selected knowledge base
  const [kbSelectLoading, setKbSelectLoading] = useState(false); // Loading state for the Select dropdown component

  const [sending, setSending] = useState(false); // State for when a message is being sent
  const [messages, setMessages] = useState([]); // Stores chat messages
  const [input, setInput] = useState(""); // Current user input
  const [form] = Form.useForm();
  const messagesEndRef = useRef(null); // Ref to scroll to the bottom of messages

  // RAG Method related states
  const [loadingMethodDetails, setLoadingMethodDetails] = useState(false); // Loading state for RAG method parameters
  const [ragMethodDetails, setRagMethodDetails] = useState(null); // Stores the configuration of the current RAG method
  const [ragParams, setRagParams] = useState({}); // Stores the current RAG parameters for the selected KB
  const [ragMethodType, setRagMethodType] = useState(null); // 存储当前RAG方法的类型

  // Fetch all knowledge bases for the current user
  const fetchKnowledgeBases = async () => {
    setListLoading(true);
    setKbSelectLoading(true);
    try {
      const response = await knowledgeBaseAPI.getKnowledgeBases();
      if (DEBUG_MODE) {
        console.log("debug1");
        console.log(response.data);
      }

      // 检查响应数据是否为数组（直接返回的知识库列表）
      if (response.data && Array.isArray(response.data)) {
        const kbs = response.data;
        // Sort knowledge bases by creation date (descending, newest first)
        kbs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        if (DEBUG_MODE) {
          console.log("debug2");
          console.log(kbs);
        }
        setKnowledgeBases(kbs);
      }
      // 检查是否为包含code字段的标准响应格式
      else if (response.data && response.data.code === 200) {
        const kbs = response.data.data || [];
        kbs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setKnowledgeBases(kbs);
      }
      // 处理错误响应
      else {
        messageApi.error(response.data?.message || "获取知识库列表失败");
        setKnowledgeBases([]); // Set to empty array on failure
      }
    } catch (error) {
      console.error("获取知识库列表失败:", error);
      messageApi.error("获取知识库列表失败，请稍后再试");
      setKnowledgeBases([]); // Set to empty array on error
    } finally {
      setListLoading(false);
      setKbSelectLoading(false);
    }
  };

  // 获取特定RAG方法的配置详情（从本地配置文件获取）
  const fetchRagMethodDetails = (methodId) => {
    if (!methodId) {
      setRagMethodDetails(null);
      setRagParams({}); // 如果没有methodId，清空参数
      return;
    }

    setLoadingMethodDetails(true);
    try {
      // 从本地配置文件中获取RAG方法配置
      const methodConfig = getMethodConfig(methodId);

      if (methodConfig) {
        setRagMethodDetails(methodConfig);
        // 保存方法类型
        setRagMethodType(methodId);
        // 使用方法配置中的搜索参数初始化RAG参数
        const initialSearchParams = { ...methodConfig.searchParams };
        setRagParams(initialSearchParams);
      } else {
        messageApi.warning("未找到RAG方法配置信息，将使用默认参数");
        setRagMethodDetails(null);
        setRagParams({}); // 如果方法详情未找到，回退到空值
      }
    } catch (error) {
      console.error("获取RAG方法详情失败:", error);
      messageApi.error("获取RAG方法参数失败，将使用默认参数");
      setRagMethodDetails(null);
      setRagParams({});
    } finally {
      setLoadingMethodDetails(false);
    }
  };

  // Fetch details for a specific knowledge base
  const fetchKnowledgeBaseDetails = async (id) => {
    if (!id) {
      setKnowledgeBase(null); // Clear current KB if no ID
      setMessages([]); // Clear chat messages
      setRagParams({}); // Clear RAG parameters
      setRagMethodDetails(null);
      setRagMethodType(null); // 清除方法类型
      return;
    }
    setDetailsLoading(true);
    try {
      const response = await knowledgeBaseAPI.getKnowledgeBase(id);
      if (DEBUG_MODE) {
        console.log("KB details response:", response.data);
      }

      // 直接返回知识库对象
      if (response.data && !response.data.code && !response.data.success) {
        const kbData = response.data;
        setKnowledgeBase(kbData);

        // 如果知识库有关联的RAG方法，获取其详情和默认参数
        if (kbData.ragMethod) {
          fetchRagMethodDetails(kbData.ragMethod);
        } else {
          setRagMethodDetails(null); // No RAG method associated
          setRagParams({}); // Clear RAG params
        }
      }
      // 标准的成功响应格式
      else if (
        (response.data && response.data.success) ||
        (response.data && response.data.code === 200)
      ) {
        const kbData = response.data.data;
        setKnowledgeBase(kbData);

        // 如果知识库有关联的RAG方法，获取其详情和默认参数
        if (kbData.ragMethod) {
          fetchRagMethodDetails(kbData.ragMethod);
        } else {
          setRagMethodDetails(null); // No RAG method associated
          setRagParams({}); // Clear RAG params
        }
      } else {
        messageApi.error(response.data?.message || "获取知识库详情失败");
        setKnowledgeBase(null); // Clear on failure
      }
    } catch (error) {
      console.error("获取知识库详情失败:", error);
      messageApi.error("获取知识库详情失败，请稍后再试");
      setKnowledgeBase(null); // Clear on error
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    // 获取知识库列表
    fetchKnowledgeBases();
  }, []);

  useEffect(() => {
    // When knowledgeBaseId (from URL) changes, fetch the details for that knowledge base
    fetchKnowledgeBaseDetails(knowledgeBaseId);
  }, [knowledgeBaseId]);

  useEffect(() => {
    // Scroll to the latest message whenever messages array updates
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle change when a new knowledge base is selected from the dropdown
  const handleKnowledgeBaseChange = (id) => {
    setMessages([]); // Clear existing messages
    if (id) {
      navigate(`/knowledge_base/rag/${id}`); // Navigate to the URL for the selected KB
    } else {
      // If placeholder or no KB is selected
      navigate("/knowledge_base/rag"); // Navigate to the base RAG page
      setKnowledgeBase(null); // Explicitly clear the current KB state
      setRagParams({});
      setRagMethodDetails(null);
    }
  };

  // Handle changes to RAG parameters from the RagMethodParams component
  const handleRagParamsChange = (newParams) => {
    setRagParams((prevParams) => ({ ...prevParams, ...newParams }));
  };

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!input.trim() || !knowledgeBase || sending) return;

    const userMessage = {
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    try {
      // 根据RAG方法类型选择不同的API调用方式
      let response;
      const ragMethodId = ragMethodType || knowledgeBase.ragMethod;
      const userQuestion = input.trim();

      // 获取参数值
      const topk = ragParams["top-k"] || 5;
      const maxRes = ragParams["max-res"] || 10;
      const queryRewriting = ragParams["query-rewriting"] || false;
      const queryDecomposition = ragParams["query-decomposition"] || false;

      console.info("Using RAG method:", ragMethodId, "with params:", ragParams);

      // 根据RAG方法类型使用不同的API调用
      switch (ragMethodId) {
        case "naive":
          // 使用GET方法替代POST方法，并将参数作为查询参数
          const naiveParams = new URLSearchParams({
            question: userQuestion,
            topk: topk,
            query_rewriting: queryRewriting,
            query_decomposition: queryDecomposition,
          });
          // Axios请求会通过拦截器自动添加Authorization头
          response = await api.get(
            `/api/kb/chat/naive/${knowledgeBase.id}?${naiveParams.toString()}`
          );
          break;
        case "hisem":
          // 使用GET方法替代POST方法，并将参数作为查询参数
          const hisemParams = new URLSearchParams({
            question: userQuestion,
            max_res: maxRes,
            query_rewriting: queryRewriting,
            query_decomposition: queryDecomposition,
          });
          response = await api.get(
            `/api/kb/chat/hisem/${knowledgeBase.id}?${hisemParams.toString()}`
          );
          break;
        case "hisem-tree":
          // 使用GET方法替代POST方法，并将参数作为查询参数
          const hisemTreeParams = new URLSearchParams({
            question: userQuestion,
            max_res: maxRes,
            query_rewriting: queryRewriting,
            query_decomposition: queryDecomposition,
          });
          response = await api.get(
            `/api/kb/chat/hisem-tree/${
              knowledgeBase.id
            }?${hisemTreeParams.toString()}`
          );
          break;
        default:
          // 默认使用通用API
          response = await knowledgeBaseAPI.queryKnowledgeBase({
            knowledgeBaseId: knowledgeBase.id,
            query: userQuestion,
            ragParams: ragParams, // 发送当前RAG参数
          });
      }

      if (response.data && response.data.success) {
        const aiMessage = {
          role: "assistant",
          content: response.data.data.content,
          timestamp: new Date().toISOString(),
          sources: response.data.data.sources,
        };
        setMessages((prev) => [...prev, aiMessage]);
      } else {
        messageApi.error(response.data?.message || "发送消息失败");
        const errorMessage = {
          role: "assistant",
          content: response.data?.message || "抱歉，AI回复失败，请稍后再试。",
          timestamp: new Date().toISOString(),
          error: true,
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("发送消息失败:", error);
      messageApi.error("发送消息失败，请稍后再试");
      const errorMessage = {
        role: "assistant",
        content: "很抱歉，处理您的请求时发生了错误，请稍后再试。",
        timestamp: new Date().toISOString(),
        error: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  };

  // 使用SSE流式处理回复消息
  const handleStreamResponse = async () => {
    if (!input.trim() || !knowledgeBase || sending) return;

    const userQuestion = input.trim();
    const userMessage = {
      role: "user",
      content: userQuestion,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
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

    setMessages((prev) => [...prev, initialAiMessage]);

    try {
      // 构建API URL和参数
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

      // 创建带认证的EventSource
      const eventSource = createAuthEventSource(fullUrl);

      let contentBuffer = "";
      let sourcesData = [];

      // 处理SSE消息的增强版本
      eventSource.onmessage = (event) => {
        try {
          // 处理[DONE]结束标记
          if (
            typeof event.data === "string" &&
            (event.data === "[DONE]" || event.data.includes("[DONE]"))
          ) {
            if (DEBUG_MODE) console.log("收到结束标记");
            completeStreamResponse(
              eventSource,
              aiMessageId,
              contentBuffer,
              sourcesData
            );
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
              completeStreamResponse(
                eventSource,
                aiMessageId,
                contentBuffer,
                sourcesData
              );
            }
          }
        } catch (error) {
          if (DEBUG_MODE) console.error("处理SSE消息时出错:", error);
          // 尝试恢复 - 但不中断流
          tryRecoverFromError(event, aiMessageId, contentBuffer);
        }
      };

      // 处理错误的增强版本
      eventSource.onerror = (error) => {
        console.error("流式响应错误:", error);
        handleStreamError(
          error,
          eventSource,
          aiMessageId,
          contentBuffer,
          sourcesData,
          navigate
        );
      };
    } catch (error) {
      console.error("创建流式连接失败:", error);
      messageApi.error("创建连接失败，请稍后再试");

      // 更新消息为错误状态
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
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

  // 构建API请求参数 - 提取为独立函数
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

  // 根据方法类型构建API URL
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

  // 解析流式数据 - 提取为独立函数
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
      // 捕获特殊情况 - 某些出处包含特殊字符可能无法直接解析
      if (DEBUG_MODE && rawData.includes('"docs"')) {
        console.log("检测到可能包含docs的数据，尝试预处理");
      }
      
      // 应用JSON预处理和特殊处理
      rawData = cleanJsonData(rawData);

      // 解析JSON
      const data = JSON.parse(rawData);
      result.success = true;

      // 提取文档出处
      if (data.docs) {
        // 确保docs是数组
        if (Array.isArray(data.docs)) {
          if (DEBUG_MODE) console.log("发现文档出处数组:", data.docs.length);
          result.docs = data.docs;
        }
        // 处理可能是字符串的情况
        else if (typeof data.docs === "string") {
          if (DEBUG_MODE) console.log("文档出处为字符串，尝试解析");

          // 先检测是否是JSON数组字符串
          try {
            const parsedDocs = JSON.parse(data.docs);
            if (Array.isArray(parsedDocs)) {
              result.docs = parsedDocs;
            } else {
              // 如果是JSON对象但不是数组，尝试将其作为单个出处
              result.docs = [data.docs];
            }
          } catch (e) {
            if (DEBUG_MODE) console.log("JSON解析失败，尝试处理为纯文本出处");

            // 如果是长文本，尝试按照出处格式分割
            if (
              data.docs.length > 500 &&
              (data.docs.includes("出处 [") || data.docs.includes("\n\n"))
            ) {
              try {
                // 尝试根据"出处 [x]"或双换行符分割
                const splitPattern = /出处\s*\[\d+\]|(?:\n\s*\n)/;
                const docParts = data.docs
                  .split(splitPattern)
                  .filter((part) => part && part.trim());

                if (docParts.length > 1) {
                  if (DEBUG_MODE)
                    console.log(
                      `检测到可能的多个出处，分割为 ${docParts.length} 个部分`
                    );
                  result.docs = docParts.map(
                    (part, idx) => `出处 [${idx + 1}] ${part.trim()}`
                  );
                } else {
                  // 如果不能有效分割，作为单个出处处理
                  result.docs = [data.docs];
                }
              } catch (splitError) {
                // 分割失败，作为单个出处处理
                result.docs = [data.docs];
              }
            } else {
              // 如果不是很长或没有找到分割标记，直接作为单个出处
              result.docs = [data.docs];
            }
          }
        }
      }

      // 同样处理sources字段(另一种可能的出处字段名)
      if (!result.docs && data.sources) {
        if (Array.isArray(data.sources)) {
          result.docs = data.sources;
        } else if (typeof data.sources === "string") {
          try {
            const parsedSources = JSON.parse(data.sources);
            if (Array.isArray(parsedSources)) {
              result.docs = parsedSources;
            } else {
              // 如果是JSON对象但不是数组
              result.docs = [data.sources];
            }
          } catch (e) {
            // 类似于docs的处理方式
            if (
              data.sources.length > 500 &&
              (data.sources.includes("出处 [") || data.sources.includes("\n\n"))
            ) {
              try {
                const splitPattern = /出处\s*\[\d+\]|(?:\n\s*\n)/;
                const sourceParts = data.sources
                  .split(splitPattern)
                  .filter((part) => part && part.trim());

                if (sourceParts.length > 1) {
                  result.docs = sourceParts.map(
                    (part, idx) => `出处 [${idx + 1}] ${part.trim()}`
                  );
                } else {
                  result.docs = [data.sources];
                }
              } catch (splitError) {
                result.docs = [data.sources];
              }
            } else {
              result.docs = [data.sources];
            }
          }
        }
      }

      // 提取内容增量 - OpenAI格式
      if (
        data.choices &&
        Array.isArray(data.choices) &&
        data.choices.length > 0 &&
        data.choices[0].delta &&
        data.choices[0].delta.content !== undefined
      ) {
        const content = data.choices[0].delta.content;
        if (content !== null && content !== undefined) {
          result.contentDelta = content;
        }
      }

      // 提取直接内容格式
      if (
        data.content !== undefined &&
        data.content !== null &&
        data.content !== "[DONE]"
      ) {
        result.contentDelta = data.content;
      }

      // 检查是否完成
      if (
        data === "[DONE]" ||
        data.content === "[DONE]" ||
        data.text === "[DONE]" ||
        (data.choices &&
          data.choices.length > 0 &&
          data.choices[0].finish_reason === "stop") ||
        data.finished ||
        data.done === true
      ) {
        result.isCompleted = true;
      }
    } catch (error) {
      // JSON解析失败 - 尝试更激进的错误恢复策略
      if (DEBUG_MODE) console.error("JSON解析失败:", error);

      // 1. 尝试通过正则提取内容
      try {
        const contentMatch = rawData.match(/"content":\s*"([^"]*?)"/);
        if (contentMatch && contentMatch[1]) {
          result.success = true;
          result.contentDelta = contentMatch[1];
        }
      } catch (e) {
        if (DEBUG_MODE) console.error("正则提取内容失败:", e);
      }
      
      // 2. 尝试提取文档出处，即使JSON解析失败
      if (rawData.includes('"docs"')) {
        try {
          if (DEBUG_MODE) console.log("尝试紧急提取docs数据");
          
          // 使用一个宽松的正则表达式尝试提取整个docs数组
          const docsMatch = rawData.match(/"docs"\s*:\s*(\[.*?\])/s);
          if (docsMatch && docsMatch[1]) {
            try {
              // 尝试直接将整个字符串作为单个出处
              result.docs = [
                "出处 [1] 由于JSON解析错误，这是从原始响应中提取的文档出处。原始内容可能包含格式问题，建议查看原文档。"
              ];
              result.success = true;
            } catch (innerError) {
              if (DEBUG_MODE) console.error("紧急提取docs失败:", innerError);
            }
          }
        } catch (docsExtractError) {
          if (DEBUG_MODE) console.error("尝试提取docs数据失败:", docsExtractError);
        }
      }
    }

    return result;
  };

  // 清理JSON数据
  const cleanJsonData = (jsonStr) => {
    try {
      if (DEBUG_MODE) {
        console.log("清理前的JSON数据:", jsonStr.substring(0, 100) + (jsonStr.length > 100 ? "..." : ""));
      }
      
      // 1. 修复尾随逗号
      jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");
      
      // 2. 替换控制字符和特殊Unicode字符（保留常见的换行符等）
      jsonStr = jsonStr.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "");
      
      // 3. 处理可能导致JSON解析错误的转义序列
      // 修复字符串内的转义问题，但要避免过度处理导致其他问题
      jsonStr = jsonStr.replace(/\\([^"\/\\bfnrtu])/g, "$1"); // 删除无效的转义符
      
      // 4. 修复常见的JSON错误
      // 处理混合的换行符 - 将不同的换行符统一
      jsonStr = jsonStr.replace(/\\r\\n|\\n\\r|\\r/g, "\\n");
      
      // 5. 检查并修复可能的错误格式
      // 处理可能的多余引号
      jsonStr = jsonStr.replace(/""+/g, '"');
      
      // 6. 替换一些特殊字符序列
      // 替换特殊的Unicode转义序列
      jsonStr = jsonStr.replace(/\\\\u([0-9a-fA-F]{4})/g, "\\u$1");
      
      // 7. 特殊处理文档出处相关的问题
      if (jsonStr.includes('"docs":')) {
        // 尝试修复包含特殊转义序列的docs数组
        jsonStr = handleSpecialDocsArray(jsonStr);
      }
      
      if (DEBUG_MODE) {
        console.log("清理后的JSON数据:", jsonStr.substring(0, 100) + (jsonStr.length > 100 ? "..." : ""));
      }
      
      return jsonStr;
    } catch (e) {
      console.warn("清理JSON数据时出错:", e);
      return jsonStr; // 如果清理失败，返回原始字符串
    }
  };
  
  // 特殊处理包含问题的docs数组
  const handleSpecialDocsArray = (jsonStr) => {
    try {
      // 检测是否包含可能导致解析错误的格式
      if (jsonStr.includes('\\r\\n') || jsonStr.includes('\\n\\r') || 
          jsonStr.includes('\\u') || jsonStr.includes('af://')) {
        
        if (DEBUG_MODE) console.log("检测到docs数组中的特殊格式，进行处理");
        
        // 尝试找出docs数组部分
        const docsMatch = jsonStr.match(/"docs"\s*:\s*(\[.*?\])/s);
        if (docsMatch && docsMatch[1]) {
          const originalDocsStr = docsMatch[1];
          let cleanedDocsStr = originalDocsStr;
          
          // 对数组内容进行特殊处理
          try {
            // 提取数组中的每个元素并进行处理
            const arrayContentMatch = originalDocsStr.match(/^\[(.*)\]$/s);
            if (arrayContentMatch && arrayContentMatch[1]) {
              let arrayContent = arrayContentMatch[1];
              
              // 检查是否是一个包含多个字符串的数组
              if (arrayContent.includes('"') && arrayContent.includes(',')) {
                // 假设是字符串数组，尝试分割每个元素
                const stringElements = arrayContent.split(/",\s*"/);
                
                // 清理每个元素
                const cleanedElements = stringElements.map(element => {
                  // 移除开头和结尾的引号
                  let cleaned = element.replace(/^"|"$/g, '');
                  
                  // 处理每个元素内部的特殊序列
                  cleaned = cleaned
                    .replace(/\\r\\n|\\n\\r|\\r/g, ' ') // 将换行符替换为空格
                    .replace(/\\u([0-9a-fA-F]{4})/g, ' ') // 将Unicode转义替换为空格
                    .replace(/af:\/\/n\d+/g, '') // 移除特殊的"af://"格式
                    .replace(/\\([^"\/\\bfnrtu])/g, '$1'); // 删除无效的转义符
                    
                  return `"${cleaned}"`;
                });
                
                // 重建数组字符串
                cleanedDocsStr = `[${cleanedElements.join(',')}]`;
                if (DEBUG_MODE) console.log("重构后的docs数组:", cleanedDocsStr.substring(0, 50) + "...");
              }
            }
          } catch (arrayError) {
            console.warn("处理数组内容时出错:", arrayError);
          }
          
          // 替换原始的docs字符串
          jsonStr = jsonStr.replace(originalDocsStr, cleanedDocsStr);
        }
      }
      
      return jsonStr;
    } catch (e) {
      console.warn("特殊处理docs数组时出错:", e);
      return jsonStr; // 如果处理失败，返回原始字符串
    }
  };

  // 处理文档出处数据 - 提取为独立函数
  const processDocSources = (docs) => {
    if (!docs || !Array.isArray(docs) || docs.length === 0) {
      console.log("未收到有效的出处数据");
      return [];
    }

    if (DEBUG_MODE) console.debug("处理原始出处数据:", docs);

    return docs
      .map((doc, index) => {
        // 处理为空的情况
        if (!doc) {
          return {
            id: `source-${index}`,
            number: index + 1,
            title: `出处 [${index + 1}]`,
            content: "无法解析出处内容",
            relevance: "未知",
          };
        }

        // 处理非字符串情况
        if (typeof doc !== "string") {
          try {
            doc = JSON.stringify(doc);
          } catch (e) {
            doc = "无法解析出处内容";
          }
        }

        // 检测出处是否过长，可能是从LLM返回的完整文档
        const isLongDocument = doc.length > 300; // 根据实际情况调整阈值

        // 提取出处编号，格式通常为 "出处 [数字]"
        const sourceMatch = doc.match(/出处\s*\[(\d+)\]/);
        const sourceNumber = sourceMatch ? sourceMatch[1] : `${index + 1}`;

        // 清理文本内容 - 更彻底的处理
        let cleanedContent = doc;

        // 移除前缀
        if (sourceMatch) {
          cleanedContent = doc.replace(/出处\s*\[\d+\]\s*/, "");
        }

        // 清理格式
        cleanedContent = cleanedContent
          .replace(/\n+/g, " ") // 替换连续换行为单个空格
          .replace(/\s+/g, " ") // 规范化空白
          .trim(); // 移除首尾空白

        // 如果是长文档，可能需要截断显示
        if (isLongDocument && cleanedContent.length > 1000) {
          if (DEBUG_MODE) console.log(`出处 ${index + 1} 内容过长，进行截断`);
          cleanedContent =
            cleanedContent.substring(0, 1000) + "... (内容已截断)";
        }

        // 创建出处对象
        return {
          id: `source-${index}`,
          number: sourceNumber,
          title: `出处 [${sourceNumber}]`,
          content: cleanedContent || "未提供内容",
          relevance: "高",
          isLongDocument: isLongDocument,
        };
      })
      .filter(
        (source) =>
          source.content &&
          source.content !== "无法解析出处内容" &&
          source.content !== "未提供内容"
      ); // 过滤真正的空内容
  };

  // 完成流式响应
  const completeStreamResponse = (eventSource, messageId, content, sources) => {
    // 更新消息状态
    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
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

    // 关闭连接并重置状态
    eventSource.close();
    setSending(false);
  };

  // 从错误中恢复
  const tryRecoverFromError = (event, messageId, contentBuffer) => {
    if (event && event.data && typeof event.data === "string") {
      const textContent = event.data.replace(/data:\s*/, "").trim();
      // 只添加看起来像文本内容的部分
      if (
        textContent &&
        !textContent.includes('"id":') &&
        !textContent.includes('"object":')
      ) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === messageId
              ? { ...msg, content: contentBuffer + textContent }
              : msg
          )
        );
      }
    }
  };

  // 处理流错误
  const handleStreamError = (
    error,
    eventSource,
    messageId,
    content,
    sources,
    navigate
  ) => {
    // 检查是否是认证错误
    if (error.type === "auth_error") {
      messageApi.error("认证失败，请重新登录");
      handleAuthError(eventSource, navigate);
    } else {
      // 其他错误
      if (
        error.message &&
        (error.message.includes("NetworkError") ||
          error.message.includes("Failed to fetch") ||
          error.message.includes("Network request failed"))
      ) {
        messageApi.error("网络连接错误，请检查您的网络连接");
      } else {
        messageApi.error("接收回复时发生错误，请重试");
      }
    }

    // 更新消息为错误状态
    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
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

    // 关闭连接
    eventSource.close();
    setSending(false);
  };

  // 处理认证错误
  const handleAuthError = (eventSource, navigate) => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      // 尝试刷新令牌
      api
        .post("/api/auth/refresh-token", { refreshToken })
        .then((response) => {
          const { accessToken, refreshToken: newRefreshToken } = response.data;
          localStorage.setItem("token", accessToken);
          localStorage.setItem("refreshToken", newRefreshToken);

          // 尝试重连
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

  // Component to render Markdown content
  const MarkdownRenderer = ({ content }) => (
    <div
      className="markdown-content"
      style={{
        padding: "16px",
        background: "#fbfbfb",
        borderRadius: "8px",
        border: "1px solid #f0f0f0",
      }}
    >
      <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );

  // 改进后的渲染消息组件
  const renderMessage = (msg, index) => {
    const isUser = msg.role === "user";
    return (
      <List.Item
        key={index}
        style={{ padding: "8px 0" }}
        className="message-item"
      >
        <div
          style={{
            display: "flex",
            flexDirection: isUser ? "row-reverse" : "row",
            alignItems: "flex-start",
            width: "100%",
          }}
        >
          <Avatar
            icon={isUser ? <UserOutlined /> : <RobotOutlined />}
            style={{
              backgroundColor: isUser
                ? "#1890ff"
                : msg.error
                ? "#ff4d4f"
                : "#52c41a",
              marginLeft: isUser ? "8px" : 0,
              marginRight: isUser ? 0 : "8px",
            }}
          />
          <div
            style={{
              maxWidth: "80%",
              background: isUser
                ? "#e6f7ff"
                : msg.error
                ? "#fff2f0"
                : "#f6ffed",
              padding: "12px 16px",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
            }}
          >
            {isUser ? (
              <Text>{msg.content}</Text>
            ) : (
              <div>
                <MarkdownRenderer content={msg.content} />

                {/* 显示流式传输指示器 */}
                {msg.isStreaming && (
                  <div style={{ marginTop: "8px" }}>
                    <Spin size="small" className="pulse-loading" />
                    <Text type="secondary" style={{ marginLeft: "8px" }}>
                      正在思考...
                    </Text>
                  </div>
                )}

                {/* 调试信息 - 仅在DEBUG_MODE时显示 */}
                {DEBUG_MODE && msg.sources && (
                  <div
                    style={{
                      margin: "8px 0",
                      padding: "4px",
                      background: "#fffbe6",
                      fontSize: "12px",
                      borderLeft: "2px solid #faad14",
                    }}
                  >
                    <div>出处数量: {msg.sources.length}</div>
                    <div>
                      原始数据: {JSON.stringify(msg.sources).substring(0, 100)}
                      ...
                    </div>
                  </div>
                )}

                {/* 优化的出处显示组件 */}
                {msg.sources && msg.sources.length > 0 && (
                  <SourcesDisplay sources={msg.sources} />
                )}
              </div>
            )}
          </div>
        </div>
      </List.Item>
    );
  };

  // 优化的出处显示组件 - 抽取成独立组件
  const SourcesDisplay = ({ sources }) => {
    // 默认不打开出处面板
    const [activeKey, setActiveKey] = useState([]);

    const onCollapseChange = (keys) => {
      setActiveKey(keys);
    };

    // 定义折叠面板的items
    const collapseItems = [
      {
        key: "sources",
        label: (
          <div style={{ display: "flex", alignItems: "center" }}>
            <Text strong className="source-header">
              查看参考出处
            </Text>
            <span className="sources-count">{sources.length}</span>
          </div>
        ),
        children: (
          <div
            style={{
              maxHeight: sources.length > 3 ? "300px" : "auto",
              overflowY: sources.length > 3 ? "auto" : "visible",
            }}
            className="chat-scroll-area"
          >
            {sources.map((source, idx) => (
              <SourceItem key={source.id || idx} source={source} />
            ))}
          </div>
        ),
      },
    ];

    return (
      <div style={{ marginTop: "12px" }}>
        <Collapse
          bordered={false}
          expandIconPosition="end"
          ghost
          activeKey={activeKey}
          onChange={onCollapseChange}
          className="source-collapse"
          items={collapseItems}
        />
      </div>
    );
  };

  // 单个出处项组件
  const SourceItem = ({ source }) => {
    const [expanded, setExpanded] = useState(false);

    const toggleExpand = () => {
      setExpanded(!expanded);
    };

    // 根据文本长度确定截断长度和是否需要展开按钮
    const isVeryLongContent = source.content.length > 300;
    const needsExpand = source.content.length > 80;

    // 根据内容长度决定初始展示多少字符
    const initialDisplayLength = isVeryLongContent ? 150 : 80;

    return (
      <div
        className="source-card"
        style={{
          padding: "12px",
          background: "#f9f9f9",
          borderLeft: source.isLongDocument ? "3px solid #1890ff" : "none", // 为长文档添加特殊标记
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text strong className="source-header">
            {source.title}
          </Text>
          {source.isLongDocument && (
            <Tag color="blue" style={{ marginLeft: 5 }}>
              长文本
            </Tag>
          )}
        </div>

        <div
          style={{
            margin: "6px 0 0 0",
            fontSize: "13px",
            color: "#333",
            lineHeight: "1.6",
          }}
        >
          {needsExpand && !expanded ? (
            <>
              <div>{`${source.content.substring(
                0,
                initialDisplayLength
              )}...`}</div>
              <Button
                type="link"
                size="small"
                onClick={toggleExpand}
                className="expand-button"
                style={{ padding: "0", height: "auto", marginTop: "4px" }}
              >
                展开更多
              </Button>
            </>
          ) : needsExpand && expanded ? (
            <>
              <div
                style={{
                  maxHeight: isVeryLongContent ? "300px" : "none",
                  overflowY: isVeryLongContent ? "auto" : "visible",
                }}
              >
                {source.content}
              </div>
              <Button
                type="link"
                size="small"
                onClick={toggleExpand}
                className="expand-button collapse-button"
                style={{ padding: "0", height: "auto", marginTop: "4px" }}
              >
                收起
              </Button>
            </>
          ) : (
            <div>{source.content}</div>
          )}
        </div>
      </div>
    );
  };

  // Show spinner while the initial list of knowledge bases is loading
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
      {/* Top green title area */}
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
        // Display if no knowledge bases are available for the user
        <Card
          style={{
            marginTop: 24,
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
          }}
        >
          <Empty
            description="您还没有创建任何知识库。请先创建知识库，然后才能开始问答。"
            style={{ padding: "40px 0" }}
          >
            <Button
              type="primary"
              onClick={() => navigate("/knowledge-base/manage")}
            >
              {" "}
              {/* Adjust navigation as needed */}
              管理我的知识库
            </Button>
          </Empty>
        </Card>
      ) : (
        // Main layout when knowledge bases are available
        <Row gutter={[24, 24]}>
          {/* Left Column: Chat Interface */}
          <Col xs={24} md={16}>
            <Card
              title={
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <Avatar
                      icon={<BookOutlined />}
                      style={{ backgroundColor: "#52c41a", marginRight: 8 }}
                    />
                    <span>
                      知识库问答{" "}
                      {knowledgeBase ? `(${knowledgeBase.name})` : ""}
                    </span>
                  </div>
                  <Select
                    style={{ width: 200 }}
                    placeholder="选择知识库"
                    loading={kbSelectLoading} // Loading state for the select dropdown
                    value={knowledgeBase?.id} // Current selected KB's ID
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
                // Show spinner while loading details of a selected KB
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Spin size="large" tip="加载知识库中..." />
                </div>
              ) : !knowledgeBase ? (
                // Show if no KB is selected yet
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Empty
                    description="请从上方选择一个知识库开始对话。"
                    style={{ margin: "40px 0" }}
                  />
                </div>
              ) : (
                // Actual chat interface (messages and input)
                <>
                  <div
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      marginBottom: "16px",
                      paddingRight: "8px",
                    }}
                    className="chat-scroll-area"
                  >
                    {messages.length === 0 ? (
                      <Empty
                        description="开始提问以获取基于您文档的问答"
                        style={{ margin: "40px 0" }}
                      />
                    ) : (
                      <List
                        itemLayout="horizontal"
                        dataSource={messages}
                        renderItem={renderMessage}
                      />
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  <div>
                    <Form form={form} onFinish={handleStreamResponse}>
                      <Form.Item name="message" style={{ marginBottom: 0 }}>
                        <div style={{ display: "flex" }}>
                          <TextArea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="输入您的问题..."
                            autoSize={{ minRows: 1, maxRows: 4 }}
                            style={{
                              borderRadius: "8px 0 0 8px",
                              resize: "none",
                            }}
                            disabled={sending || !knowledgeBase} // Disable if sending or no KB selected
                          />
                          <Button
                            type="primary"
                            icon={
                              sending ? <LoadingOutlined /> : <SendOutlined />
                            }
                            onClick={handleStreamResponse}
                            style={{ borderRadius: "0 8px 8px 0" }}
                            disabled={
                              !input.trim() || sending || !knowledgeBase
                            } // Disable if no input, sending, or no KB selected
                          />
                        </div>
                      </Form.Item>
                    </Form>
                  </div>
                </>
              )}
            </Card>
          </Col>

          {/* Right Column: Information and RAG Parameters */}
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
              style={{
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
              }}
            >
              {detailsLoading && !knowledgeBase ? ( // Show spinner if details are loading for the first time for a selection
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <Spin tip="加载信息中..." />
                </div>
              ) : knowledgeBase ? (
                // Display if a knowledge base is selected
                <div style={{ padding: "0 4px" }}>
                  {/* Knowledge Base Information */}
                  <div style={{ marginBottom: 16 }}>
                    <Title level={5} style={{ marginTop: 0 }}>
                      知识库信息
                    </Title>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <Text type="secondary">知识库名称:</Text>
                      <Text strong>{knowledgeBase.name}</Text>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <Text type="secondary">RAG方法:</Text>
                      <Text strong>{knowledgeBase.ragMethod || "N/A"}</Text>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <Text type="secondary">嵌入模型:</Text>
                      <Text strong>
                        {knowledgeBase.embeddingModel || "N/A"}
                      </Text>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text type="secondary">创建时间:</Text>
                      <Text>
                        {new Date(knowledgeBase.createdAt).toLocaleString()}
                      </Text>
                    </div>
                  </div>
                  <Divider style={{ margin: "12px 0" }} />
                  {/* RAG Parameters Configuration - 直接显示，不需要展开 */}
                  <div style={{ background: "#fff", marginBottom: "16px" }}>
                    {/* <Title level={5} style={{ marginTop: 0, marginBottom: "16px" }}>
                      RAG参数配置
                    </Title> */}

                    {loadingMethodDetails ? (
                      <div style={{ textAlign: "center", padding: "20px 0" }}>
                        <Spin size="small" tip="加载参数中..." />
                      </div>
                    ) : knowledgeBase.ragMethod ? (
                      <RagMethodParams
                        methodId={knowledgeBase.ragMethod}
                        initialParams={ragParams} // Pass current RAG params to initialize the component
                        onChange={handleRagParamsChange}
                        showSearchParams={true} // 只显示搜索参数
                        showIndexParams={false} // 不显示索引参数
                      />
                    ) : (
                      <Text type="secondary">
                        当前知识库未配置RAG方法，无法设置参数。
                      </Text>
                    )}
                  </div>
                  <Divider style={{ margin: "12px 0" }} />
                  {/* Tips Section */}
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
                // Display if no knowledge base is selected
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

export default RAGChat;
