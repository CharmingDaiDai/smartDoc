// 基于 Ant Design X 的流式 RAG 问答组件
// 支持实时 Markdown 渲染和数学公式显示
import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  Avatar,
  Button,
  Card,
  Col,
  Input,
  InputNumber,
  message,
  Row,
  Select,
  Slider,
  Spin,
  Switch,
  Tag,
  Typography,
  Space,
  theme,
  Modal,
  Tabs,
} from "antd";
import {
  BookOutlined,
  DatabaseOutlined,
  QuestionCircleOutlined,
  RobotOutlined,
  SendOutlined,
  SettingOutlined,
  UserOutlined,
  CopyOutlined,
  SyncOutlined,
  ReloadOutlined,
  LikeOutlined,
  DislikeOutlined,
} from "@ant-design/icons";
import { Bubble, useXAgent, useXChat } from "@ant-design/x";
import { useNavigate, useParams } from "react-router-dom";
import api, { knowledgeBaseAPI } from "../../services/api";
import { getMethodConfig } from "../../config/ragConfig";
import markdownit from "markdown-it";
import mk from "markdown-it-katex";
import hljs from "highlight.js";
import "katex/dist/katex.min.css";
import "highlight.js/styles/vs.css"; // 代码高亮样式
import "../../styles/components/markdown.css";
import "../../styles/components/ragChat.css";

const { Title, Paragraph } = Typography;
const { Option } = Select;
const DEBUG_MODE = false; // 调试模式开关

// 初始化 markdown-it 渲染器，支持 HTML 标签、换行符和 KaTeX 数学公式
const md = markdownit({
  html: true, // 允许 HTML 标签
  xhtmlOut: false, // 使用 '/' 闭合单标签 (比如 <br />)
  breaks: true, // '\n' 转换成 <br>
  linkify: true, // 自动将链接文本转换成 <a>
  typographer: true, // 替换引号和破折号等排版符号
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${
          hljs.highlight(str, { language: lang }).value
        }</code></pre>`;
      } catch (_) {}
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
  },
}).use(mk);

// 自定义图片渲染规则 - 自动处理相对路径
md.renderer.rules.image = function (tokens, idx, options, env) {
  const token = tokens[idx];
  const srcIndex = token.attrIndex('src');
  
  if (srcIndex >= 0) {
    let src = token.attrs[srcIndex][1];
    
    // 处理相对路径，将 assets/ 开头的路径转换为 /assets/
    if (src && typeof src === 'string') {
      if (src.startsWith('assets/')) {
        src = `/${src}`;
      } else if (src.startsWith('./assets/')) {
        src = src.replace('./assets/', '/assets/');
      }
      token.attrs[srcIndex][1] = src;
    }
  }
  
  // 添加样式属性
  token.attrSet('style', 'max-width: 100%; height: auto; border-radius: 6px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24); margin: 8px 0;');
  
  // 使用默认渲染器
  return md.renderer.renderToken(tokens, idx, options);
};

// 消息内容渲染组件 - 将文本转换为带格式的 Markdown 显示
const CustomBubbleMessageRender = ({ content, sources = [] }) => {
  const [openModal, setOpenModal] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState("0");

  const handleClickSource = (index) => {
    setActiveTabKey(String(index)); // 设置当前 tab key
    setOpenModal(true); // 打开弹窗
  };

  const closeModal = () => {
    setOpenModal(false);
  };

  let textContent = "";
  if (typeof content === "string") {
    textContent = content;
  } else if (typeof content === "object" && content !== null) {
    textContent = content.message || content.content || content.text || "";
  } else {
    textContent = String(content || "");
  }

  if (!textContent || textContent.trim() === "") {
    return (
      <Typography>
        <div style={{ color: "#999", fontStyle: "italic" }}>（空消息）</div>
      </Typography>
    );
  }

  try {
    const htmlContent = md.render(textContent.trim().replace(/\\n/g, "\n"));
    const sourcesToShow = 3; // 显示的参考文档数量上限

    return (
      <>
        {/* 主消息内容 */}
        <Typography>
          <div
            className="markdown-content"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </Typography>

        {/* 参考文档列表 */}
        {sources && sources.length > 0 && (
          <div
            style={{
              marginTop: "12px",
              paddingTop: "12px",
              borderTop: "1px solid #e8f4f8",
              backgroundColor: "#f8fcff",
              padding: "12px",
              borderRadius: "6px",
              border: "1px solid #e1f0ff",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                color: "#1890ff",
                marginBottom: "8px",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <BookOutlined style={{ fontSize: "12px" }} />
              参考文档（{sources.length}个）:
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {sources.slice(0, sourcesToShow).map((source, index) => (
                <Tag
                  key={index}
                  color="blue"
                  style={{
                    fontSize: "12px",
                    margin: 0,
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                  title="点击查看详情"
                  onClick={() => handleClickSource(index)}
                >
                  {source.title ||
                    source.fileName ||
                    source.name ||
                    `文档${index + 1}`}
                </Tag>
              ))}

              {sources.length > sourcesToShow && (
                <Tag
                  style={{
                    fontSize: "12px",
                    margin: 0,
                    backgroundColor: "#f0f0f0",
                    color: "#666",
                    border: "1px solid #d9d9d9",
                  }}
                  title={`还有${sources.length - sourcesToShow}个参考文档`}
                >
                  +{sources.length - sourcesToShow}个
                </Tag>
              )}
            </div>
          </div>
        )}

        {/* 弹窗 + Tabs 切换文档内容 */}
        <Modal
          title="参考内容"
          open={openModal}
          onCancel={closeModal}
          footer={null}
          width={720}
          styles={{
            body: {
              maxHeight: "60vh",
              overflowY: "auto",
            },
          }}
        >
          <Tabs
            activeKey={activeTabKey}
            onChange={(key) => setActiveTabKey(key)}
            items={sources.map((src, index) => ({
              label:
                src.title || src.fileName || src.name || `文档${index + 1}`,
              key: String(index), // 保证 key 是字符串类型
              children: (
                <div
                  className="markdown-content"
                  dangerouslySetInnerHTML={{
                    __html: md.render(
                      (src?.content || "").trim().replace(/\\n/g, "\n")
                    ),
                  }}
                />
              ),
            }))}
          />
        </Modal>
      </>
    );
  } catch (error) {
    console.error("❌ Markdown 渲染错误:", error);
    return (
      <Typography>
        <div style={{ color: "red" }}>Markdown 渲染出错: {error.message}</div>
      </Typography>
    );
  }
};

var latestUserContent = {};

// 流式消息气泡组件 - 支持用户和AI消息的差异化显示
const StreamingBubble = ({
  content,
  isTyping,
  placement = "start",
  sources = [],
  error = false,
  messageId,
  style,
}) => {
  const isUser = placement === "end";

  // 调试信息：检查StreamingBubble收到的sources
  if (DEBUG_MODE && !isUser) {
    console.log("StreamingBubble - AI消息sources数据:", {
      messageId,
      sourcesCount: sources.length,
      sourcesPreview: sources.map((s) => ({
        title: s.title,
        fileName: s.fileName,
        name: s.name,
      })),
    });
  }

  const { token } = theme.useToken();
  const onCopy = (textToCopy) => {
    message.success(`复制成功`);
  };
  const onReload = () => {
    // TODO 实现重载功能
    message.warning(`TODO: 实现重载功能 - 最新用户消息: ${latestUserContent}`);
  };
  const onLike = () => {
    message.success(`🎉点赞🎉`);
  };
  const onDislike = () => {
    message.info(`☹️`);
  };
  if (isUser) {
    latestUserContent = content;
    // 用户消息：右侧显示，蓝色头像
    return (
      <div
        data-message-id={messageId}
        className="user-message-container"
        style={style}
      >
        <Bubble
          placement="end"
          content={content}
          avatar={{
            icon: <UserOutlined />,
            style: {
              backgroundColor: "#1890ff",
              color: "white",
            },
          }}
          shape="round"
          variant="outlined"
          className="bubble-content-wrapper"
        />
      </div>
    );
  }

  // AI消息：左侧显示，绿色头像，支持流式打字效果
  return (
    <div
      data-message-id={messageId}
      className="ai-message-container"
      style={style}
    >
      <Bubble
        avatar={{
          icon: <RobotOutlined />,
          style: {
            backgroundColor: "#52c41a",
            color: "white",
          },
        }}
        content={content}
        typing={
          isTyping
            ? {
                step: 3, // 每次显示3个字符，减少闪烁
                interval: 20, // 20ms间隔，合适的打字速度
              }
            : false
        }
        placement="start"
        messageRender={(bubbleContent) => (
          <CustomBubbleMessageRender
            content={bubbleContent}
            sources={sources}
          />
        )}
        shape="round"
        variant="outlined"
        footer={(messageContext) => (
          <Space size={token.paddingXXS}>
            <Button
              color="default"
              variant="text"
              size="small"
              onClick={() => onReload()}
              icon={<ReloadOutlined />}
            />
            <Button
              color="default"
              variant="text"
              size="small"
              onClick={() => onCopy(messageContext)}
              icon={<CopyOutlined />}
            />
            <Button
              type="text"
              size="small"
              onClick={() => {
                onLike();
              }}
              icon={<LikeOutlined />}
            />
            <Button
              type="text"
              size="small"
              onClick={() => {
                onDislike();
              }}
              icon={<DislikeOutlined />}
            />
          </Space>
        )}
        className="bubble-content-wrapper"
      />
    </div>
  );
};

// RAG参数配置组件 - 动态渲染不同类型的参数控件
const RagParamsConfig = ({ ragMethodDetails, ragParams, onParamsChange }) => {
  if (!ragMethodDetails) {
    return (
      <div style={{ textAlign: "center", padding: "20px", color: "#999" }}>
        <QuestionCircleOutlined
          style={{ fontSize: "24px", marginBottom: "8px" }}
        />
        <div style={{ fontSize: "14px" }}>请先选择知识库以配置RAG参数</div>
      </div>
    );
  }

  const handleParamChange = (paramKey, value) => {
    onParamsChange({ [paramKey]: value });
  };

  // 根据参数类型渲染不同的控件（滑块、开关、选择器等）
  const renderParamControl = (paramKey, paramConfig) => {
    const currentValue = ragParams[paramKey] ?? paramConfig.default;

    if (paramConfig.type === "integer" || paramConfig.type === "number") {
      return (
        <div key={paramKey} style={{ marginBottom: "16px" }}>
          <div
            style={{
              marginBottom: "8px",
              fontSize: "13px",
              fontWeight: "bold",
            }}
          >
            {paramConfig.label || paramKey}
          </div>
          <Slider
            min={paramConfig.min || 1}
            max={paramConfig.max || 100}
            value={currentValue}
            onChange={(value) => handleParamChange(paramKey, value)}
            marks={{
              [paramConfig.min || 1]: paramConfig.min || 1,
              [paramConfig.max || 100]: paramConfig.max || 100,
            }}
            tooltip={{ formatter: (value) => `${value}` }}
          />
          <div
            style={{
              textAlign: "center",
              fontSize: "12px",
              color: "#666",
              marginTop: "4px",
            }}
          >
            当前值: {currentValue}
          </div>
        </div>
      );
    } else if (paramConfig.type === "boolean") {
      return (
        <div key={paramKey} style={{ marginBottom: "16px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: "bold" }}>
              {paramConfig.label || paramKey}
            </span>
            <Switch
              checked={currentValue}
              onChange={(checked) => handleParamChange(paramKey, checked)}
              size="small"
            />
          </div>
          {paramConfig.description && (
            <div style={{ fontSize: "11px", color: "#666", marginTop: "4px" }}>
              {paramConfig.description}
            </div>
          )}
        </div>
      );
    } else if (paramConfig.type === "select") {
      return (
        <div key={paramKey} style={{ marginBottom: "16px" }}>
          <div
            style={{
              marginBottom: "8px",
              fontSize: "13px",
              fontWeight: "bold",
            }}
          >
            {paramConfig.label || paramKey}
          </div>
          <Select
            size="small"
            style={{ width: "100%" }}
            value={currentValue}
            onChange={(value) => handleParamChange(paramKey, value)}
          >
            {paramConfig.options?.map((option) => (
              <Select.Option key={option.value} value={option.value}>
                {option.label}
              </Select.Option>
            ))}
          </Select>
        </div>
      );
    } else {
      return (
        <div key={paramKey} style={{ marginBottom: "16px" }}>
          <div
            style={{
              marginBottom: "8px",
              fontSize: "13px",
              fontWeight: "bold",
            }}
          >
            {paramConfig.label || paramKey}
          </div>
          <InputNumber
            size="small"
            style={{ width: "100%" }}
            value={currentValue}
            onChange={(value) => handleParamChange(paramKey, value)}
          />
        </div>
      );
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "16px", textAlign: "center" }}>
        <Tag color="blue" style={{ fontSize: "12px" }}>
          {ragMethodDetails.name}
        </Tag>
      </div>
      <div
        style={{
          fontSize: "12px",
          color: "#666",
          marginBottom: "16px",
          textAlign: "center",
        }}
      >
        {ragMethodDetails.description}
      </div>

      {ragMethodDetails.searchParams &&
      Object.keys(ragMethodDetails.searchParams).length > 0 ? (
        Object.entries(ragMethodDetails.searchParams).map(([key, config]) =>
          renderParamControl(key, config)
        )
      ) : (
        <div style={{ textAlign: "center", color: "#999", fontSize: "12px" }}>
          暂无可配置参数
        </div>
      )}
    </div>
  );
};

// 主组件 - 基于 Ant Design X 的流式 RAG 问答界面
const RAGChatX = () => {
  const { id: knowledgeBaseId } = useParams();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();

  // 核心状态管理
  const [knowledgeBase, setKnowledgeBase] = useState(null);
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [kbSelectLoading, setKbSelectLoading] = useState(false);
  const [input, setInput] = useState("");

  // RAG 方法配置相关状态
  const [loadingMethodDetails, setLoadingMethodDetails] = useState(false);
  const [ragMethodDetails, setRagMethodDetails] = useState(null);
  const [ragParams, setRagParams] = useState({});
  const [ragMethodType, setRagMethodType] = useState(null);

  // 自动滚动 ref
  const messagesEndRef = useRef(null);

  // 使用 useRef 保存最新状态的引用，避免闭包问题
  const stateRef = useRef();
  stateRef.current = {
    knowledgeBase,
    ragMethodType,
    ragParams,
    messageApi,
  };

  // 核心请求处理函数 - 处理流式SSE响应
  const handleAgentRequest = useCallback(
    async ({ message }, { onUpdate, onSuccess, onError }) => {
      // 从 ref 中获取最新状态，确保数据一致性
      const {
        knowledgeBase: currentKB,
        ragMethodType: currentRagMethodType,
        ragParams: currentRagParams,
        messageApi: currentMessageApi,
      } = stateRef.current;

      if (DEBUG_MODE) {
        console.info("Agent request triggered:", {
          message,
          knowledgeBase: currentKB?.name,
          knowledgeBaseId: currentKB?.id,
          hasKnowledgeBase: !!currentKB,
          ragMethodType: currentRagMethodType,
          ragParams: currentRagParams,
        });
      }

      if (!currentKB) {
        const errorMsg = "请先选择一个知识库";
        console.error("Agent: 知识库检查失败 - knowledgeBase is", currentKB);
        currentMessageApi.error(errorMsg);
        onError(new Error(errorMsg));
        return;
      }

      try {
        // 根据不同RAG方法构建相应的API调用参数
        const ragMethodId = currentRagMethodType || currentKB.ragMethod;

        // 提取配置参数
        const topk = currentRagParams["top-k"] || 5;
        const maxRes = currentRagParams["max-res"] || 10;
        const queryRewriting = currentRagParams["query-rewriting"] || false;
        const queryDecomposition =
          currentRagParams["query-decomposition"] || false;

        if (DEBUG_MODE) {
          console.info(
            "Using RAG method:",
            ragMethodId,
            "with params:",
            currentRagParams
          );
        }

        // API路径构建：根据RAG方法类型选择不同的端点
        let apiUrl;
        switch (ragMethodId) {
          case "naive":
            const naiveParams = new URLSearchParams({
              question: message,
              topk: topk,
              query_rewriting: queryRewriting,
              query_decomposition: queryDecomposition,
            });
            apiUrl = `/api/kb/chat/naive/${
              currentKB.id
            }?${naiveParams.toString()}`;
            break;
          case "hisem":
            const hisemParams = new URLSearchParams({
              question: message,
              max_res: maxRes,
              query_rewriting: queryRewriting,
              query_decomposition: queryDecomposition,
            });
            apiUrl = `/api/kb/chat/hisem/${
              currentKB.id
            }?${hisemParams.toString()}`;
            break;
          case "hisem-tree":
            const hisemTreeParams = new URLSearchParams({
              question: message,
              max_res: maxRes,
              query_rewriting: queryRewriting,
              query_decomposition: queryDecomposition,
            });
            apiUrl = `/api/kb/chat/hisem-tree/${
              currentKB.id
            }?${hisemTreeParams.toString()}`;
            break;
          default:
            // 默认使用 naive 方法
            const defaultParams = new URLSearchParams({
              question: message,
              topk: topk,
              query_rewriting: queryRewriting,
              query_decomposition: queryDecomposition,
            });
            apiUrl = `/api/kb/chat/naive/${
              currentKB.id
            }?${defaultParams.toString()}`;
        }

        // 初始化 SSE 流式请求
        const baseURL = api.defaults.baseURL || "";
        const fullUrl = `${baseURL}${apiUrl}`;

        // 设置请求头，包含认证信息
        const token = localStorage.getItem("token");
        const headers = {
          Accept: "text/event-stream",
          "Cache-Control": "no-cache",
        };

        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        if (DEBUG_MODE) {
          console.info("SSE请求URL:", fullUrl);
          console.info("SSE请求头:", headers);
        }

        const response = await fetch(fullUrl, {
          method: "GET",
          headers: headers,
        });

        if (DEBUG_MODE) {
          console.info(
            "Response status:",
            response.status,
            "statusText:",
            response.statusText
          );
        }

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("登录状态已过期，请重新登录");
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // 检查响应的content-type
        const contentType = response.headers.get("content-type");
        if (DEBUG_MODE) {
          console.info("Response content-type:", contentType);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        // 流式数据累积变量
        let accumulatedContent = "";
        let sourcesData = [];
        let hasReceivedDocs = false;

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              if (DEBUG_MODE) {
                console.info("SSE stream finished.");
                console.info("Final accumulated content:", accumulatedContent);
                console.info("Final sources data:", sourcesData);
              }
              // 流式响应结束，返回最终结果
              onSuccess({
                content: accumulatedContent,
                sources: sourcesData,
                role: "assistant",
              });
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.trim() === "") continue;

              // SSE数据格式解析
              let dataLine = line;
              let eventType = null;

              if (line.startsWith("event: ")) {
                eventType = line.slice(7).trim();
                if (DEBUG_MODE) {
                  console.info("SSE事件类型:", eventType);
                }
                continue;
              } else if (line.startsWith("data: ")) {
                dataLine = line.slice(6).trim();
              } else if (line.startsWith("data:")) {
                dataLine = line.slice(5).trim();
              }

              // 错误处理
              if (eventType === "error") {
                const errorMsg = dataLine || "服务器返回错误";
                if (DEBUG_MODE) {
                  console.error("SSE错误事件:", errorMsg);
                }
                throw new Error(errorMsg);
              }

              // 流式响应结束标记
              if (dataLine === "[DONE]") {
                if (DEBUG_MODE) {
                  console.info("接收到结束标记，最终内容:", accumulatedContent);
                }
                onSuccess({
                  message: accumulatedContent,
                  sources: sourcesData,
                });
                return;
              }

              // JSON数据解析和处理
              if (dataLine && dataLine !== "") {
                try {
                  const jsonData = JSON.parse(dataLine);

                  if (DEBUG_MODE) {
                    console.info("解析SSE数据:", jsonData);
                  }

                  // 处理文档来源信息（仅首次接收）
                  if (jsonData.docs && !hasReceivedDocs) {
                    hasReceivedDocs = true;
                    sourcesData = jsonData.docs.map((doc, index) => ({
                      fileName: `文档${index + 1}`,
                      content: doc,
                      confidence: 0.9 - index * 0.1,
                    }));
                    
                    if (DEBUG_MODE) {
                      console.info("接收到文档来源:", sourcesData);
                    }

                    onUpdate("...");
                  }

                  // 处理流式内容更新
                  if (
                    jsonData.choices &&
                    jsonData.choices[0] &&
                    jsonData.choices[0].delta &&
                    jsonData.choices[0].delta.content
                  ) {
                    const contentDelta = jsonData.choices[0].delta.content;
                    accumulatedContent += contentDelta;

                    // 实时更新显示内容
                    onUpdate(accumulatedContent);
                  }
                } catch (parseError) {
                  if (DEBUG_MODE) {
                    console.warn(
                      "解析SSE数据失败:",
                      parseError,
                      "原始数据:",
                      dataLine
                    );
                  }
                  // 解析失败时当作纯文本处理
                  if (dataLine && dataLine.length > 0) {
                    accumulatedContent += dataLine;
                    if (DEBUG_MODE) {
                      console.info("当作纯文本处理:", dataLine);
                    }
                    onUpdate(accumulatedContent);
                  }
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      } catch (error) {
        console.error("SSE请求失败:", error);

        // 错误消息分类处理
        let errorMessage = "很抱歉，处理您的请求时发生了错误，请稍后再试。";

        if (error.message.includes("登录状态已过期")) {
          errorMessage = "登录状态已过期，请重新登录";
          setTimeout(() => {
            localStorage.removeItem("token");
            window.location.href = "/login";
          }, 2000);
        } else if (error.message.includes("HTTP error")) {
          errorMessage = "服务器响应错误，请稍后再试。";
        } else if (
          error.name === "TypeError" &&
          error.message.includes("fetch")
        ) {
          errorMessage = "网络连接失败，请检查网络连接后重试。";
        } else if (error.message.includes("Invalid token")) {
          errorMessage = "认证失败，请重新登录";
        }

        currentMessageApi.error(errorMessage);
        onError(new Error(errorMessage));
      }
    },
    []
  );

  // 创建 Ant Design X Agent 配置
  const agentConfig = useMemo(
    () => ({
      request: handleAgentRequest,
    }),
    [handleAgentRequest]
  );

  const [agent] = useXAgent(agentConfig);

  // 使用 useXChat 管理聊天消息状态
  const chat = useXChat({
    agent: agent,

    transformMessage: (message) => {
      if (DEBUG_MODE) {
        try {
          console.info(
            "Transform message - RAW INPUT:",
            JSON.parse(JSON.stringify(message))
          );
        } catch (e) {
          console.info(
            "Transform message - RAW INPUT (could not stringify):",
            message
          );
        }
        console.info("Transform message - Input type:", typeof message);
      }
      // console.info(
      //   "Transform message - RAW INPUT:",
      //   JSON.parse(JSON.stringify(message))
      // );
      // 默认值
      let content = "";
      let sources = [];
      let role = "assistant";

      // 如果是字符串，直接使用
      if (typeof message === "string") {
        content = message;
      } else if (message && typeof message === "object") {
        // 优先从 chunks 中取（这是最终返回结果）
        const payload = message.chunks ?? message.originMessage ?? message;

        role = payload.role ?? "assistant";
        content = payload.content ?? payload.message ?? "";
        sources = Array.isArray(payload.sources) ? payload.sources : [];

        // 如果是流式 chunk 更新（onUpdate），可以处理 message.chunk
        if (!content && typeof message.chunk === "string") {
          content = message.chunk;
        }
      }

      const result = {
        content,
        role,
        sources,
      };

      if (DEBUG_MODE) {
        const outputDebug = {
          contentPreview:
            result.content.substring(0, 70) +
            (result.content.length > 70 ? "..." : ""),
          contentLength: result.content.length,
          sourcesCount: result.sources.length,
          role: result.role,
        };
        console.info("Transform message - Output:", outputDebug);
      }

      return result;
    },
  });

  const { parsedMessages } = chat;

  // 消息发送处理函数
  const handleSendMessage = () => {
    if (!input.trim()) return;

    if (DEBUG_MODE) {
      console.log("发送消息 - 当前状态:", {
        knowledgeBase: knowledgeBase?.name || null,
        knowledgeBaseId: knowledgeBase?.id || null,
        hasKnowledgeBase: !!knowledgeBase,
        knowledgeBaseFromURL: knowledgeBaseId,
        agent: !!agent,
        chat: !!chat,
      });
    }

    if (!knowledgeBase) {
      messageApi.warning("请先选择一个知识库");
      return;
    }

    chat.onRequest(input.trim());
    setInput("");
  };

  // RAG参数变更处理
  const handleRagParamsChange = (newParams) => {
    setRagParams((prevParams) => ({ ...prevParams, ...newParams }));
  };

  // 自动滚动到最新消息
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [parsedMessages]);

  // 获取知识库详情
  const fetchKnowledgeBaseDetails = useCallback(
    async (id) => {
      if (!id) {
        setKnowledgeBase(null);
        // 直接调用清理函数而不是通过 useCallback
        try {
          if (chat.onReset) {
            chat.onReset();
          } else if (chat.resetMessages) {
            chat.resetMessages();
          } else if (chat.clearMessages) {
            chat.clearMessages();
          }
        } catch (error) {
          console.warn("Failed to clear chat messages:", error);
        }
        setRagParams({});
        setRagMethodDetails(null);
        setRagMethodType(null);
        return;
      }
      setDetailsLoading(true);
      try {
        const response = await knowledgeBaseAPI.getKnowledgeBase(id);
        if (DEBUG_MODE) {
          console.log("KB details response:", response.data);
        }

        // 处理直接返回的知识库对象格式
        if (
          response.data &&
          typeof response.data === "object" &&
          !response.data.hasOwnProperty("code") &&
          !response.data.hasOwnProperty("success")
        ) {
          const kbData = response.data;
          setKnowledgeBase(kbData);

          if (DEBUG_MODE) {
            console.log("设置知识库 (直接格式):", {
              id: kbData.id,
              name: kbData.name,
              ragMethod: kbData.ragMethod,
            });
          }

          // 获取关联的RAG方法配置
          if (kbData.ragMethod) {
            // 直接调用而不是通过 useCallback 引用
            if (!kbData.ragMethod) {
              setRagMethodDetails(null);
              setRagParams({});
              return;
            }

            setLoadingMethodDetails(true);
            try {
              const methodConfig = getMethodConfig(kbData.ragMethod);

              if (methodConfig) {
                setRagMethodDetails(methodConfig);
                setRagMethodType(kbData.ragMethod);

                const initialSearchParams = {};
                if (methodConfig.searchParams) {
                  Object.keys(methodConfig.searchParams).forEach((paramKey) => {
                    const paramConfig = methodConfig.searchParams[paramKey];
                    initialSearchParams[paramKey] =
                      paramConfig.default !== undefined
                        ? paramConfig.default
                        : paramConfig;
                  });
                }
                setRagParams(initialSearchParams);
              } else {
                messageApi.warning("未找到RAG方法配置信息，将使用默认参数");
                setRagMethodDetails(null);
                setRagParams({});
              }
            } catch (error) {
              console.error("获取RAG方法详情失败:", error);
              messageApi.error("获取RAG方法参数失败，将使用默认参数");
              setRagMethodDetails(null);
              setRagParams({});
            } finally {
              setLoadingMethodDetails(false);
            }
          } else {
            setRagMethodDetails(null);
            setRagParams({});
          }
        }
        // 处理标准API响应格式
        else if (
          (response.data && response.data.success) ||
          (response.data && response.data.code === 200)
        ) {
          const kbData = response.data.data;
          setKnowledgeBase(kbData);

          if (DEBUG_MODE) {
            console.log("设置知识库 (标准格式):", {
              id: kbData.id,
              name: kbData.name,
              ragMethod: kbData.ragMethod,
            });
          }

          if (kbData.ragMethod) {
            // 直接调用而不是通过 useCallback 引用
            if (!kbData.ragMethod) {
              setRagMethodDetails(null);
              setRagParams({});
              return;
            }

            setLoadingMethodDetails(true);
            try {
              const methodConfig = getMethodConfig(kbData.ragMethod);

              if (methodConfig) {
                setRagMethodDetails(methodConfig);
                setRagMethodType(kbData.ragMethod);

                const initialSearchParams = {};
                if (methodConfig.searchParams) {
                  Object.keys(methodConfig.searchParams).forEach((paramKey) => {
                    const paramConfig = methodConfig.searchParams[paramKey];
                    initialSearchParams[paramKey] =
                      paramConfig.default !== undefined
                        ? paramConfig.default
                        : paramConfig;
                  });
                }
                setRagParams(initialSearchParams);
              } else {
                messageApi.warning("未找到RAG方法配置信息，将使用默认参数");
                setRagMethodDetails(null);
                setRagParams({});
              }
            } catch (error) {
              console.error("获取RAG方法详情失败:", error);
              messageApi.error("获取RAG方法参数失败，将使用默认参数");
              setRagMethodDetails(null);
              setRagParams({});
            } finally {
              setLoadingMethodDetails(false);
            }
          } else {
            setRagMethodDetails(null);
            setRagParams({});
          }
        } else {
          messageApi.error(response.data?.message || "获取知识库详情失败");
          setKnowledgeBase(null);
        }
      } catch (error) {
        console.error("获取知识库详情失败:", error);
        messageApi.error("获取知识库详情失败，请稍后再试");
        setKnowledgeBase(null);
      } finally {
        setDetailsLoading(false);
      }
    },
    [] // 移除所有依赖，直接使用实例
  );

  // 知识库选择变更处理
  const handleKnowledgeBaseChange = (id) => {
    if (DEBUG_MODE) {
      console.log("知识库选择变化:", {
        selectedId: id,
        previousKB: knowledgeBase?.name || null,
      });
    }

    // 清空现有消息
    try {
      if (chat.onReset) {
        chat.onReset();
      } else if (chat.resetMessages) {
        chat.resetMessages();
      } else if (chat.clearMessages) {
        chat.clearMessages();
      } else {
        console.warn("No clear method found on chat object");
      }
    } catch (error) {
      console.warn("Failed to clear chat messages:", error);
    }

    if (id) {
      navigate(`/knowledge_base/rag-x/${id}`);
    } else {
      navigate("/knowledge_base/rag-x");
      setKnowledgeBase(null);
      setRagParams({});
      setRagMethodDetails(null);
      setRagMethodType(null);
    }
  };

  // 获取知识库列表
  const fetchKnowledgeBases = useCallback(async () => {
    setListLoading(true);
    setKbSelectLoading(true);
    try {
      const response = await knowledgeBaseAPI.getKnowledgeBases();
      if (DEBUG_MODE) {
        console.log("Knowledge bases response:", response.data);
      }

      // 处理直接返回数组的响应格式
      if (response.data && Array.isArray(response.data)) {
        const kbs = response.data;
        kbs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setKnowledgeBases(kbs);
      }
      // 处理标准API响应格式
      else if (response.data && response.data.code === 200) {
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
  }, []); // 移除 messageApi 依赖，直接使用实例

  // 组件初始化：获取知识库列表
  useEffect(() => {
    fetchKnowledgeBases();
  }, []); // 只在组件挂载时执行一次

  // URL参数变化时获取对应知识库详情
  useEffect(() => {
    // if (DEBUG_MODE) {
    //   console.log("useEffect knowledgeBaseId changed:", {
    //     knowledgeBaseId,
    //     currentKnowledgeBase: knowledgeBase?.name || null,
    //   });
    // }
    fetchKnowledgeBaseDetails(knowledgeBaseId);
  }, [knowledgeBaseId]); // 只依赖 knowledgeBaseId

  // 加载状态显示
  if (listLoading) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <Spin size="large" tip="加载知识库列表中..." />
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 112px)",
      }}
    >
      {contextHolder}

      {/* 页面标题和描述 */}
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
          知识库问答 (流式渲染)
        </Title>
        <Paragraph
          style={{
            color: "rgba(255, 255, 255, 0.85)",
            fontSize: "14px",
            marginBottom: 0,
          }}
        >
          基于RAG技术的智能问答系统，使用Ant Design X原生流式响应
        </Paragraph>
      </div>

      {/* 主要布局：左侧对话区域，右侧配置面板 */}
      <Row gutter={24} style={{ flex: 1, overflow: "hidden" }}>
        {/* 左侧：对话界面 */}
        <Col
          span={18}
          style={{ display: "flex", flexDirection: "column", height: "100%" }}
        >
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
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "auto",
            }}
            styles={{
              body: {
                flex: 1,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                padding: "16px",
              },
            }} // 调整内边距
          >
            {/* 消息显示区域 */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                overflowX: "hidden",
                padding: "16px 0",
                marginBottom: "16px",
                display: "flex", // 设置弹性布局
                flexDirection: "column", // 设置垂直方向
              }}
            >
              {parsedMessages.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "100px 20px",
                    color: "#999",
                  }}
                >
                  <RobotOutlined
                    style={{ fontSize: "48px", marginBottom: "16px" }}
                  />
                  <div>开始与 AI 助手对话吧！</div>
                </div>
              ) : (
                parsedMessages.map((msg, index) => {
                  // console.info(msg);
                  const { id, message, status } = msg;

                  // 判断 message 是字符串（用户消息）还是对象（AI 回复）
                  const isStringMessage = typeof message === "string";

                  const content = isStringMessage
                    ? message
                    : message?.content ?? "";
                  const role =
                    status === "local" ? "user" : message?.role ?? "assistant";

                  const sources =
                    !isStringMessage && Array.isArray(message?.sources)
                      ? message.sources
                      : [];

                  // 正确判断：status === 'local' 就是用户发的消息
                  const isUserMessage = status === "local";

                  const isTyping = status === "loading" && role === "assistant";

                  const isError = status === "error";

                  return (
                    <StreamingBubble
                      key={id || index}
                      messageId={id}
                      content={content}
                      isTyping={isTyping}
                      placement={isUserMessage ? "end" : "start"}
                      sources={sources}
                      error={isError}
                      style={isUserMessage ? { alignSelf: "flex-end" } : {}}
                    />
                  );
                })
              )}
              {/* 滚动锚点 */}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入区域 */}
            <div
              style={{
                borderTop: "1px solid #f0f0f0",
                paddingTop: "16px",
                display: "flex",
                gap: "12px",
                alignItems: "flex-end",
              }}
            >
              <Input.TextArea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyUp={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="输入您的问题..."
                autoSize={{ minRows: 1, maxRows: 4 }}
                disabled={agent.isRequesting()}
                style={{ flex: 1 }}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={agent.isRequesting()}
                onClick={handleSendMessage}
                disabled={!input.trim()}
              >
                发送
              </Button>
            </div>
          </Card>
        </Col>

        {/* 右侧：配置面板 */}
        <Col span={6}>
          {/* 知识库选择 */}
          <Card
            title={
              <div style={{ display: "flex", alignItems: "center" }}>
                <DatabaseOutlined
                  style={{ marginRight: 8, color: "#1890ff" }}
                />
                <span>知识库</span>
              </div>
            }
            size="small"
            style={{ marginBottom: 16 }}
          >
            <Select
              showSearch
              style={{ width: "100%" }}
              placeholder="选择知识库"
              loading={kbSelectLoading}
              value={knowledgeBase?.id}
              onChange={handleKnowledgeBaseChange}
              optionFilterProp="children"
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {knowledgeBases.map((kb) => (
                <Option key={kb.id} value={kb.id}>
                  {kb.name}
                </Option>
              ))}
            </Select>

            {/* 简化的知识库状态显示 */}
            {detailsLoading ? (
              <div style={{ textAlign: "center", padding: "12px" }}>
                <Spin size="small" />
              </div>
            ) : knowledgeBase ? (
              <div style={{ marginTop: "12px", textAlign: "center" }}>
                <Tag color="green" style={{ fontSize: "12px" }}>
                  已选择: {knowledgeBase.name}
                </Tag>
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "12px",
                  color: "#999",
                  fontSize: "12px",
                }}
              >
                请选择知识库
              </div>
            )}
          </Card>

          {/* RAG参数配置 */}
          <Card
            title={
              <div style={{ display: "flex", alignItems: "center" }}>
                <SettingOutlined style={{ marginRight: 8, color: "#52c41a" }} />
                <span>RAG配置</span>
              </div>
            }
            size="small"
          >
            {loadingMethodDetails ? (
              <div style={{ textAlign: "center", padding: "20px" }}>
                <Spin size="small" />
                <div
                  style={{ marginTop: "8px", color: "#666", fontSize: "12px" }}
                >
                  加载参数...
                </div>
              </div>
            ) : (
              <RagParamsConfig
                ragMethodDetails={ragMethodDetails}
                ragParams={ragParams}
                onParamsChange={(updatedParams) =>
                  setRagParams((prev) => ({ ...prev, ...updatedParams }))
                }
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default RAGChatX;
