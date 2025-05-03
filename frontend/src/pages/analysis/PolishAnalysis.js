import React, {useState} from 'react';
import {
    Alert,
    Avatar,
    Badge,
    Button,
    Card,
    Col,
    Input,
    message,
    Modal,
    Radio,
    Row,
    Skeleton,
    Space,
    Spin,
    Tabs,
    Tooltip,
    Typography
} from 'antd';
import {
    CheckCircleOutlined,
    CommentOutlined,
    CopyOutlined,
    DiffOutlined,
    EditOutlined,
    FileTextOutlined,
    FormOutlined,
    InfoCircleOutlined,
    LoadingOutlined,
    ReadOutlined,
    SwitcherOutlined
} from '@ant-design/icons';
import {documentAPI} from '../../services/api';
import DocumentSelector from '../../components/analysis/DocumentSelector';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import '../../components/markdown/markdown-styles.css';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

const PolishAnalysis = () => {
  const [content, setContent] = useState('');
  const [polishedContent, setPolishedContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inputType, setInputType] = useState('text'); // 'text' 或 'document'
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [documentContent, setDocumentContent] = useState(''); // 新增：存储选中文档的内容
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [polishType, setPolishType] = useState('formal'); // 'formal', 'simple', 'creative'
  const [analyzeCount, setAnalyzeCount] = useState(0);

  // 处理文本输入变化
  const handleContentChange = (e) => {
    setContent(e.target.value);
  };

  // 处理输入类型变化
  const handleInputTypeChange = (e) => {
    setInputType(e.target.value);
    // 清空错误消息
    setError('');
  };

  // 处理文档选择
  const handleDocumentSelect = async (document) => {
    setSelectedDocument(document);
    // 清空错误消息
    setError('');
    
    if (document && document.id) {
      try {
        // 获取文档内容
        const response = await documentAPI.getDocumentContent(document.id);
        if (response && response.data && response.data.content) {
          setDocumentContent(response.data.content);
        } else {
          setDocumentContent('');
          console.error('文档内容为空');
        }
      } catch (err) {
        console.error('获取文档内容失败:', err);
        setDocumentContent('');
      }
    }
  };

  // 处理查看已有结果
  const handleViewResult = (document) => {
    setViewingDocument(document);
    setResultModalVisible(true);
  };

  // 关闭结果查看模态框
  const handleCloseResultModal = () => {
    setResultModalVisible(false);
  };
  
  // 处理润色类型变化
  const handlePolishTypeChange = (value) => {
    setPolishType(value);
  };

  // 处理复制润色结果
  const handleCopyPolished = () => {
    if (!polishedContent) {
      message.warning('没有可复制的润色结果');
      return;
    }

    navigator.clipboard.writeText(polishedContent)
      .then(() => message.success('已复制到剪贴板'))
      .catch(() => message.error('复制失败，请手动复制'));
  };

  // 润色文档
  const polishDocument = async () => {
    // 基于输入类型验证输入
    if (inputType === 'text' && !content.trim()) {
      setError('请输入文档内容');
      return;
    } else if (inputType === 'document' && !selectedDocument) {
      setError('请选择一个文档');
      return;
    }

    setLoading(true);
    setError('');
    try {
      let response;
      
      if (inputType === 'text') {
        // 使用文本内容润色
        response = await documentAPI.polishDocument(content, polishType);
      } else {
        // 使用文档ID润色
        response = await documentAPI.polishDocumentFromDocument(selectedDocument.id, polishType);
      }
      
      setPolishedContent(response.data.polishedContent);
      setAnalyzeCount(prev => prev + 1);
      setLoading(false);
    } catch (err) {
      console.error('文档润色失败:', err);
      setError('文档润色失败，请稍后再试');
      setLoading(false);
    }
  };

  // 清空所有内容
  const handleClear = () => {
    setContent('');
    setPolishedContent('');
    setError('');
    setSelectedDocument(null);
  };

  // 润色风格选项
  const polishTypes = [
    { value: 'formal', label: '正式', description: '适合商务报告、论文等正式场合', icon: <FileTextOutlined /> },
    { value: 'simple', label: '简洁', description: '直接明了，易于理解', icon: <ReadOutlined /> },
    { value: 'creative', label: '创意', description: '生动有趣，适合营销文案', icon: <EditOutlined /> }
  ];

  // Markdown 渲染组件 - 使用外部容器而不是直接在ReactMarkdown上设置className
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

  // 格式化文件大小的辅助函数
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div>
      <div style={{ 
        marginBottom: 24, 
        background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)', 
        borderRadius: '12px',
        padding: '24px',
        color: 'white',
        boxShadow: '0 4px 12px rgba(82, 196, 26, 0.15)'
      }}>
        <Title level={2} style={{ color: 'white', margin: 0 }}>文档润色</Title>
        <Paragraph style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '16px', marginBottom: 0 }}>
          智能优化文档的语言表达，修正语法错误，提升文档的专业性和可读性。
        </Paragraph>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={16}>
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Avatar 
                  icon={<EditOutlined />} 
                  style={{ backgroundColor: '#52c41a', marginRight: 8 }} 
                />
                <span>内容输入</span>
              </div>
            } 
            style={{ 
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              marginBottom: 24
            }}
          >
            <div style={{ marginBottom: 24 }}>
              <Title level={5} style={{ marginBottom: 16 }}>选择润色风格</Title>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {polishTypes.map(type => (
                  <Tooltip key={type.value} title={type.description}>
                    <Card
                      hoverable
                      size="small"
                      style={{ 
                        width: 120, 
                        borderColor: polishType === type.value ? '#52c41a' : undefined,
                        backgroundColor: polishType === type.value ? '#f6ffed' : undefined
                      }}
                      onClick={() => handlePolishTypeChange(type.value)}
                    >
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px'
                      }}>
                        <Avatar 
                          icon={type.icon} 
                          style={{ 
                            backgroundColor: polishType === type.value ? '#52c41a' : '#f0f0f0',
                            marginBottom: 8
                          }} 
                        />
                        <div style={{ 
                          fontWeight: polishType === type.value ? 'bold' : 'normal', 
                          color: polishType === type.value ? '#52c41a' : undefined
                        }}>
                          {type.label}
                        </div>
                      </div>
                    </Card>
                  </Tooltip>
                ))}
              </div>
            </div>

            <Radio.Group 
              value={inputType} 
              onChange={handleInputTypeChange}
              style={{ marginBottom: 16 }}
              buttonStyle="solid"
            >
              <Radio.Button value="text">
                <FileTextOutlined /> 直接输入文本
              </Radio.Button>
              <Radio.Button value="document">
                <SwitcherOutlined /> 选择已上传文档
              </Radio.Button>
            </Radio.Group>

            {inputType === 'text' ? (
              <div>
                <TextArea
                  value={content}
                  onChange={handleContentChange}
                  placeholder="请在此输入或粘贴需要润色的文档内容..."
                  autoSize={{ minRows: 8, maxRows: 16 }}
                  style={{ 
                    marginBottom: 16, 
                    borderRadius: '8px',
                    borderColor: '#d9d9d9'
                  }}
                />
              </div>
            ) : (
              <div>
                <DocumentSelector 
                  onSelect={handleDocumentSelect}
                  title="选择要润色的文档"
                  emptyText="暂无可润色的文档，请先上传文档"
                  analysisType="polish"
                  onViewResult={handleViewResult}
                />
              </div>
            )}

            {error && (
              <Alert 
                message={error} 
                type="error" 
                showIcon 
                style={{ marginBottom: 16, borderRadius: '8px' }} 
              />
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
              <Space>
                <Tooltip title="开始润色文档">
                  <Button 
                    type="primary" 
                    onClick={polishDocument} 
                    loading={loading}
                    icon={<FormOutlined />}
                    style={{ 
                      borderRadius: '6px',
                      boxShadow: '0 2px 6px rgba(82, 196, 26, 0.2)'
                    }}
                  >
                    开始润色
                  </Button>
                </Tooltip>
                <Tooltip title="清空当前内容">
                  <Button 
                    onClick={handleClear}
                    style={{ borderRadius: '6px' }}
                  >
                    清空
                  </Button>
                </Tooltip>
              </Space>

              {(analyzeCount > 0 || polishedContent) && (
                <Badge count={analyzeCount} offset={[0, 4]}>
                  <Text type="secondary">
                    已润色 {analyzeCount} 次
                  </Text>
                </Badge>
              )}
            </div>
          </Card>

          {loading && (
            <div style={{ 
              marginBottom: 24,
              textAlign: 'center', 
              padding: '40px', 
              background: '#f9f9f9',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
            }}>
              <Spin 
                indicator={<LoadingOutlined style={{ fontSize: 36 }} spin />} 
                tip={
                  <div style={{ marginTop: 16, color: '#8c8c8c' }}>
                    正在润色文档，优化表达...
                  </div>
                } 
              />
            </div>
          )}

          {!loading && polishedContent && (
            <Card 
              title={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar 
                    icon={<CommentOutlined />} 
                    style={{ backgroundColor: '#52c41a', marginRight: 8 }} 
                  />
                  <span>润色结果</span>
                </div>
              } 
              extra={
                <Button 
                  type="primary"
                  icon={<CopyOutlined />} 
                  onClick={handleCopyPolished}
                  style={{ 
                    borderRadius: '6px',
                    boxShadow: '0 2px 6px rgba(82, 196, 26, 0.15)'
                  }}
                >
                  复制结果
                </Button>
              }
              style={{ 
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
              }}
            >
              <Tabs 
                defaultActiveKey="polished" 
                type="card"
                style={{ marginTop: 8 }}
                items={[
                  {
                    key: 'polished',
                    label: (
                      <span>
                        <FileTextOutlined />
                        润色后
                      </span>
                    ),
                    children: (
                      <div style={{ padding: '8px 0' }}>
                        <MarkdownRenderer content={polishedContent} />
                      </div>
                    )
                  },
                  {
                    key: 'compare',
                    label: (
                      <span>
                        <DiffOutlined />
                        对比
                      </span>
                    ),
                    children: (
                      <div style={{ display: 'flex', gap: '16px' }}>
                        <Card 
                          title="原文" 
                          style={{ 
                            width: '50%', 
                            backgroundColor: '#f9f9f9', 
                            borderRadius: '8px'
                          }}
                          size="small"
                          headStyle={{ backgroundColor: '#f5f5f5' }}
                        >
                          <MarkdownRenderer content={inputType === 'text' ? content : documentContent} />
                        </Card>
                        <Card 
                          title="润色后" 
                          style={{ 
                            width: '50%', 
                            backgroundColor: '#f6ffed',
                            borderRadius: '8px'
                          }}
                          size="small"
                          headStyle={{ backgroundColor: '#e6f7ff' }}
                        >
                          <MarkdownRenderer content={polishedContent} />
                        </Card>
                      </div>
                    )
                  }
                ]}
              />
            </Card>
          )}
        </Col>

        <Col xs={24} md={8}>
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Avatar 
                  icon={<InfoCircleOutlined />} 
                  style={{ backgroundColor: '#52c41a', marginRight: 8 }} 
                />
                <span>功能说明</span>
              </div>
            }
            style={{ 
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              marginBottom: 24
            }}
          >
            <div style={{ padding: '0 8px' }}>
              <div style={{ marginBottom: 16 }}>
                <Text strong>文档润色</Text>
                <Paragraph style={{ margin: '8px 0 0' }}>
                  通过AI算法分析文本内容，优化表达方式，修正语法错误，提升文档的专业性和可读性。
                </Paragraph>
              </div>
              
              <div style={{ marginBottom: 16 }}>
                <Text strong>使用方法</Text>
                <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                  <li>选择润色风格</li>
                  <li>输入文本或选择已上传文档</li>
                  <li>点击"开始润色"按钮</li>
                </ul>
              </div>
              
              <div>
                <Text strong>润色风格说明</Text>
                <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                  <li><Text strong>正式：</Text>适合商务报告、论文等正式场合</li>
                  <li><Text strong>简洁：</Text>直接明了，易于理解</li>
                  <li><Text strong>创意：</Text>生动有趣，适合营销文案</li>
                </ul>
              </div>
            </div>
          </Card>
          
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Avatar 
                  icon={<CheckCircleOutlined />} 
                  style={{ backgroundColor: '#52c41a', marginRight: 8 }} 
                />
                <span>润色效果</span>
              </div>
            }
            style={{ 
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
            }}
          >
            <div style={{ padding: '0 8px' }}>
              <div style={{ marginBottom: 16 }}>
                <Text strong>润色优化内容</Text>
                <ul style={{ paddingLeft: '20px', marginTop: '8px', marginBottom: '16px' }}>
                  <li>语法错误修正</li>
                  <li>表达流畅度提升</li>
                  <li>专业术语优化</li>
                  <li>标点符号规范</li>
                </ul>
              </div>
              
              <div style={{ 
                background: '#f6ffed', 
                padding: '12px', 
                borderRadius: '8px',
                border: '1px solid #b7eb8f'
              }}>
                <Text type="success">
                  润色会保留原文的核心意思，同时提高文档的表达质量和专业性。
                </Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 已有结果查看模态框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Avatar 
              icon={<FormOutlined />} 
              style={{ backgroundColor: '#52c41a', marginRight: 8 }} 
            />
            <span>文档润色：{viewingDocument?.title || ''}</span>
          </div>
        }
        open={resultModalVisible}
        onCancel={handleCloseResultModal}
        footer={[
          <Button 
            key="close" 
            onClick={handleCloseResultModal}
            style={{ borderRadius: '6px' }}
          >
            关闭
          </Button>
        ]}
        width={700}
        bodyStyle={{ padding: '24px' }}
        style={{ top: 20 }}
      >
        {viewingDocument ? (
          <div>
            <Card
              style={{ 
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.09)',
                marginBottom: '16px'
              }}
            >
              <Alert 
                message="历史润色结果" 
                description="抱歉，该文档的润色结果未保存在系统中。请重新进行润色操作。" 
                type="info" 
                showIcon 
              />
            </Card>
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Avatar 
                  icon={<FileTextOutlined />} 
                  size="small"
                  style={{ backgroundColor: '#f9f9f9', marginRight: 8 }} 
                />
                <Text type="secondary">
                  文档信息: {viewingDocument.fileName} ({formatFileSize(viewingDocument.fileSize)})
                </Text>
              </div>
            </div>
          </div>
        ) : (
          <Skeleton active />
        )}
      </Modal>
    </div>
  );
};

export default PolishAnalysis;