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
  message,
  Tag
} from 'antd';
import { TagsOutlined, UploadOutlined, CopyOutlined } from '@ant-design/icons';
import { documentAPI } from '../../services/api';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

// 模拟的关键词标签颜色
const tagColors = ['magenta', 'red', 'volcano', 'orange', 'gold', 'lime', 'green', 'cyan', 'blue', 'geekblue', 'purple'];

const KeywordsAnalysis = () => {
  const [content, setContent] = useState('');
  const [keywords, setKeywords] = useState([]);
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

  // 处理复制关键词
  const handleCopyKeywords = () => {
    const keywordsText = keywords.join(', ');
    navigator.clipboard.writeText(keywordsText)
      .then(() => message.success('已复制到剪贴板'))
      .catch(() => message.error('复制失败，请手动复制'));
  };

  // 提取关键词
  const extractKeywords = async () => {
    if (!content.trim()) {
      setError('请输入或上传文档内容');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // 实际环境中，这里调用后端API
      // const response = await documentAPI.extractKeywords(content);
      // setKeywords(response.data);
      
      // 模拟API调用
      setTimeout(() => {
        const mockKeywords = ['人工智能', '机器学习', '文本分析', '自然语言处理', '文档管理', '数据挖掘', '知识图谱', '语义分析'];
        setKeywords(mockKeywords);
        setLoading(false);
      }, 1500);
    } catch (err) {
      console.error('提取关键词失败:', err);
      setError('提取关键词失败，请稍后再试');
      setLoading(false);
    }
  };

  // 清空所有内容
  const handleClear = () => {
    setContent('');
    setKeywords([]);
    setError('');
  };

  return (
    <div>
      <Title level={2}>关键词提取</Title>
      <Paragraph>
        自动从文档中提取重要关键词，帮助您把握文档的核心主题和关键概念。
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
          onClick={extractKeywords} 
          loading={loading}
          icon={<TagsOutlined />}
        >
          提取关键词
        </Button>
        <Button onClick={handleClear}>清空</Button>
      </Space>

      {error && <Alert message={error} type="error" style={{ marginBottom: 16 }} />}

      {loading && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin tip="正在分析文档..." />
        </div>
      )}

      {keywords.length > 0 && (
        <Card 
          title="关键词提取结果" 
          extra={
            <Button 
              type="text" 
              icon={<CopyOutlined />} 
              onClick={handleCopyKeywords}
            >
              复制
            </Button>
          }
        >
          <Space size={[8, 16]} wrap>
            {keywords.map((keyword, index) => (
              <Tag 
                key={index} 
                color={tagColors[index % tagColors.length]}
                style={{ fontSize: '14px', padding: '4px 8px' }}
              >
                {keyword}
              </Tag>
            ))}
          </Space>
        </Card>
      )}
    </div>
  );
};

export default KeywordsAnalysis;