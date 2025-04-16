import React, { useState, useEffect } from 'react';
import {
  Typography, Button, Row, Col, Card, Space, 
  Upload, Modal, Table, Tag, Input,
  Form, message, Spin, Drawer, Empty
} from 'antd';
import {
  DeleteOutlined, 
  UploadOutlined, 
  EyeOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import api from '../../services/api';
import DocumentViewer from '../../components/viewer/DocumentViewer';

const { Title } = Typography;
const { confirm } = Modal;

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN');
};

// 获取文件名（不含扩展名）
const getFileNameWithoutExtension = (fileName) => {
  if (!fileName) return '';
  return fileName.replace(/\.[^/.]+$/, '');
};

const DocumentManagement = () => {
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [detailsDrawerVisible, setDetailsDrawerVisible] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [form] = Form.useForm();

  // 获取文档列表
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/documents');
      setDocuments(response.data);
    } catch (error) {
      console.error('获取文档失败:', error);
      message.error('获取文档列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    fetchDocuments();
  }, []);

  // 处理文件上传前的检查
  const beforeUpload = (file) => {
    // 这里可以添加文件类型、大小等检查
    return false; // 阻止自动上传，由我们手动上传
  };

  // 处理文件列表变化
  const handleFileChange = ({ fileList }) => {
    setFileList(fileList);
    
    // 当文件列表变化时，更新表单中对应的标题默认值
    const defaultTitles = fileList.map(file => getFileNameWithoutExtension(file.name));
    form.setFieldsValue({ titles: defaultTitles });
  };

  // 处理文件上传
  const handleUpload = async () => {
    try {
      if (fileList.length === 0) {
        message.warning('请选择要上传的文件');
        return;
      }

      const values = await form.validateFields();
      
      setUploading(true);
      
      if (fileList.length === 1) {
        // 单文件上传
        const formData = new FormData();
        formData.append('file', fileList[0].originFileObj);
        formData.append('title', values.titles[0] || fileList[0].name);

        await api.post('/api/documents/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        // 批量上传
        const formData = new FormData();
        fileList.forEach((file, index) => {
          formData.append('files', file.originFileObj);
          formData.append('titles', values.titles[index] || file.name);
        });

        await api.post('/api/documents/upload-batch', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      message.success('文档上传成功');
      setUploadModalVisible(false);
      setFileList([]);
      form.resetFields();
      fetchDocuments();
    } catch (error) {
      console.error('上传文档失败:', error);
      message.error('文档上传失败');
    } finally {
      setUploading(false);
    }
  };

  // 确认删除文档
  const showDeleteConfirm = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的文档');
      return;
    }

    confirm({
      title: `确定要删除选中的 ${selectedRowKeys.length} 个文档吗？`,
      icon: <ExclamationCircleOutlined />,
      content: '此操作不可逆，删除后将无法恢复',
      okText: '确定删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          if (selectedRowKeys.length === 1) {
            await api.delete(`/api/documents/${selectedRowKeys[0]}`);
          } else {
            // 修复批量删除的请求格式
            await api.delete('/api/documents/batch', {
              data: selectedRowKeys // 确保正确传递数据
            });
          }
          message.success('文档删除成功');
          setSelectedRowKeys([]);
          fetchDocuments();
        } catch (error) {
          console.error('删除文档失败:', error);
          message.error(`删除文档失败: ${error.response?.data?.message || error.message}`);
        }
      },
    });
  };

  // 查看文档详情
  const handleViewDetails = async (documentId) => {
    try {
      const response = await api.get(`/api/documents/${documentId}`);
      setSelectedDocument(response.data);
      setDetailsDrawerVisible(true);
    } catch (error) {
      console.error('获取文档详情失败:', error);
      message.error('获取文档详情失败');
    }
  };

  // 表格列配置
  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '文件名',
      dataIndex: 'fileName',
      key: 'fileName',
      ellipsis: true,
    },
    {
      title: '大小',
      dataIndex: 'fileSize',
      key: 'fileSize',
      render: (fileSize) => formatFileSize(fileSize),
      sorter: (a, b) => a.fileSize - b.fileSize,
    },
    {
      title: '上传时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (createdAt) => formatDate(createdAt),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="primary" 
            icon={<EyeOutlined />} 
            size="small"
            onClick={() => handleViewDetails(record.id)}
          >
            查看
          </Button>
          <Button 
            danger 
            icon={<DeleteOutlined />} 
            size="small"
            onClick={() => {
              setSelectedRowKeys([record.id]);
              showDeleteConfirm();
            }}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>文档管理</Title>
      
      {/* 操作按钮区域 */}
      <Row style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Space>
            <Button 
              type="primary" 
              icon={<UploadOutlined />}
              onClick={() => setUploadModalVisible(true)}
            >
              上传文档
            </Button>
            
            {selectedRowKeys.length > 0 && (
              <Button 
                danger 
                icon={<DeleteOutlined />}
                onClick={showDeleteConfirm}
              >
                删除所选 ({selectedRowKeys.length})
              </Button>
            )}
          </Space>
        </Col>
      </Row>
      
      {/* 文档列表 */}
      <Card>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" />
          </div>
        ) : documents.length === 0 ? (
          <Empty description="暂无文档，请上传文档" />
        ) : (
          <Table 
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            columns={columns} 
            dataSource={documents.map(doc => ({ ...doc, key: doc.id }))} 
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>
      
      {/* 上传对话框 */}
      <Modal
        title="上传文档"
        open={uploadModalVisible}
        onCancel={() => {
          setUploadModalVisible(false);
          setFileList([]);
          form.resetFields();
        }}
        footer={[
          <Button key="back" onClick={() => setUploadModalVisible(false)}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={uploading} 
            onClick={handleUpload}
            disabled={fileList.length === 0}
          >
            上传
          </Button>,
        ]}
        width={700}
      >
        <Upload
          multiple
          beforeUpload={beforeUpload}
          onChange={handleFileChange}
          fileList={fileList}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md,.ppt,.pptx"
        >
          <Button icon={<UploadOutlined />}>选择文件</Button>
        </Upload>
        
        {fileList.length > 0 && (
          <Form
            form={form}
            layout="vertical"
            style={{ marginTop: 16 }}
          >
            <Form.List name="titles">
              {(fields) => (
                <>
                  {fileList.map((file, index) => (
                    <Form.Item
                      key={index}
                      label={`文档标题 (${file.name})`}
                      name={index}
                      rules={[{ required: true, message: '请输入文档标题' }]}
                    >
                      <Input placeholder="请输入文档标题" />
                    </Form.Item>
                  ))}
                </>
              )}
            </Form.List>
          </Form>
        )}
      </Modal>
      
      {/* 文档详情抽屉 */}
      <Drawer
        title={selectedDocument?.title}
        width={800}
        placement="right"
        onClose={() => setDetailsDrawerVisible(false)}
        open={detailsDrawerVisible}
        bodyStyle={{ padding: '0' }}
      >
        {selectedDocument && <DocumentViewer document={selectedDocument} onClose={() => setDetailsDrawerVisible(false)} />}
      </Drawer>
    </div>
  );
};

export default DocumentManagement;