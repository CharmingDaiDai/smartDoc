import React, { useState } from 'react';
import { 
  Card, 
  Typography, 
  Input, 
  Button, 
  Space, 
  Alert, 
  Spin,
  Upload,
  message,
  Radio,
  Tabs,
  Empty
} from 'antd';
import { 
  HighlightOutlined, 
  UploadOutlined, 
  CopyOutlined, 
  SwapOutlined 
} from '@ant-design/icons';
import { documentAPI } from '../../services/api';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const PolishAnalysis = () => {
  const [content, setContent] = useState('');
  const [polishedContent, setPolishedContent] = useState('');
  const [polishType, setPolishType] = useState('formal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('input');

  // 处理文本输入变化
  const handleContentChange = (e) => {
    setContent(e.target.value);
  };

  // 处理润色类型变化
  const handlePolishTypeChange = (e) => {
    setPolishType(e.target.value);
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

  // 处理复制润色结果
  const handleCopyPolished = () => {
    navigator.clipboard.writeText(polishedContent)
      .then(() => message.success('已复制到剪贴板'))
      .catch(() => message.error('复制失败，请手动复制'));
  };

  // 润色文档
  const polishDocument = async () => {
    if (!content.trim()) {
      setError('请输入或上传文档内容');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // 实际环境中，这里调用后端API
      // const response = await documentAPI.polishDocument(content, polishType);
      // setPolishedContent(response.data);
      
      // 模拟API调用
      setTimeout(() => {
        let mockPolished = '';
        
        if (polishType === 'formal') {
          mockPolished = '本文档详细阐述了智能文档分析系统的功能特性与技术实现。该系统采用先进的自然语言处理技术，为用户提供高效的文档管理与分析服务。系统的核心模块包括文档摘要生成、关键词提取以及文档润色功能，这些功能有效提升了文档处理的效率与质量。';
        } else if (polishType === 'concise') {
          mockPolished = '智能文档系统具备多种分析功能，包括摘要生成、关键词提取和文档润色。系统采用NLP技术处理文档，提高效率，优化文档质量。用户可轻松管理和分析各类文档。';
        } else if (polishType === 'creative') {
          mockPolished = '想象一下，你的文档如同经过魔法般的转变！我们的智能文档小精灵施展了它的魔法，让你的文字焕发出全新的生命力。不仅内容清晰明了，还充满了创意的表达，让读者在阅读的旅程中感受到文字的魅力与活力。';
        }
        
        setPolishedContent(mockPolished);
        setLoading(false);
        // 自动切换到结果标签页
        setActiveTab('result');
      }, 2000);
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
    setActiveTab('input');
  };

  const tabItems = [
    {
      key: 'input',
      label: '输入',
      children: (
        <Card title="输入文档内容">
          <TextArea
            value={content}
            onChange={handleContentChange}
            placeholder="请在此输入或粘贴需要润色的文档内容..."
            autoSize={{ minRows: 8, maxRows: 16 }}
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
            
            <div style={{ marginTop: 16 }}>
              <Title level={5}>选择润色类型：</Title>
              <Radio.Group value={polishType} onChange={handlePolishTypeChange}>
                <Radio.Button value="formal">正式</Radio.Button>
                <Radio.Button value="concise">简洁</Radio.Button>
                <Radio.Button value="creative">创意</Radio.Button>
              </Radio.Group>
            </div>
          </Space>
        </Card>
      )
    },
    {
      key: 'result',
      label: '润色结果',
      children: (
        <Card 
          title="润色后的文档" 
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
          {polishedContent ? (
            <Paragraph>{polishedContent}</Paragraph>
          ) : (
            <Empty description="尚未生成润色结果" />
          )}
        </Card>
      )
    },
    {
      key: 'compare',
      label: '对比视图',
      children: (
        <Card title="原文与润色结果对比">
          <div style={{ display: 'flex', gap: '16px' }}>
            <Card title="原文" style={{ flex: 1 }}>
              <Paragraph>{content || '无原文内容'}</Paragraph>
            </Card>
            <Card title="润色结果" style={{ flex: 1 }}>
              <Paragraph>{polishedContent || '尚未生成润色结果'}</Paragraph>
            </Card>
          </div>
        </Card>
      )
    }
  ];

  return (
    <div>
      <Title level={2}>文档润色</Title>
      <Paragraph>
        优化文档的表达方式，提高文档的可读性和专业性。选择不同的润色类型，满足不同场景需求。
      </Paragraph>

      <Space style={{ marginBottom: 16 }}>
        <Button 
          type="primary" 
          onClick={polishDocument} 
          loading={loading}
          icon={<HighlightOutlined />}
        >
          开始润色
        </Button>
        <Button onClick={handleClear}>清空</Button>
        {content && polishedContent && (
          <Button 
            icon={<SwapOutlined />}
            onClick={() => setActiveTab('compare')}
          >
            查看对比
          </Button>
        )}
      </Space>

      {error && <Alert message={error} type="error" style={{ marginBottom: 16 }} />}

      {loading && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin tip="正在润色文档..." />
        </div>
      )}

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={tabItems}
      />
    </div>
  );
};

export default PolishAnalysis;