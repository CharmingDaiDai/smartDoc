import React, { useState } from 'react';
import { 
  Card, 
  Typography, 
  Input, 
  Button, 
  Space, 
  Alert, 
  Spin,
  message, 
  Tag,
  Radio,
  Modal
} from 'antd';
import { 
  CopyOutlined,
  TagsOutlined
} from '@ant-design/icons';
import { documentAPI } from '../../services/api';
import DocumentSelector from '../../components/analysis/DocumentSelector';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const KeywordsAnalysis = () => {
  const [content, setContent] = useState('');
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inputType, setInputType] = useState('text'); // 'text' 或 'document'
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null);

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

  // 处理复制关键词
  const handleCopyKeywords = () => {
    const keywordsToCopy = keywords.length > 0 
      ? keywords.join(', ') 
      : viewingDocument?.keywords?.join(', ') || '';
      
    if (!keywordsToCopy) {
      message.warning('没有可复制的关键词');
      return;
    }

    navigator.clipboard.writeText(keywordsToCopy)
      .then(() => message.success('已复制到剪贴板'))
      .catch(() => message.error('复制失败，请手动复制'));
  };

  // 提取关键词
  const extractKeywords = async () => {
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
        // 使用文本内容提取关键词
        response = await documentAPI.extractKeywords(content);
      } else {
        // 使用文档ID提取关键词
        response = await documentAPI.extractKeywordsFromDocument(selectedDocument.id);
      }
      
      setKeywords(response.data.keywords || []);
      setLoading(false);
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
    setSelectedDocument(null);
  };

  // 渲染关键词标签
  const renderKeywordTags = (keywordList) => {
    if (!keywordList || keywordList.length === 0) {
      return <Text type="secondary">暂无关键词</Text>;
    }

    return (
      <div style={{ lineHeight: '30px' }}>
        {keywordList.map((keyword, index) => (
          <Tag color="blue" key={index} style={{ margin: '5px' }}>
            {keyword}
          </Tag>
        ))}
      </div>
    );
  };

  return (
    <div>
      <Title level={2}>关键词提取</Title>
      <Paragraph>
        自动分析文档内容，提取最能代表文档主题和核心信息的关键词。
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
            placeholder="请在此输入或粘贴需要提取关键词的文档内容..."
            autoSize={{ minRows: 8, maxRows: 16 }}
            style={{ marginBottom: 16 }}
          />
        </Card>
      ) : (
        <div style={{ marginBottom: 16 }}>
          <DocumentSelector 
            onSelect={handleDocumentSelect}
            title="选择要提取关键词的文档"
            emptyText="暂无可分析的文档，请先上传文档" 
            analysisType="keywords"
            onViewResult={handleViewResult}
          />
        </div>
      )}

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
          <Spin tip="正在提取关键词..." />
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
          {renderKeywordTags(keywords)}
        </Card>
      )}

      {/* 已有结果查看模态框 */}
      <Modal
        title={`关键词：${viewingDocument?.title || ''}`}
        open={resultModalVisible}
        onCancel={handleCloseResultModal}
        footer={[
          <Button key="copy" type="primary" onClick={handleCopyKeywords} icon={<CopyOutlined />}>
            复制关键词
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
              {renderKeywordTags(viewingDocument.keywords || [])}
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

export default KeywordsAnalysis;