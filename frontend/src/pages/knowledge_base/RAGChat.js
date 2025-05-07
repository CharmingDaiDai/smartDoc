import React, {useEffect, useRef, useState} from 'react';
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
    Typography
} from 'antd';
import {
    BookOutlined,
    LoadingOutlined,
    QuestionCircleOutlined,
    RobotOutlined,
    SendOutlined,
    SettingOutlined,
    UserOutlined
} from '@ant-design/icons';
import {useNavigate, useParams} from 'react-router-dom';
import {useAuth} from '../../context/AuthContext';
import api, {ragMethodAPI} from '../../services/api';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import '../../styles/components/markdown.css';
import RagMethodParams from '../../components/knowledge_base/RagMethodParams';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Panel } = Collapse;

const RAGChat = () => {
  const { currentUser } = useAuth();
  const { id: knowledgeBaseId } = useParams();
  const navigate = useNavigate();
  const [knowledgeBase, setKnowledgeBase] = useState(null);
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kbLoading, setKbLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [form] = Form.useForm();
  const messagesEndRef = useRef(null);
  
  // RAG方法相关
  const [loadingMethodDetails, setLoadingMethodDetails] = useState(false);
  const [ragMethodDetails, setRagMethodDetails] = useState(null);
  const [ragParams, setRagParams] = useState({});
  
  // 获取所有知识库列表
  const fetchKnowledgeBases = async () => {
    try {
      setKbLoading(true);
      const response = await api.get('/api/kb/list');
      if (response.data && response.data.success) {
        setKnowledgeBases(response.data.data || []);
      } else {
        message.error(response.data?.message || '获取知识库列表失败');
      }
      setKbLoading(false);
    } catch (error) {
      console.error('获取知识库列表失败:', error);
      message.error('获取知识库列表失败，请稍后再试');
      setKbLoading(false);
    }
  };
  
  // 获取知识库详情
  const fetchKnowledgeBase = async (id) => {
    try {
      setLoading(true);
      
      const response = await api.get(`/api/kb/${id}`);
      if (response.data && response.data.success) {
        const kbData = response.data.data;
        setKnowledgeBase(kbData);
        
        // 获取当前知识库使用的RAG方法详情
        if (kbData.ragMethod) {
          fetchRagMethodDetails(kbData.ragMethod);
        }
      } else {
        message.error(response.data?.message || '获取知识库详情失败');
      }
    } catch (error) {
      console.error('获取知识库详情失败:', error);
      message.error('获取知识库详情失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  // 获取RAG方法详情和参数
  const fetchRagMethodDetails = async (methodId) => {
    if (!methodId) return;
    
    setLoadingMethodDetails(true);
    try {
      // 从后端API获取方法详情
      const response = await ragMethodAPI.getMethodDetails(methodId);
      
      if (response && response.data) {
        const methodConfig = response.data;
        setRagMethodDetails(methodConfig);
        
        // 初始化参数值，包括索引参数和搜索参数
        const initialParams = {
          ...methodConfig.indexParams,
          ...methodConfig.searchParams
        };
        
        setRagParams(initialParams);
      } else {
        // 如果API调用失败，显示警告信息
        message.warning('未找到RAG方法配置信息，将使用默认参数');
      }
    } catch (error) {
      console.error('获取RAG方法详情失败:', error);
      message.error('获取RAG方法参数失败，将使用默认参数');
    } finally {
      setLoadingMethodDetails(false);
    }
  };
  
  useEffect(() => {
    fetchKnowledgeBases();
  }, []);
  
  useEffect(() => {
    if (knowledgeBaseId) {
      fetchKnowledgeBase(knowledgeBaseId);
    }
  }, [knowledgeBaseId]);
  
  useEffect(() => {
    // 滚动到最新消息
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // 当用户选择不同的知识库时
  const handleKnowledgeBaseChange = (id) => {
    // 清空当前会话
    setMessages([]);
    
    // 导航到选中的知识库问答页
    if (id) {
      navigate(`/knowledge_base/rag/${id}`);
    }
  };
  
  // 处理RAG参数变更
  const handleRagParamsChange = (params) => {
    setRagParams(params);
  };
  
  // 发送消息
  const handleSendMessage = async () => {
    if (!input.trim() || !knowledgeBase) return;
    
    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSending(true);
    
    try {
      const response = await api.post('/api/kb/rag', {
        knowledgeBaseId: knowledgeBase.id,
        query: input.trim(),
        ragParams: ragParams  // 发送RAG参数
      });
      
      if (response.data && response.data.success) {
        const aiMessage = {
          role: 'assistant',
          content: response.data.data.content,
          timestamp: new Date().toISOString(),
          sources: response.data.data.sources
        };
        
        setMessages(prev => [...prev, aiMessage]);
      } else {
        message.error(response.data?.message || '发送消息失败');
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      message.error('发送消息失败，请稍后再试');
      
      // 添加错误消息
      const errorMessage = {
        role: 'assistant',
        content: '很抱歉，处理您的请求时发生了错误，请稍后再试。',
        timestamp: new Date().toISOString(),
        error: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  };
  
  // 渲染Markdown内容
  const MarkdownRenderer = ({ content }) => (
    <div className="markdown-content" style={{ 
      padding: '16px', 
      background: '#fbfbfb', 
      borderRadius: '8px',
      border: '1px solid #f0f0f0'
    }}>
      <ReactMarkdown 
        rehypePlugins={[rehypeRaw]} 
        remarkPlugins={[remarkGfm]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
  
  // 渲染消息气泡
  const renderMessage = (msg, index) => {
    const isUser = msg.role === 'user';
    
    return (
      <List.Item key={index} style={{ padding: '8px 0' }}>
        <div style={{ 
          display: 'flex',
          flexDirection: isUser ? 'row-reverse' : 'row',
          alignItems: 'flex-start',
          width: '100%'
        }}>
          <Avatar 
            icon={isUser ? <UserOutlined /> : <RobotOutlined />}
            style={{ 
              backgroundColor: isUser ? '#1890ff' : '#52c41a',
              marginLeft: isUser ? '8px' : 0,
              marginRight: isUser ? 0 : '8px'
            }}
          />
          
          <div style={{
            maxWidth: '80%',
            background: isUser ? '#e6f7ff' : msg.error ? '#fff2f0' : '#f6ffed',
            padding: '12px 16px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
          }}>
            {isUser ? (
              <Text>{msg.content}</Text>
            ) : (
              <div>
                <MarkdownRenderer content={msg.content} />
                
                {msg.sources && msg.sources.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <Text strong style={{ fontSize: '12px', color: '#8c8c8c' }}>来源文档:</Text>
                    <div>
                      {msg.sources.map((source, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                          <div style={{ 
                            width: '6px', 
                            height: '6px', 
                            borderRadius: '50%', 
                            backgroundColor: '#1890ff',
                            marginRight: '8px'
                          }} />
                          <Text style={{ fontSize: '12px' }}>{source.title}</Text>
                          <Text type="secondary" style={{ fontSize: '12px', marginLeft: '4px' }}>
                            (相关度: {source.relevance})
                          </Text>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </List.Item>
    );
  };
  
  // 如果没有选中知识库，显示知识库选择界面
  if (!knowledgeBaseId && kbLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="加载知识库列表中..." />
      </div>
    );
  }

  return (
    <div>
      {/* 顶部绿色标题区域 */}
      <div style={{ 
        background: '#52c41a', 
        borderRadius: '6px',
        padding: '16px 24px',
        color: 'white',
        marginBottom: '24px'
      }}>
        <Title level={4} style={{ color: 'white', margin: 0 }}>知识库问答</Title>
        <Paragraph style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '14px', marginBottom: 0 }}>
          基于RAG技术的智能问答系统，从您的文档中检索精准信息
        </Paragraph>
      </div>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large" tip="加载知识库中..." />
        </div>
      ) : (
        <Row gutter={[24, 24]}>
          <Col xs={24} md={16}>
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar 
                      icon={<BookOutlined />} 
                      style={{ backgroundColor: '#52c41a', marginRight: 8 }} 
                    />
                    <span>知识库问答 {knowledgeBase ? `(${knowledgeBase.name})` : ''}</span>
                  </div>
                  
                  <Select
                    style={{ width: 200 }}
                    placeholder="选择知识库"
                    loading={kbLoading}
                    value={knowledgeBase?.id}
                    onChange={handleKnowledgeBaseChange}
                  >
                    {knowledgeBases.map(kb => (
                      <Option key={kb.id} value={kb.id}>{kb.name}</Option>
                    ))}
                  </Select>
                </div>
              }
              style={{ 
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                height: 'calc(100vh - 220px)'
              }}
              bodyStyle={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                padding: '12px 24px',
                overflowY: 'hidden'
              }}
            >
              <div style={{
                flex: 1,
                overflowY: 'auto',
                marginBottom: '16px',
                paddingRight: '8px'
              }}>
                {messages.length === 0 ? (
                  <Empty 
                    description="开始提问以获取基于您文档的问答" 
                    style={{ margin: '40px 0' }}
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
                <Form
                  form={form}
                  onFinish={handleSendMessage}
                >
                  <Form.Item
                    name="message"
                    style={{ marginBottom: 0 }}
                  >
                    <div style={{ display: 'flex' }}>
                      <TextArea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="输入您的问题..."
                        autoSize={{ minRows: 1, maxRows: 4 }}
                        style={{ 
                          borderRadius: '8px 0 0 8px',
                          resize: 'none'
                        }}
                        disabled={sending}
                      />
                      <Button
                        type="primary"
                        icon={sending ? <LoadingOutlined /> : <SendOutlined />}
                        onClick={handleSendMessage}
                        style={{ borderRadius: '0 8px 8px 0' }}
                        disabled={!input.trim() || sending}
                      />
                    </div>
                  </Form.Item>
                </Form>
              </div>
            </Card>
          </Col>
          
          <Col xs={24} md={8}>
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar 
                    icon={<QuestionCircleOutlined />} 
                    style={{ backgroundColor: '#52c41a', marginRight: 8 }} 
                  />
                  <span>问答信息</span>
                </div>
              }
              style={{ 
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
              }}
            >
              <div style={{ padding: '0 4px' }}>
                {knowledgeBase && (
                  <div style={{ marginBottom: 16 }}>
                    <Title level={5} style={{ marginTop: 0 }}>
                      知识库信息
                    </Title>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text type="secondary">知识库名称:</Text>
                      <Text strong>{knowledgeBase.name}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text type="secondary">RAG方法:</Text>
                      <Text strong>{knowledgeBase.ragMethod || 'HiSem-RAG'}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text type="secondary">嵌入模型:</Text>
                      <Text strong>{knowledgeBase.embeddingModel || 'text-embedding-ada-002'}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">创建时间:</Text>
                      <Text>{new Date(knowledgeBase.createdAt).toLocaleString()}</Text>
                    </div>
                  </div>
                )}
                
                <Divider style={{ margin: '12px 0' }} />
                
                {/* RAG参数设置 */}
                <Collapse 
                  bordered={false}
                  expandIcon={({ isActive }) => (
                    <SettingOutlined rotate={isActive ? 90 : 0} style={{ fontSize: '14px' }}/>
                  )}
                  style={{ background: '#fff' }}
                >
                  <Panel 
                    header={<Text strong>RAG参数配置</Text>} 
                    key="1"
                  >
                    {loadingMethodDetails ? (
                      <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <Spin size="small" tip="加载参数中..." />
                      </div>
                    ) : knowledgeBase?.ragMethod ? (
                      <div style={{ padding: '8px 0' }}>
                        {/* RAG方法信息和参数配置，显示所有参数 */}
                        <RagMethodParams 
                          methodId={knowledgeBase.ragMethod}
                          onChange={handleRagParamsChange}
                          showSearchParams={true} /* 问答界面显示所有参数 */
                        />
                      </div>
                    ) : (
                      <Text type="secondary">未获取到RAG方法参数</Text>
                    )}
                  </Panel>
                </Collapse>
                
                <Divider style={{ margin: '12px 0' }} />
                
                <div style={{ marginBottom: 16 }}>
                  <Title level={5} style={{ marginTop: 0 }}>
                    提示
                  </Title>
                  <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                    <li>问题尽量具体明确</li>
                    <li>可以进行多轮对话</li>
                    <li>系统会保持上下文理解</li>
                    <li>文档内容越丰富，回答越精准</li>
                  </ul>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default RAGChat;