import React, {useState} from 'react';
import {Alert, Button, Card, Input, message, Modal, Radio, Space, Spin, Tabs, Tooltip, Typography} from 'antd';
import {CopyOutlined, DiffOutlined, FileTextOutlined, FormOutlined} from '@ant-design/icons';
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
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [polishType, setPolishType] = useState('formal'); // 'formal', 'simple', 'creative'

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
    { value: 'formal', label: '正式', description: '适合商务报告、论文等正式场合' },
    { value: 'simple', label: '简洁', description: '直接明了，易于理解' },
    { value: 'creative', label: '创意', description: '生动有趣，适合营销文案' }
  ];

  // Markdown 渲染组件 - 使用外部容器而不是直接在ReactMarkdown上设置className
  const MarkdownRenderer = ({ content }) => (
    <div className="markdown-content">
      <ReactMarkdown 
        rehypePlugins={[rehypeRaw]} 
        remarkPlugins={[remarkGfm]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );

  return (
    <div>
      <Title level={2}>文档润色</Title>
      <Paragraph>
        智能优化文档的语言表达，修正语法错误，提升文档的专业性和可读性。
      </Paragraph>

      <Card style={{ marginBottom: 16 }}>
        <Title level={5}>选择润色风格</Title>
        <Radio.Group 
          value={polishType}
          onChange={(e) => handlePolishTypeChange(e.target.value)}
          style={{ marginBottom: 16 }}
        >
          {polishTypes.map(type => (
            <Tooltip key={type.value} title={type.description}>
              <Radio.Button value={type.value}>{type.label}</Radio.Button>
            </Tooltip>
          ))}
        </Radio.Group>
      </Card>

      <Radio.Group 
        value={inputType} 
        onChange={handleInputTypeChange}
        style={{ marginBottom: 16 }}
      >
        <Radio.Button value="text">直接输入文本</Radio.Button>
        <Radio.Button value="document">选择已上传文档</Radio.Button>
      </Radio.Group>

      {inputType === 'text' ? (
        <Card title="输入文档内容" style={{ marginBottom: 16 }}>
          <TextArea
            value={content}
            onChange={handleContentChange}
            placeholder="请在此输入或粘贴需要润色的文档内容..."
            autoSize={{ minRows: 8, maxRows: 16 }}
            style={{ marginBottom: 16 }}
          />
        </Card>
      ) : (
        <div style={{ marginBottom: 16 }}>
          <DocumentSelector 
            onSelect={handleDocumentSelect}
            title="选择要润色的文档"
            emptyText="暂无可润色的文档，请先上传文档"
            analysisType="polish"
            onViewResult={handleViewResult}
          />
        </div>
      )}

      <Space style={{ marginBottom: 16 }}>
        <Button 
          type="primary" 
          onClick={polishDocument} 
          loading={loading}
          icon={<FormOutlined />}
        >
          开始润色
        </Button>
        <Button onClick={handleClear}>清空</Button>
      </Space>

      {error && <Alert message={error} type="error" style={{ marginBottom: 16 }} />}

      {loading && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin tip="正在润色文档..." />
        </div>
      )}

      {polishedContent && (
        <Card 
          title="文档润色结果" 
          extra={
            <Button 
              type="text" 
              icon={<CopyOutlined />} 
              onClick={handleCopyPolished}
            >
              复制
            </Button>
          }
        >
          <Tabs defaultActiveKey="polished">
            <TabPane 
              tab={
                <span>
                  <FileTextOutlined />
                  润色后
                </span>
              } 
              key="polished"
            >
              <div className="markdown-wrapper">
                <MarkdownRenderer content={polishedContent} />
              </div>
            </TabPane>
            <TabPane 
              tab={
                <span>
                  <DiffOutlined />
                  对比
                </span>
              } 
              key="compare"
            >
              <div style={{ display: 'flex', gap: '20px' }}>
                <Card 
                  title="原文" 
                  style={{ width: '50%', backgroundColor: '#f9f9f9' }}
                  size="small"
                >
                  <div className="markdown-wrapper">
                    <MarkdownRenderer content={content || (selectedDocument?.content || '')} />
                  </div>
                </Card>
                <Card 
                  title="润色后" 
                  style={{ width: '50%', backgroundColor: '#f6ffed' }}
                  size="small"
                >
                  <div className="markdown-wrapper">
                    <MarkdownRenderer content={polishedContent} />
                  </div>
                </Card>
              </div>
            </TabPane>
          </Tabs>
        </Card>
      )}

      {/* 已有结果查看模态框 */}
      <Modal
        title={`文档润色：${viewingDocument?.title || ''}`}
        open={resultModalVisible}
        onCancel={handleCloseResultModal}
        footer={[
          <Button key="close" onClick={handleCloseResultModal}>
            关闭
          </Button>
        ]}
        width={700}
      >
        {viewingDocument && (
          <div>
            <Alert 
              message="历史润色结果" 
              description="抱歉，该文档的润色结果未保存在系统中。请重新进行润色操作。" 
              type="info" 
              showIcon 
              style={{ marginBottom: 16 }} 
            />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">
                文档信息: {viewingDocument.fileName} ({viewingDocument.fileSize} 字节)
              </Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PolishAnalysis;