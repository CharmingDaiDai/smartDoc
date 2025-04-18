import React, {useEffect, useState} from 'react';
import {Button, Card, Col, Empty, message, Row, Spin, Tag, Tooltip, Typography} from 'antd';
import {
    CheckCircleFilled,
    CheckOutlined,
    EyeOutlined,
    FileExcelOutlined,
    FileImageOutlined,
    FilePdfOutlined,
    FilePptOutlined,
    FileTextOutlined,
    FileUnknownOutlined,
    FileWordOutlined,
    FileZipOutlined
} from '@ant-design/icons';
import {documentAPI} from '../../services/api';

const { Title, Text } = Typography;

/**
 * 文档选择器组件
 * 用于从用户上传的文档中选择一个文档，以卡片形式展示
 * 
 * @param {function} onSelect 选择文档后的回调函数，参数为选中的文档对象
 * @param {string} title 选择器标题
 * @param {string} emptyText 无文档时显示的文本
 * @param {string} analysisType 分析类型: 'summary', 'keywords', 'polish', 'security'
 * @param {function} onViewResult 查看结果的回调函数，参数为文档对象
 */
const DocumentSelector = ({ 
  onSelect, 
  title = '选择文档', 
  emptyText = '暂无文档',
  analysisType,
  onViewResult
}) => {
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  
  // 加载用户的文档列表
  useEffect(() => {
    const fetchDocuments = async () => {
      setLoading(true);
      try {
        const response = await documentAPI.getAllDocuments();
        setDocuments(response.data || []);
      } catch (error) {
        console.error('获取文档列表失败:', error);
        message.error('获取文档列表失败');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDocuments();
  }, []);
  
  // 处理文档选择
  const handleDocumentSelect = (document) => {
    setSelectedDocId(document.id);
    onSelect(document);
  };
  
  // 处理查看结果
  const handleViewResult = (e, document) => {
    e.stopPropagation(); // 阻止事件冒泡，防止触发卡片的点击事件
    if (onViewResult) {
      onViewResult(document);
    }
  };
  
  // 检查文档是否已有分析结果
  const hasAnalysisResult = (document) => {
    if (!document || !analysisType) return false;
    
    switch (analysisType) {
      case 'summary':
        return document.summary && document.summary.trim().length > 0;
      case 'keywords':
        return document.keywords && document.keywords.trim().length > 0;
      case 'security':
        return document.sensitiveInfo && document.sensitiveInfo.trim().length > 0;
      case 'polish':
        // 目前实体中没有存储润色结果，返回false
        return false;
      default:
        return false;
    }
  };
  
  // 根据文件类型获取对应的图标和显示名称
  const getFileTypeInfo = (fileType) => {
    const type = fileType ? fileType.toLowerCase() : '';
    
    if (type.includes('pdf')) {
      return { 
        icon: <FilePdfOutlined style={{ fontSize: 36, color: '#ff4d4f' }} />,
        label: 'PDF'
      };
    } else if (type.includes('doc') || type.includes('word')) {
      return { 
        icon: <FileWordOutlined style={{ fontSize: 36, color: '#1890ff' }} />,
        label: 'Word'
      };
    } else if (type.includes('xls') || type.includes('excel') || type.includes('csv')) {
      return { 
        icon: <FileExcelOutlined style={{ fontSize: 36, color: '#52c41a' }} />,
        label: 'Excel'
      };
    } else if (type.includes('ppt') || type.includes('powerpoint')) {
      return { 
        icon: <FilePptOutlined style={{ fontSize: 36, color: '#fa8c16' }} />,
        label: 'PPT'
      };
    } else if (type.includes('jpg') || type.includes('jpeg') || type.includes('png') || type.includes('gif') || type.includes('bmp')) {
      return { 
        icon: <FileImageOutlined style={{ fontSize: 36, color: '#722ed1' }} />,
        label: '图片'
      };
    } else if (type.includes('zip') || type.includes('rar') || type.includes('7z') || type.includes('tar') || type.includes('gz')) {
      return { 
        icon: <FileZipOutlined style={{ fontSize: 36, color: '#faad14' }} />,
        label: '压缩包'
      };
    } else if (type.includes('txt') || type.includes('text')) {
      return { 
        icon: <FileTextOutlined style={{ fontSize: 36, color: '#13c2c2' }} />,
        label: '文本'
      };
    } else {
      return { 
        icon: <FileUnknownOutlined style={{ fontSize: 36, color: '#8c8c8c' }} />,
        label: '文件'
      };
    }
  };
  
  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (!bytes) return '未知大小';
    
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };
  
  // 显示时间格式化 - 当前未使用，但保留函数以备将来使用
  // const formatDate = (dateString) => {
  //   if (!dateString) return '';
  //   
  //   const date = new Date(dateString);
  //   return date.toLocaleDateString('zh-CN', {
  //     year: 'numeric',
  //     month: 'long',
  //     day: 'numeric'
  //   });
  // };
  
  return (
    <div>
      <Title level={4}>{title}</Title>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin tip="加载文档中..." />
        </div>
      ) : documents.length === 0 ? (
        <Empty description={emptyText} />
      ) : (
        <Row gutter={[16, 16]}>
          {documents.map(doc => {
            const fileTypeInfo = getFileTypeInfo(doc.fileType);
            const hasResult = hasAnalysisResult(doc);
            
            return (
              <Col key={doc.id} xs={24} sm={12} md={8} lg={6}>
                <Card
                  hoverable
                  style={{ 
                    cursor: 'pointer', 
                    borderColor: selectedDocId === doc.id ? '#1890ff' : 'transparent',
                    backgroundColor: hasResult 
                      ? (selectedDocId === doc.id ? '#e6f7ff' : '#f6ffed') 
                      : (selectedDocId === doc.id ? '#e6f7ff' : 'white')
                  }}
                  onClick={() => handleDocumentSelect(doc)}
                  actions={hasResult ? [
                    <Tooltip title="查看已有结果">
                      <Button 
                        type="link" 
                        icon={<EyeOutlined />} 
                        onClick={(e) => handleViewResult(e, doc)}
                      >
                        查看结果
                      </Button>
                    </Tooltip>
                  ] : []}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <div style={{ marginRight: 12 }}>
                      {fileTypeInfo.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Tooltip title={doc.title}>
                        <Text strong ellipsis style={{ display: 'block', maxWidth: '100%' }}>
                          {doc.title}
                          {hasResult && (
                            <Tag color="success" style={{ marginLeft: 8 }}>
                              <CheckOutlined /> 已分析
                            </Tag>
                          )}
                        </Text>
                      </Tooltip>
                      <Text type="secondary" ellipsis style={{ display: 'block', fontSize: '12px' }}>
                        {doc.fileName}
                      </Text>
                      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Tag color="blue">{fileTypeInfo.label}</Tag>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {formatFileSize(doc.fileSize)}
                        </Text>
                      </div>
                    </div>
                    {selectedDocId === doc.id && (
                      <CheckCircleFilled style={{ color: '#1890ff', fontSize: 18, position: 'absolute', top: 10, right: 10 }} />
                    )}
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
};

export default DocumentSelector;