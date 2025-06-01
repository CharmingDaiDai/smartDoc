// ==================== 导入依赖 ====================
// 导入 Ant Design 图标组件 - 用于界面各种操作按钮的图标
import {
    CloudUploadOutlined,
    CopyOutlined,
    DeleteOutlined,
    DislikeOutlined,
    EditOutlined,
    EllipsisOutlined,
    HeartOutlined,
    LikeOutlined,
    PaperClipOutlined,
    PlusOutlined,
    QuestionCircleOutlined,
    ReloadOutlined,
    ScheduleOutlined,
    ShareAltOutlined,
} from '@ant-design/icons';

// 导入 Ant Design X 组件 - 专门用于构建 AI 聊天界面的组件库
import {Attachments, Bubble, Conversations, Prompts, Sender, useXAgent, useXChat, Welcome,} from '@ant-design/x';

// 导入 Ant Design 基础组件
import {Avatar, Button, Flex, message, Space, Spin} from 'antd';

// 导入样式相关
import {createStyles} from 'antd-style'; // 用于创建 CSS-in-JS 样式
import dayjs from 'dayjs'; // 日期处理库
import React, {useEffect, useRef, useState} from 'react';

// ==================== TypeScript 异步函数支持 ====================
// 这是 TypeScript 编译器生成的辅助函数，用于支持 async/await 语法
// 在编译后的 JavaScript 中处理 Promise 和异步操作
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };

// ==================== 常量定义 ====================
// 默认会话列表 - 初始化时显示的示例会话
const DEFAULT_CONVERSATIONS_ITEMS = [
  {
    key: 'default-0',
    label: 'What is Ant Design X?',           // 什么是 Ant Design X？
    group: 'Today',                           // 分组：今天
  },
];

// 热门话题配置 - 在欢迎页面显示的热门话题列表
const HOT_TOPICS = {
  key: '1',
  label: 'Hot Topics',                        // 热门话题标题
  children: [
    {
      key: '1-1',
      description: 'What has Ant Design X upgraded?',        // Ant Design X 升级了什么？
      icon: <span style={{ color: '#f93a4a', fontWeight: 700 }}>1</span>,  // 排行榜数字
    },
  ],
};

// 设计指南配置 - RICH 设计理念的四个核心要素
const DESIGN_GUIDE = {
  key: '2',
  label: 'Design Guide',                      // 设计指南标题
  children: [
    {
      key: '2-1',
      icon: <HeartOutlined />,
      label: 'Intention',                     // 意图 - AI 理解用户需求并提供解决方案
      description: 'AI understands user needs and provides solutions.',
    },
  ],
};

// 发送器快捷提示 - 输入框下方的快捷操作按钮
const SENDER_PROMPTS = [
  {
    key: '1',
    description: 'Upgrades',                 // 升级相关话题
    icon: <ScheduleOutlined />,
  },
];
// ==================== 样式定义 ====================
// 使用 antd-style 创建组件样式，支持主题变量和 CSS-in-JS
const useStyle = createStyles(({ token, css }) => {
  return {
    // 整体布局容器样式
    layout: css`
      width: 100%;
      min-width: 1000px;                              // 最小宽度限制
      height: 100vh;                                  // 全屏高度
      display: flex;                                  // 横向布局
      background: ${token.colorBgContainer};          // 背景色使用主题变量
      font-family: AlibabaPuHuiTi, ${token.fontFamily}, sans-serif;  // 字体设置
    `,
    
    // ==================== 侧边栏样式 ====================
    sider: css`
      background: ${token.colorBgLayout}80;           // 半透明背景
      width: 280px;                                   // 固定宽度
      height: 100%;
      display: flex;
      flex-direction: column;                         // 垂直布局
      padding: 0 12px;
      box-sizing: border-box;
    `,
    
    // Logo 区域样式
    logo: css`
      display: flex;
      align-items: center;
      justify-content: start;
      padding: 0 24px;
      box-sizing: border-box;
      gap: 8px;
      margin: 24px 0;

      span {
        font-weight: bold;
        color: ${token.colorText};
        font-size: 16px;
      }
    `,
    
    // 新建会话按钮样式
    addBtn: css`
      background: #1677ff0f;                          // 浅蓝色背景
      border: 1px solid #1677ff34;                    // 蓝色边框
      height: 40px;
    `,
    
    // 会话列表容器样式
    conversations: css`
      flex: 1;                                        // 占满剩余空间
      overflow-y: auto;                               // 垂直滚动
      margin-top: 12px;
      padding: 0;

      .ant-conversations-list {
        padding-inline-start: 0;
      }
    `,
    
    // 侧边栏底部样式
    siderFooter: css`
      border-top: 1px solid ${token.colorBorderSecondary};  // 顶部分割线
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    `,
    
    // ==================== 聊天区域样式 ====================
    chat: css`
      height: 100%;
      width: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;                         // 垂直布局：消息列表 + 输入框
      padding-block: ${token.paddingLG}px;
      gap: 16px;
    `,
    
    // 聊天提示样式
    chatPrompt: css`
      .ant-prompts-label {
        color: #000000e0 !important;
      }
      .ant-prompts-desc {
        color: #000000a6 !important;
        width: 100%;
      }
      .ant-prompts-icon {
        color: #000000a6 !important;
      }
    `,
    
    // 消息列表容器样式
    chatList: css`
      flex: 1;                                        // 占满剩余空间
      overflow: auto;                                 // 自动滚动
    `,
    
    // 加载中消息的特殊样式
    loadingMessage: css`
      background-image: linear-gradient(90deg, #ff6b23 0%, #af3cb8 31%, #53b6ff 89%);  // 彩色渐变底边
      background-size: 100% 2px;
      background-repeat: no-repeat;
      background-position: bottom;
    `,
    
    // 空状态占位样式
    placeholder: css`
      padding-top: 32px;
    `,
    
    // ==================== 发送器样式 ====================
    sender: css`
      width: 100%;
      max-width: 700px;                               // 最大宽度限制
      margin: 0 auto;                                 // 居中显示
    `,
    
    // 语音按钮样式
    speechButton: css`
      font-size: 18px;
      color: ${token.colorText} !important;
    `,
    
    // 发送器提示词样式
    senderPrompt: css`
      width: 100%;
      max-width: 700px;
      margin: 0 auto;
      color: ${token.colorText};
    `,
  };
});
// ==================== 主组件定义 ====================
const Independent = () => {
  const { styles } = useStyle();                     // 获取样式对象
  const abortController = useRef(null);              // 用于取消 API 请求的控制器
  
  // ==================== 状态管理 ====================
  const [messageHistory, setMessageHistory] = useState({});                    // 消息历史记录，按会话 ID 存储
  const [conversations, setConversations] = useState(DEFAULT_CONVERSATIONS_ITEMS);  // 会话列表
  const [curConversation, setCurConversation] = useState(DEFAULT_CONVERSATIONS_ITEMS[0].key);  // 当前活跃会话
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);               // 附件面板开关状态
  const [attachedFiles, setAttachedFiles] = useState([]);                      // 已附加的文件列表
  const [inputValue, setInputValue] = useState('');                            // 输入框内容
  
  /**
   * 🔔 AI 服务配置说明
   * 请将 BASE_URL, PATH, MODEL, API_KEY 替换为你自己的值
   */
  // ==================== AI 代理配置 ====================
  const [agent] = useXAgent({
    baseURL: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',  // API 基础 URL
    model: 'glm-4-flash',                                    // 使用的 AI 模型
    dangerouslyApiKey: 'Bearer 8af2f6a0b0197d510612ec82547a9a1d.dNP2dmQIZpoeusa0',                // API 密钥（需要替换为真实值）
  });
  
  const loading = agent.isRequesting();              // 获取请求状态，用于显示加载动画
  
  // ==================== 聊天功能配置 ====================
  const { onRequest, messages, setMessages } = useXChat({
    agent,                                           // 传入 AI 代理
    
    // 请求失败时的回调处理
    requestFallback: (_, { error }) => {
      if (error.name === 'AbortError') {
        return {
          content: 'Request is aborted',             // 请求被取消
          role: 'assistant',
        };
      }
      return {
        content: 'Request failed, please try again!',  // 请求失败，请重试
        role: 'assistant',
      };
    },
    
    // 消息转换处理 - 处理流式响应和思考过程显示
    transformMessage: info => {
      var _a, _b, _c, _d, _e, _f, _g;
      const { originMessage, chunk } = info || {};
      let currentContent = '';                       // 当前消息内容
      let currentThink = '';                         // 当前思考内容（DeepSeek-R1 的推理过程）
      
      try {
        // 解析流式响应数据
        if (
          (chunk === null || chunk === void 0 ? void 0 : chunk.data) &&
          !(chunk === null || chunk === void 0 ? void 0 : chunk.data.includes('DONE'))
        ) {
          const message = JSON.parse(chunk === null || chunk === void 0 ? void 0 : chunk.data);
          
          // 提取推理内容（思考过程）
          currentThink =
            ((_c =
              (_b =
                (_a = message === null || message === void 0 ? void 0 : message.choices) === null ||
                _a === void 0
                  ? void 0
                  : _a[0]) === null || _b === void 0
                ? void 0
                : _b.delta) === null || _c === void 0
              ? void 0
              : _c.reasoning_content) || '';
              
          // 提取回答内容
          currentContent =
            ((_f =
              (_e =
                (_d = message === null || message === void 0 ? void 0 : message.choices) === null ||
                _d === void 0
                  ? void 0
                  : _d[0]) === null || _e === void 0
                ? void 0
                : _e.delta) === null || _f === void 0
              ? void 0
              : _f.content) || '';
        }
      } catch (error) {
        console.error(error);
      }
      
      // 组装完整的消息内容，包含思考过程和回答
      let content = '';
      if (
        !(originMessage === null || originMessage === void 0 ? void 0 : originMessage.content) &&
        currentThink
      ) {
        // 开始思考阶段
        content = `<think>${currentThink}`;
      } else if (
        ((_g =
          originMessage === null || originMessage === void 0 ? void 0 : originMessage.content) ===
          null || _g === void 0
          ? void 0
          : _g.includes('<think>')) &&
        !(originMessage === null || originMessage === void 0
          ? void 0
          : originMessage.content.includes('</think>')) &&
        currentContent
      ) {
        // 思考结束，开始回答
        content = `${originMessage === null || originMessage === void 0 ? void 0 : originMessage.content}</think>${currentContent}`;
      } else {
        // 继续添加内容
        content = `${(originMessage === null || originMessage === void 0 ? void 0 : originMessage.content) || ''}${currentThink}${currentContent}`;
      }
      
      return {
        content: content,
        role: 'assistant',
      };
    },
    
    // 保存请求控制器引用，用于取消请求
    resolveAbortController: controller => {
      abortController.current = controller;
    },
  });
  // ==================== 事件处理函数 ====================
  // 提交消息处理函数
  const onSubmit = val => {
    if (!val) return;                                // 空内容不提交
    if (loading) {
      message.error('Request is in progress, please wait for the request to complete.');  // 请求进行中，请等待请求完成
      return;
    }
    // 发送消息给 AI
    onRequest({
      stream: true,                                  // 启用流式响应
      message: { role: 'user', content: val },      // 用户消息
    });
  };
  
  // ==================== UI 组件定义 ====================
  
  // 侧边栏组件 - 包含 Logo、新建会话按钮、会话列表、用户信息
  const chatSider = (
    <div className={styles.sider}>
      {/* 🌟 Logo 区域 */}
      <div className={styles.logo}>
        <img
          src="https://mdn.alipayobjects.com/huamei_iwk9zp/afts/img/A*eco6RrQhxbMAAAAAAAAAAAAADgCCAQ/original"
          draggable={false}
          alt="logo"
          width={24}
          height={24}
        />
        <span>Ant Design X</span>
      </div>

      {/* 🌟 新建会话按钮 */}
      <Button
        onClick={() => {
          const now = dayjs().valueOf().toString();  // 生成唯一 ID
          setConversations([
            {
              key: now,
              label: `New Conversation ${conversations.length + 1}`,  // 新会话标题
              group: 'Today',
            },
            ...conversations,                        // 添加到会话列表顶部
          ]);
          setCurConversation(now);                   // 切换到新会话
          setMessages([]);                           // 清空消息列表
        }}
        type="link"
        className={styles.addBtn}
        icon={<PlusOutlined />}
      >
        New Conversation
      </Button>

      {/* 🌟 会话管理组件 */}
      <Conversations
        items={conversations}                        // 会话列表数据
        className={styles.conversations}
        activeKey={curConversation}                  // 当前活跃会话
        onActiveChange={val =>                       // 切换会话处理
          __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            (_a = abortController.current) === null || _a === void 0 ? void 0 : _a.abort();  // 取消当前请求
            // 异步执行可能导致时序问题，未来版本将添加 sessionId 功能来解决
            setTimeout(() => {
              setCurConversation(val);               // 切换会话
              setMessages(
                (messageHistory === null || messageHistory === void 0
                  ? void 0
                  : messageHistory[val]) || [],      // 加载会话历史消息
              );
            }, 100);
          })
        }
        groupable                                    // 启用分组功能
        styles={{ item: { padding: '0 8px' } }}
        menu={conversation => ({                     // 会话右键菜单
          items: [
            {
              label: 'Rename',                       // 重命名功能
              key: 'rename',
              icon: <EditOutlined />,
            },
            {
              label: 'Delete',                       // 删除功能
              key: 'delete',
              icon: <DeleteOutlined />,
              danger: true,
              onClick: () => {
                var _a;
                const newList = conversations.filter(item => item.key !== conversation.key);  // 从列表中移除
                const newKey =
                  (_a = newList === null || newList === void 0 ? void 0 : newList[0]) === null ||
                  _a === void 0
                    ? void 0
                    : _a.key;
                setConversations(newList);
                // 删除操作会修改 curConversation 并触发 onActiveChange，需要延迟执行确保最终覆盖正确
                // 此功能将在未来版本中修复
                setTimeout(() => {
                  if (conversation.key === curConversation) {
                    setCurConversation(newKey);      // 切换到第一个会话
                    setMessages(
                      (messageHistory === null || messageHistory === void 0
                        ? void 0
                        : messageHistory[newKey]) || [],
                    );
                  }
                }, 200);
              },
            },
          ],
        })}
      />

      {/* 侧边栏底部 - 用户头像和帮助按钮 */}
      <div className={styles.siderFooter}>
        <Avatar size={24} />
        <Button type="text" icon={<QuestionCircleOutlined />} />
      </div>
    </div>
  );
  // 聊天消息列表组件 - 显示消息气泡或欢迎页面
  const chatList = (
    <div className={styles.chatList}>
      {(messages === null || messages === void 0 ? void 0 : messages.length) ? (
        /* 🌟 消息列表 - 有消息时显示聊天气泡 */
        <Bubble.List
          items={
            messages === null || messages === void 0
              ? void 0
              : messages.map(i =>
                  Object.assign(Object.assign({}, i.message), {
                    classNames: {
                      content: i.status === 'loading' ? styles.loadingMessage : '',  // 加载中的消息应用特殊样式
                    },
                    typing:
                      i.status === 'loading' ? { step: 5, interval: 20, suffix: <>💗</> } : false,  // 打字机效果配置
                  }),
                )
          }
          style={{ height: '100%', paddingInline: 'calc(calc(100% - 700px) /2)' }}  // 居中显示，最大宽度 700px
          roles={{
            assistant: {
              placement: 'start',                    // AI 消息显示在左侧
              footer: (                              // AI 消息底部操作按钮
                <div style={{ display: 'flex' }}>
                  <Button type="text" size="small" icon={<ReloadOutlined />} />      {/* 重新生成 */}
                  <Button type="text" size="small" icon={<CopyOutlined />} />        {/* 复制 */}
                  <Button type="text" size="small" icon={<LikeOutlined />} />        {/* 点赞 */}
                  <Button type="text" size="small" icon={<DislikeOutlined />} />     {/* 点踩 */}
                </div>
              ),
              loadingRender: () => <Spin size="small" />,  // 加载动画
            },
            user: { placement: 'end' },              // 用户消息显示在右侧
          }}
        />
      ) : (
        /* 🌟 欢迎页面 - 无消息时显示欢迎界面和快捷提示 */
        <Space
          direction="vertical"
          size={16}
          style={{ paddingInline: 'calc(calc(100% - 700px) /2)' }}  // 与消息列表相同的居中样式
          className={styles.placeholder}
        >
          {/* 欢迎信息组件 */}
          <Welcome
            variant="borderless"
            icon="https://mdn.alipayobjects.com/huamei_iwk9zp/afts/img/A*s5sNRo5LjfQAAAAAAAAAAAAADgCCAQ/fmt.webp"
            title="Hello, I'm Ant Design X"
            description="Base on Ant Design, AGI product interface solution, create a better intelligent vision~"
            extra={
              <Space>
                <Button icon={<ShareAltOutlined />} />      {/* 分享按钮 */}
                <Button icon={<EllipsisOutlined />} />      {/* 更多操作 */}
              </Space>
            }
          />
          
          {/* 快捷提示区域 - 热门话题和设计指南 */}
          <Flex gap={16}>
            {/* 热门话题提示卡片 */}
            <Prompts
              items={[HOT_TOPICS]}
              styles={{
                list: { height: '100%' },
                item: {
                  flex: 1,
                  backgroundImage: 'linear-gradient(123deg, #e5f4ff 0%, #efe7ff 100%)',  // 渐变背景
                  borderRadius: 12,
                  border: 'none',
                },
                subItem: { padding: 0, background: 'transparent' },
              }}
              onItemClick={info => {
                onSubmit(info.data.description);        // 点击提示词直接发送
              }}
              className={styles.chatPrompt}
            />

            {/* 设计指南提示卡片 */}
            <Prompts
              items={[DESIGN_GUIDE]}
              styles={{
                item: {
                  flex: 1,
                  backgroundImage: 'linear-gradient(123deg, #e5f4ff 0%, #efe7ff 100%)',  // 渐变背景
                  borderRadius: 12,
                  border: 'none',
                },
                subItem: { background: '#ffffffa6' },   // 子项半透明背景
              }}
              onItemClick={info => {
                onSubmit(info.data.description);        // 点击提示词直接发送
              }}
              className={styles.chatPrompt}
            />
          </Flex>
        </Space>
      )}
    </div>
  );
  // 发送器头部组件 - 文件上传面板
  const senderHeader = (
    <Sender.Header
      title="Upload File"                       // 上传文件标题
      open={attachmentsOpen}                    // 控制面板开关
      onOpenChange={setAttachmentsOpen}         // 开关状态变化回调
      styles={{ content: { padding: 0 } }}
    >
      {/* 附件上传组件 */}
      <Attachments
        beforeUpload={() => false}              // 阻止自动上传，只做文件选择
        items={attachedFiles}                   // 已选择的文件列表
        onChange={info => setAttachedFiles(info.fileList)}  // 文件列表变化回调
        placeholder={type =>                    // 占位符配置
          type === 'drop'
            ? { title: 'Drop file here' }       // 拖拽时显示
            : {
                icon: <CloudUploadOutlined />,  // 上传图标
                title: 'Upload files',         // 上传标题
                description: 'Click or drag files to this area to upload',  // 上传描述
              }
        }
      />
    </Sender.Header>
  );
  
  // 发送器组件 - 包含快捷提示和输入框
  const chatSender = (
    <>
      {/* 🌟 快捷提示词 - 显示在输入框上方的操作按钮 */}
      <Prompts
        items={SENDER_PROMPTS}                  // 提示词数据
        onItemClick={info => {
          onSubmit(info.data.description);     // 点击提示词直接发送
        }}
        styles={{
          item: { padding: '6px 12px' },       // 按钮内边距
        }}
        className={styles.senderPrompt}
      />
      
      {/* 🌟 输入框组件 */}
      <Sender
        value={inputValue}                      // 受控输入值
        header={senderHeader}                   // 头部文件上传面板
        onSubmit={() => {                       // 发送消息处理
          onSubmit(inputValue);
          setInputValue('');                    // 清空输入框
        }}
        onChange={setInputValue}                // 输入内容变化回调
        onCancel={() => {                       // 取消请求处理
          var _a;
          (_a = abortController.current) === null || _a === void 0 ? void 0 : _a.abort();
        }}
        prefix={                                // 输入框前缀 - 附件按钮
          <Button
            type="text"
            icon={<PaperClipOutlined style={{ fontSize: 18 }} />}
            onClick={() => setAttachmentsOpen(!attachmentsOpen)}  // 切换附件面板
          />
        }
        loading={loading}                       // 加载状态
        className={styles.sender}
        allowSpeech                             // 启用语音输入
        actions={(_, info) => {                 // 自定义操作按钮
          const { SendButton, LoadingButton, SpeechButton } = info.components;
          return (
            <Flex gap={4}>
              <SpeechButton className={styles.speechButton} />                    {/* 语音按钮 */}
              {loading ? <LoadingButton type="default" /> : <SendButton type="primary" />}  {/* 发送/加载按钮 */}
            </Flex>
          );
        }}
        placeholder="Ask or input / use skills"  // 输入框占位符
      />
    </>
  );
  
  // ==================== 副作用处理 ====================
  useEffect(() => {
    // 消息历史记录同步 - 当消息变化时更新历史记录
    if (messages === null || messages === void 0 ? void 0 : messages.length) {
      setMessageHistory(prev =>
        Object.assign(Object.assign({}, prev), { [curConversation]: messages }),  // 按会话 ID 存储消息
      );
    }
  }, [messages]);  // 依赖消息变化
  
  // ==================== 组件渲染 ====================
  return (
    <div className={styles.layout}>
      {chatSider}                               {/* 左侧边栏：Logo + 会话列表 */}

      <div className={styles.chat}>
        {chatList}                              {/* 中间聊天区域：消息列表或欢迎页面 */}
        {chatSender}                            {/* 底部发送区域：提示词 + 输入框 */}
      </div>
    </div>
  );
};
// ==================== 组件导出 ====================
// 导出独立聊天组件，可在其他地方引用使用
export default Independent;