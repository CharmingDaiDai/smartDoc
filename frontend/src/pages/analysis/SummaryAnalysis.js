import React, { useState } from 'react';
import { 
  Card, 
  Typography, 
  Input, 
  Button, 
  Space, 
  Divider, 
  Alert, 
  Spin,
  Upload,
  message
} from 'antd';
import { FileTextOutlined, UploadOutlined, CopyOutlined } from '@ant-design/icons';
import { documentAPI } from '../../services/api';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const SummaryAnalysis = () => {
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 处理文本输入变化
  const handleContentChange = (e) => {
    setContent(e.target.value);
  };

  // 处理文件上传
  const handleFileUpload = (info) => {
    if (info.file.status === 'done') {
      message.success(`${info.file.name} 上传成功`);
      // 这里可以添加文件内容提取逻辑
      // 目前仅模拟将文件名添加到内容中
      setContent(`[文件: ${info.file.name}]\n${content}`);
    } else if (info.file.status === 'error') {
      message.error(`${info.file.name} 上传失败`);
    }
  };

  // 处理复制摘要
  const handleCopySummary = () => {
    navigator.clipboard.writeText(summary)
      .then(() => message.success('已复制到剪贴板'))
      .catch(() => message.error('复制失败，请手动复制'));
  };

  // 生成摘要
  const generateSummary = async () => {
    if (!content.trim()) {
      setError('请输入或上传文档内容');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // 实际环境中，这里调用后端API
      // const response = await documentAPI.getSummary(content);
      // setSummary(response.data);
      
      // 模拟API调用
      setTimeout(() => {
        const mockSummary = `这是对输入文档的摘要分析结果。该文档主要讨论了文本分析技术的应用，包括自动摘要、关键词提取和情感分析等方面。文章强调了AI在文档处理中的重要性，并提出了未来发展方向。`;
        setSummary(mockSummary);
        setLoading(false);
      }, 1500);
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
  };

  return (
    <div>
      <Title level={2}>文档摘要</Title>
      <Paragraph>
        自动生成文档的简洁摘要，帮助您快速了解文档的核心内容和要点。
      </Paragraph>

      <Card title="输入文档内容" style={{ marginBottom: 16 }}>
        <TextArea
          value={content}
          onChange={handleContentChange}
          placeholder="请在此输入或粘贴文档内容..."
          autoSize={{ minRows: 6, maxRows: 12 }}
          style={{ marginBottom: 16 }}
        />
        
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text type="secondary">或者上传文档文件 (支持 .txt, .doc, .docx, .pdf)</Text>
          <Upload
            name="file"
            action="/api/documents/upload"
            onChange={handleFileUpload}
            maxCount={1}
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />}>上传文件</Button>
          </Upload>
        </Space>
      </Card>

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
          <Spin tip="正在分析文档..." />
        </div>
      )}

      {summary && (
        <Card 
          title="文档摘要结果" 
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
          <Paragraph>{summary}</Paragraph>
        </Card>
      )}
    </div>
  );
};

export default SummaryAnalysis;