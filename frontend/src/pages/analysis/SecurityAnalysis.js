import React, {useState} from 'react';
import {Alert, Button, Card, Input, Modal, Radio, Space, Spin, Table, Tag, Typography} from 'antd';
import {SafetyOutlined} from '@ant-design/icons';
import {documentAPI} from '../../services/api';
import DocumentSelector from '../../components/analysis/DocumentSelector';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const SecurityAnalysis = () => {
  const [content, setContent] = useState('');
  const [results, setResults] = useState([]);
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

  // 检测敏感信息
  const detectSensitiveInfo = async () => {
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
        // 使用文本内容检测敏感信息
        response = await documentAPI.detectSensitiveInfo(content);
      } else {
        // 使用文档ID检测敏感信息
        response = await documentAPI.detectSensitiveInfoFromDocument(selectedDocument.id);
      }
      
      setResults(response.data.items || []);
      setLoading(false);
    } catch (err) {
      console.error('检测敏感信息失败:', err);
      setError('检测敏感信息失败，请稍后再试');
      setLoading(false);
    }
  };

  // 清空所有内容
  const handleClear = () => {
    setContent('');
    setResults([]);
    setError('');
    setSelectedDocument(null);
  };

  // 表格列定义
  const columns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={type === '个人信息' ? 'red' : type === '商业敏感' ? 'orange' : 'blue'}>
          {type}
        </Tag>
      ),
    },
    {
      title: '敏感内容',
      dataIndex: 'content',
      key: 'content',
    },
    {
      title: '位置',
      dataIndex: 'position',
      key: 'position',
    },
    {
      title: '风险级别',
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      render: (level) => (
        <Tag color={level === '高' ? 'red' : level === '中' ? 'orange' : 'green'}>
          {level}
        </Tag>
      ),
    },
    {
      title: '建议',
      dataIndex: 'suggestion',
      key: 'suggestion',
    },
  ];

  return (
    <div>
      <Title level={2}>敏感信息检测</Title>
      <Paragraph>
        检测文档中可能包含的个人信息、商业敏感信息等，帮助您避免信息泄露风险。
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
            placeholder="请在此输入或粘贴需要检测敏感信息的文档内容..."
            autoSize={{ minRows: 8, maxRows: 16 }}
            style={{ marginBottom: 16 }}
          />
        </Card>
      ) : (
        <div style={{ marginBottom: 16 }}>
          <DocumentSelector 
            onSelect={handleDocumentSelect}
            title="选择要检测敏感信息的文档"
            emptyText="暂无可分析的文档，请先上传文档" 
            analysisType="security"
            onViewResult={handleViewResult}
          />
        </div>
      )}

      <Space style={{ marginBottom: 16 }}>
        <Button 
          type="primary" 
          onClick={detectSensitiveInfo} 
          loading={loading}
          icon={<SafetyOutlined />}
        >
          检测敏感信息
        </Button>
        <Button onClick={handleClear}>清空</Button>
      </Space>

      {error && <Alert message={error} type="error" style={{ marginBottom: 16 }} />}

      {loading && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin tip="正在检测敏感信息..." />
        </div>
      )}

      {results.length > 0 && (
        <Card title="敏感信息检测结果">
          <Table 
            columns={columns} 
            dataSource={results.map((item, index) => ({ ...item, key: index }))} 
            pagination={false}
            locale={{ emptyText: '未检测到敏感信息' }}
          />
        </Card>
      )}

      {/* 已有结果查看模态框 */}
      <Modal
        title={`敏感信息检测：${viewingDocument?.title || ''}`}
        open={resultModalVisible}
        onCancel={handleCloseResultModal}
        footer={[
          <Button key="close" onClick={handleCloseResultModal}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {viewingDocument && (
          <div>
            <Table 
              columns={columns} 
              dataSource={(viewingDocument.securityResults || []).map((item, index) => ({ ...item, key: index }))} 
              pagination={false}
              locale={{ emptyText: '未检测到敏感信息' }}
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

export default SecurityAnalysis;