import React, {useState} from 'react';
import {Alert, Button, Card, Input, message, Modal, Radio, Space, Spin, Typography} from 'antd';
import {CopyOutlined, FileTextOutlined} from '@ant-design/icons';
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

  // Markdown 渲染组件
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

  return (
    <div>
      <Title level={2}>摘要生成</Title>
      <Paragraph>
        自动总结文档的主要内容，提取核心信息，生成简洁清晰的摘要。
      </Paragraph>

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
            placeholder="请在此输入或粘贴需要生成摘要的文档内容..."
            autoSize={{ minRows: 8, maxRows: 16 }}
            style={{ marginBottom: 16 }}
          />
        </Card>
      ) : (
        <div style={{ marginBottom: 16 }}>
          <DocumentSelector 
            onSelect={handleDocumentSelect}
            title="选择要生成摘要的文档"
            emptyText="暂无可分析的文档，请先上传文档"
            analysisType="summary"
            onViewResult={handleViewResult}
          />
        </div>
      )}

      <Space style={{ marginBottom: 16 }}>
        <Button 
          type="primary" 
          onClick={generateSummary} 
          loading={loading}
          icon={<FileTextOutlined />}
        >
          生成摘要
        </Button>
        <Button onClick={handleClear}>清空</Button>
      </Space>

      {error && <Alert message={error} type="error" style={{ marginBottom: 16 }} />}

      {loading && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin tip="正在生成摘要..." />
        </div>
      )}

      {summary && (
        <Card 
          title="摘要结果" 
          extra={
            <Button 
              type="text" 
              icon={<CopyOutlined />} 
              onClick={handleCopySummary}
            >
              复制
            </Button>
          }
        >
          <MarkdownRenderer content={summary} />
        </Card>
      )}

      {/* 已有结果查看模态框 */}
      <Modal
        title={`摘要：${viewingDocument?.title || ''}`}
        open={resultModalVisible}
        onCancel={handleCloseResultModal}
        footer={[
          <Button key="copy" type="primary" onClick={handleCopySummary} icon={<CopyOutlined />}>
            复制摘要
          </Button>,
          <Button key="close" onClick={handleCloseResultModal}>
            关闭
          </Button>
        ]}
        width={700}
      >
        {viewingDocument && (
          <div>
            <Card>
              <MarkdownRenderer content={viewingDocument.summary} />
            </Card>
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

export default SummaryAnalysis;