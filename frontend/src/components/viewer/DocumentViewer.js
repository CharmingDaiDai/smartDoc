import React, {useEffect, useState} from 'react';
import {Alert, Button, Card, Skeleton, Space, Tabs, Tag, Typography} from 'antd';
import {AppstoreOutlined, FileTextOutlined, ReadOutlined, SafetyOutlined, TagsOutlined} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

/**
 * 文档查看器组件
 * 
 * @param {Object} document - 文档对象，包含文档元数据和内容
 * @param {Function} onClose - 关闭查看器的回调函数
 */
const DocumentViewer = ({ document, onClose }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filePreviewType, setFilePreviewType] = useState('text'); // 'text', 'pdf', 'office', 'other'

  useEffect(() => {
    if (document?.fileUrl) {
      setLoading(true);
      setError(null);

      // 根据文档类型处理不同的文件
      const fetchDocumentContent = async () => {
        try {
          // 设置文件预览类型
          if (document.fileType?.includes('text/') || 
              document.fileName?.endsWith('.txt') || 
              document.fileName?.endsWith('.md')) {
            setFilePreviewType('text');
            const response = await fetch(document.fileUrl);
            if (!response.ok) {
              throw new Error('无法获取文件内容');
            }
            const text = await response.text();
            setContent(text);
          } else if (document.fileType === 'application/pdf' || document.fileName?.endsWith('.pdf')) {
            setFilePreviewType('pdf');
          } else if (document.fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                    document.fileName?.endsWith('.docx') ||
                    document.fileType === 'application/msword' ||
                    document.fileName?.endsWith('.doc')) {
            setFilePreviewType('office');
          } else {
            setFilePreviewType('other');
          }
        } catch (err) {
          console.error('获取文档内容失败:', err);
          setError('获取文档内容失败，请稍后再试');
        } finally {
          setLoading(false);
        }
      };

      fetchDocumentContent();
    }
  }, [document]);

  // 如果文档未提供，显示错误信息
  if (!document) {
    return <Alert message="未提供文档信息" type="error" />;
  }

  // 渲染不同类型的文件内容
  const renderFileContent = () => {
    if (loading) {
      return <Skeleton active paragraph={{ rows: 10 }} />;
    }
    
    if (error) {
      return <Alert message={error} type="error" />;
    }
    
    switch (filePreviewType) {
      case 'text':
        return (
          <pre style={{ 
            whiteSpace: 'pre-wrap', 
            wordBreak: 'break-word',
            maxHeight: '500px',
            overflow: 'auto',
            fontSize: '14px',
            backgroundColor: '#f5f5f5',
            padding: '12px',
            borderRadius: '4px'
          }}>
            {content}
          </pre>
        );
      case 'pdf':
        return (
          <div style={{ height: '600px', width: '100%' }}>
            <object
              data={document.fileUrl}
              type="application/pdf"
              width="100%"
              height="100%"
              style={{ border: 'none' }}
            >
              <Alert 
                message="您的浏览器不支持内嵌PDF查看" 
                description="请点击'在新窗口打开'按钮查看文件" 
                type="info" 
                showIcon 
              />
            </object>
          </div>
        );
      case 'office':
        // 使用Microsoft Office Online Viewer进行Word文档预览
        const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(document.fileUrl)}`;
        return (
          <div style={{ height: '600px', width: '100%' }}>
            <iframe
              src={officeViewerUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              title={document.title}
            >
              <Alert 
                message="无法加载Office文档预览" 
                description="请点击'在新窗口打开'按钮查看文件" 
                type="info" 
                showIcon 
              />
            </iframe>
          </div>
        );
      default:
        return (
          <Alert
            message={`此文件类型 (${document.fileType || '未知'}) 需要在专用查看器中查看`}
            description="请点击'在新窗口打开'按钮查看此文件"
            type="info"
            showIcon
          />
        );
    }
  };

  // 渲染标签
  const renderTags = (tags) => {
    if (!tags) return <Text type="secondary">无</Text>;
    
    return tags.split(',').map((tag, index) => (
      <Tag key={index} color="blue" style={{ margin: '2px' }}>
        {tag.trim()}
      </Tag>
    ));
  };

  const items = [
    {
      key: 'content',
      label: (
        <span>
          <FileTextOutlined /> 文档内容
        </span>
      ),
      children: (
        <Card title={document.title} bordered={false}>
          {renderFileContent()}
        </Card>
      ),
    },
    {
      key: 'summary',
      label: (
        <span>
          <ReadOutlined /> 文档摘要
        </span>
      ),
      children: (
        <Card title="文档摘要" bordered={false}>
          {document.summary ? (
            <Paragraph>{document.summary}</Paragraph>
          ) : (
            <Text type="secondary">尚未生成摘要信息</Text>
          )}
        </Card>
      ),
    },
    {
      key: 'keywords',
      label: (
        <span>
          <TagsOutlined /> 关键词
        </span>
      ),
      children: (
        <Card title="关键词" bordered={false}>
          <Space wrap>
            {document.keywords ? renderTags(document.keywords) : <Text type="secondary">尚未提取关键词</Text>}
          </Space>
        </Card>
      ),
    },
    {
      key: 'categories',
      label: (
        <span>
          <AppstoreOutlined /> 文档分类
        </span>
      ),
      children: (
        <Card title="文档分类" bordered={false}>
          <Space wrap>
            {document.categories ? renderTags(document.categories) : <Text type="secondary">尚未分类</Text>}
          </Space>
        </Card>
      ),
    },
    {
      key: 'sensitive',
      label: (
        <span>
          <SafetyOutlined /> 敏感信息
        </span>
      ),
      children: (
        <Card title="敏感信息检测" bordered={false}>
          {document.sensitiveInfo ? (
            <pre style={{ 
              whiteSpace: 'pre-wrap', 
              backgroundColor: '#fff2f0', 
              padding: 10, 
              borderRadius: 4,
              border: '1px solid #ffccc7'
            }}>
              {document.sensitiveInfo}
            </pre>
          ) : (
            <Text type="secondary">未检测到敏感信息</Text>
          )}
        </Card>
      ),
    },
  ];

  return (
    <div className="document-viewer">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4}>{document.title}</Title>
        <Space>
          <Button type="primary" href={document.fileUrl} target="_blank">
            在新窗口打开
          </Button>
          {onClose && (
            <Button onClick={onClose}>
              关闭
            </Button>
          )}
        </Space>
      </div>
      
      <Tabs defaultActiveKey="content" items={items} />
    </div>
  );
};

export default DocumentViewer;