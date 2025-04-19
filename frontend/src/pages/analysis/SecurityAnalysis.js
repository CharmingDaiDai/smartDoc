import React, {useState} from 'react';
import {
  Alert, Button, Card, Input, Modal, Radio, Space, Spin, Table, Tag, Typography,
  Row, Col, Avatar, Tooltip, Divider, Badge, Skeleton, Empty
} from 'antd';
import {
  SafetyOutlined, FileTextOutlined, LoadingOutlined, InfoCircleOutlined, 
  CheckCircleOutlined, ExclamationCircleOutlined, FileProtectOutlined, SecurityScanOutlined
} from '@ant-design/icons';
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
  const [analyzeCount, setAnalyzeCount] = useState(0);

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
      
      setResults(response.data.sensitiveInfoList || []);
      setAnalyzeCount(prev => prev + 1);
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

  // 格式化文件大小的辅助函数
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 获取风险级别颜色和图标
  const getRiskLevelInfo = (level) => {
    switch(level) {
      case '高':
        return { 
          color: 'red', 
          icon: <ExclamationCircleOutlined style={{ marginRight: 4 }} />,
          badgeColor: '#ff4d4f' 
        };
      case '中':
        return { 
          color: 'orange', 
          icon: <ExclamationCircleOutlined style={{ marginRight: 4 }} />,
          badgeColor: '#faad14' 
        };
      case '低':
      default:
        return { 
          color: 'green', 
          icon: <CheckCircleOutlined style={{ marginRight: 4 }} />,
          badgeColor: '#52c41a' 
        };
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={type === '个人信息' ? 'red' : type === '商业敏感' ? 'orange' : 'blue'} style={{ fontWeight: 500, borderRadius: '12px' }}>
          {type}
        </Tag>
      ),
    },
    {
      title: '敏感内容',
      dataIndex: 'content',
      key: 'content',
      render: (content) => (
        <div style={{ 
          background: '#fffbe6', 
          padding: '4px 8px', 
          borderRadius: '6px',
          border: '1px solid #ffe58f',
          display: 'inline-block'
        }}>
          {content}
        </div>
      )
    },
    {
      title: '位置',
      dataIndex: 'position',
      key: 'position',
      render: (position) => {
        // 检查 position 是否为对象，如果是则格式化显示
        if (position && typeof position === 'object' && 'start' in position && 'end' in position) {
          return <Text type="secondary">第 {position.start} 至 {position.end} 位置</Text>;
        }
        // 如果 position 是字符串，则直接显示
        return <Text type="secondary">{position}</Text>;
      }
    },
    {
      title: '风险级别',
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      render: (level) => {
        const { color, icon } = getRiskLevelInfo(level);
        return (
          <Tag color={color} style={{ fontWeight: 500, borderRadius: '12px' }}>
            {icon} {level}
          </Tag>
        );
      },
    },
    {
      title: '建议',
      dataIndex: 'suggestion',
      key: 'suggestion',
    },
  ];

  // 风险等级统计
  const getRiskLevelStats = (dataSource) => {
    if (!dataSource || !dataSource.length) return { high: 0, medium: 0, low: 0 };
    
    return dataSource.reduce((stats, item) => {
      if (item.riskLevel === '高') stats.high++;
      else if (item.riskLevel === '中') stats.medium++;
      else stats.low++;
      return stats;
    }, { high: 0, medium: 0, low: 0 });
  };

  // 结果数据
  const resultData = results || [];
  const riskStats = getRiskLevelStats(resultData);

  return (
    <div>
      <div style={{ 
        marginBottom: 24, 
        background: 'linear-gradient(135deg, #faad14 0%, #ffc53d 100%)', 
        borderRadius: '12px',
        padding: '24px',
        color: 'white',
        boxShadow: '0 4px 12px rgba(250, 173, 20, 0.15)'
      }}>
        <Title level={2} style={{ color: 'white', margin: 0 }}>敏感信息检测</Title>
        <Paragraph style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '16px', marginBottom: 0 }}>
          检测文档中可能包含的个人信息、商业敏感信息等，帮助您避免信息泄露风险。
        </Paragraph>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={16}>
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Avatar 
                  icon={<FileProtectOutlined />} 
                  style={{ backgroundColor: '#faad14', marginRight: 8 }} 
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
                <SecurityScanOutlined /> 选择已上传文档
              </Radio.Button>
            </Radio.Group>

            {inputType === 'text' ? (
              <div>
                <TextArea
                  value={content}
                  onChange={handleContentChange}
                  placeholder="请在此输入或粘贴需要检测敏感信息的文档内容..."
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
                  title="选择要检测敏感信息的文档"
                  emptyText="暂无可分析的文档，请先上传文档" 
                  analysisType="security"
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
                <Tooltip title="开始检测敏感信息">
                  <Button 
                    type="primary" 
                    onClick={detectSensitiveInfo} 
                    loading={loading}
                    icon={<SafetyOutlined />}
                    style={{ 
                      borderRadius: '6px',
                      boxShadow: '0 2px 6px rgba(250, 173, 20, 0.2)'
                    }}
                  >
                    检测敏感信息
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

              {(analyzeCount > 0 || results.length > 0) && (
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
                  style={{ backgroundColor: '#faad14', marginRight: 8 }} 
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
                <Text strong>敏感信息检测</Text>
                <Paragraph style={{ margin: '8px 0 0' }}>
                  通过智能分析识别文档中的敏感信息，包括个人隐私、商业机密等，帮助您规避泄露风险。
                </Paragraph>
              </div>
              
              <div style={{ marginBottom: 16 }}>
                <Text strong>使用方法</Text>
                <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                  <li>直接输入或粘贴文本</li>
                  <li>或选择已上传的文档</li>
                  <li>点击"检测敏感信息"按钮开始分析</li>
                </ul>
              </div>
              
              <div>
                <Text strong>应用场景</Text>
                <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                  <li>公开发布前的文档审核</li>
                  <li>数据脱敏处理前的风险评估</li>
                  <li>合规性检查</li>
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
              系统会对检测到的敏感信息按照风险级别进行分类，建议您对高风险内容进行处理，避免信息泄露风险。
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
                正在检测敏感信息，请稍候...
              </div>
            } 
          />
        </div>
      )}

      {!loading && results !== null && results.length >= 0 && (
        <Card 
          title={
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Avatar 
                icon={<SafetyOutlined />} 
                style={{ backgroundColor: '#faad14', marginRight: 8 }} 
              />
              <span>敏感信息检测结果</span>
            </div>
          } 
          extra={
            <Space>
              {riskStats.high > 0 && (
                <Badge count={riskStats.high} style={{ backgroundColor: '#ff4d4f' }}>
                  <Tag color="red">高风险</Tag>
                </Badge>
              )}
              {riskStats.medium > 0 && (
                <Badge count={riskStats.medium} style={{ backgroundColor: '#faad14' }}>
                  <Tag color="orange">中风险</Tag>
                </Badge>
              )}
              {riskStats.low > 0 && (
                <Badge count={riskStats.low} style={{ backgroundColor: '#52c41a' }}>
                  <Tag color="green">低风险</Tag>
                </Badge>
              )}
            </Space>
          }
          style={{ 
            marginTop: 24,
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
          }}
        >
          {results.length === 0 ? (
            <div style={{ 
              padding: '30px 0', 
              textAlign: 'center',
              background: '#f9f9f9',
              borderRadius: '8px'
            }}>
              <Avatar 
                icon={<CheckCircleOutlined />} 
                style={{ 
                  backgroundColor: '#52c41a', 
                  marginBottom: 16, 
                  fontSize: 32,
                  padding: 8
                }}
                size={64} 
              />
              <div>
                <Title level={4} style={{ margin: '0 0 8px' }}>未检测到敏感信息</Title>
                <Text type="secondary">恭喜！您的文档未发现敏感信息风险。</Text>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 16, background: '#fffbe6', padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid #faad14' }}>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>
                  检测到 {results.length} 条敏感信息
                </Text>
                <Text type="secondary">
                  请查看下方详细列表，建议对高风险内容进行处理以避免潜在风险。
                </Text>
              </div>
              <Table 
                columns={columns} 
                dataSource={results.map((item, index) => ({ ...item, key: index }))} 
                pagination={false}
                style={{ 
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}
                locale={{ 
                  emptyText: <Empty description="未检测到敏感信息" /> 
                }}
              />
            </div>
          )}
        </Card>
      )}

      {/* 已有结果查看模态框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Avatar 
              icon={<SafetyOutlined />} 
              style={{ backgroundColor: '#faad14', marginRight: 8 }} 
            />
            <span>敏感信息检测：{viewingDocument?.title || ''}</span>
          </div>
        }
        open={resultModalVisible}
        onCancel={handleCloseResultModal}
        footer={[
          <Button 
            key="close" 
            onClick={handleCloseResultModal}
            style={{ borderRadius: '6px' }}
          >
            关闭
          </Button>
        ]}
        width={800}
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
              {(viewingDocument.securityResults || []).length === 0 ? (
                <div style={{ 
                  padding: '30px 0', 
                  textAlign: 'center',
                  background: '#f9f9f9',
                  borderRadius: '8px'
                }}>
                  <Avatar 
                    icon={<CheckCircleOutlined />} 
                    style={{ 
                      backgroundColor: '#52c41a', 
                      marginBottom: 16, 
                      fontSize: 24,
                      padding: 6
                    }}
                    size={48} 
                  />
                  <div>
                    <Title level={4} style={{ margin: '0 0 8px' }}>未检测到敏感信息</Title>
                    <Text type="secondary">恭喜！该文档未发现敏感信息风险。</Text>
                  </div>
                </div>
              ) : (
                <Table 
                  columns={columns} 
                  dataSource={(viewingDocument.securityResults || []).map((item, index) => ({ ...item, key: index }))} 
                  pagination={false}
                  style={{ 
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}
                />
              )}
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

export default SecurityAnalysis;