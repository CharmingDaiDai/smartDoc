import React, {useState} from 'react';
import {
    Alert,
    Avatar,
    Badge,
    Button,
    Card,
    Col,
    Divider,
    Input,
    message,
    Modal,
    Radio,
    Row,
    Skeleton,
    Space,
    Spin,
    Tooltip,
    Typography
} from 'antd';
import {
    BookOutlined,
    CheckCircleOutlined,
    CopyOutlined,
    FileSearchOutlined,
    FileTextOutlined,
    InfoCircleOutlined,
    LoadingOutlined,
    ReadOutlined
} from '@ant-design/icons';
import {documentAPI} from '../../services/api';
import DocumentSelector from '../../components/analysis/DocumentSelector';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import '../../components/markdown/markdown-styles.css';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const SummaryAnalysis = () => {
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inputType, setInputType] = useState('text'); // 'text' 或 'document'
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [analyzeCount, setAnalyzeCount] = useState(0);

  // Markdown 渲染组件
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
  const handleDocumentSelect = (document) => {
    setSelectedDocument(document);
    // 清空错误消息
    setError('');
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

  // 处理复制摘要
  const handleCopySummary = () => {
    const textToCopy = summary || viewingDocument?.summary || '';
    if (!textToCopy) {
      message.warning('没有可复制的摘要');
      return;
    }

    navigator.clipboard.writeText(textToCopy)
      .then(() => message.success('已复制到剪贴板'))
      .catch(() => message.error('复制失败，请手动复制'));
  };

  // 生成摘要
  const generateSummary = async () => {
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
        // 使用文本内容生成摘要
        response = await documentAPI.getSummary(content);
      } else {
        // 使用文档ID生成摘要
        response = await documentAPI.getSummaryFromDocument(selectedDocument.id);
      }
      
      setSummary(response.data.summary);
      setAnalyzeCount(prev => prev + 1);
      setLoading(false);
    } catch (err) {
      console.error('生成摘要失败:', err);
      setError('生成摘要失败，请稍后再试');
      setLoading(false);
    }
  };

  // 清空所有内容
  const handleClear = () => {
    setContent('');
    setSummary('');
    setError('');
    setSelectedDocument(null);
  };

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
        background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)', 
        borderRadius: '12px',
        padding: '24px',
        color: 'white',
        boxShadow: '0 4px 12px rgba(24, 144, 255, 0.15)'
      }}>
        <Title level={2} style={{ color: 'white', margin: 0 }}>摘要生成</Title>
        <Paragraph style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '16px', marginBottom: 0 }}>
          自动总结文档的主要内容，提取核心信息，生成简洁清晰的摘要。
        </Paragraph>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={16}>
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Avatar 
                  icon={<BookOutlined />} 
                  style={{ backgroundColor: '#1890ff', marginRight: 8 }} 
                />
                <span>内容输入</span>
              </div>
            } 
            style={{ 
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              height: '100%'
            }}
          >
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
                <ReadOutlined /> 选择已上传文档
              </Radio.Button>
            </Radio.Group>

            {inputType === 'text' ? (
              <div>
                <TextArea
                  value={content}
                  onChange={handleContentChange}
                  placeholder="请在此输入或粘贴需要生成摘要的文档内容..."
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
                  title="选择要生成摘要的文档"
                  emptyText="暂无可分析的文档，请先上传文档"
                  analysisType="summary"
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
                <Tooltip title="开始生成摘要">
                  <Button 
                    type="primary" 
                    onClick={generateSummary} 
                    loading={loading}
                    icon={<FileSearchOutlined />}
                    style={{ 
                      borderRadius: '6px',
                      boxShadow: '0 2px 6px rgba(24, 144, 255, 0.2)'
                    }}
                  >
                    生成摘要
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

              {(analyzeCount > 0 || summary) && (
                <Badge count={analyzeCount} offset={[0, 4]}>
                  <Text type="secondary">
                    已分析 {analyzeCount} 次
                  </Text>
                </Badge>
              )}
            </div>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Avatar 
                  icon={<InfoCircleOutlined />} 
                  style={{ backgroundColor: '#1890ff', marginRight: 8 }} 
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
                <Text strong>摘要生成</Text>
                <Paragraph style={{ margin: '8px 0 0' }}>
                  通过AI算法分析文本内容，自动生成简明扼要的文本摘要，帮助您快速把握文档核心内容。
                </Paragraph>
              </div>
              
              <div style={{ marginBottom: 16 }}>
                <Text strong>使用方法</Text>
                <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                  <li>直接输入或粘贴文本</li>
                  <li>或选择已上传的文档</li>
                  <li>点击"生成摘要"按钮开始分析</li>
                </ul>
              </div>
              
              <div>
                <Text strong>应用场景</Text>
                <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                  <li>长文章快速概览</li>
                  <li>会议纪要总结</li>
                  <li>研究论文摘要提取</li>
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
                <span>提示</span>
              </div>
            }
            style={{ 
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
            }}
          >
            <Paragraph>
              输入的文本内容越完整，生成的摘要质量越高。本系统支持多种文档格式，包括Word、PDF和纯文本。
            </Paragraph>
          </Card>
        </Col>
      </Row>

      {loading && (
        <div style={{ 
          marginTop: 24,
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
                正在分析文本内容，生成摘要...
              </div>
            } 
          />
        </div>
      )}

      {!loading && summary && (
        <Card 
          title={
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Avatar 
                icon={<FileSearchOutlined />} 
                style={{ backgroundColor: '#1890ff', marginRight: 8 }} 
              />
              <span>摘要结果</span>
            </div>
          } 
          extra={
            <Button 
              type="primary"
              icon={<CopyOutlined />} 
              onClick={handleCopySummary}
              style={{ 
                borderRadius: '6px',
                boxShadow: '0 2px 6px rgba(24, 144, 255, 0.15)'
              }}
            >
              复制摘要
            </Button>
          }
          style={{ 
            marginTop: 24,
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
          }}
        >
          <div style={{ padding: '8px 0' }}>
            <Text type="secondary" style={{ marginBottom: '12px', display: 'block' }}>
              以下是根据您提供的文档内容生成的摘要：
            </Text>
            <Divider style={{ margin: '12px 0 16px' }} />
            <MarkdownRenderer content={summary} />
          </div>
        </Card>
      )}

      {/* 已有结果查看模态框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Avatar 
              icon={<FileSearchOutlined />} 
              style={{ backgroundColor: '#1890ff', marginRight: 8 }} 
            />
            <span>摘要：{viewingDocument?.title || ''}</span>
          </div>
        }
        open={resultModalVisible}
        onCancel={handleCloseResultModal}
        footer={[
          <Button 
            key="copy" 
            type="primary" 
            onClick={handleCopySummary} 
            icon={<CopyOutlined />}
            style={{ borderRadius: '6px' }}
          >
            复制摘要
          </Button>,
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
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.09)'
              }}
            >
              <MarkdownRenderer content={viewingDocument.summary} />
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

export default SummaryAnalysis;