import React, {useCallback, useEffect, useState} from 'react';
import {Avatar, Button, Card, Col, Divider, Form, Input, message, Row, Spin, Tabs, Typography, Upload} from 'antd';
import {LockOutlined, MailOutlined, UploadOutlined, UserOutlined} from '@ant-design/icons';
import {useAuth} from '../../context/AuthContext';
import {profileAPI} from '../../services/api';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const UserProfile = () => {
  const { currentUser, refreshUserInfo } = useAuth();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [activeKey, setActiveKey] = useState('1');
  const [userProfile, setUserProfile] = useState(null);

  // 获取用户资料 - 使用 useCallback 包装，避免在每次渲染时重新创建
  const fetchUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await profileAPI.getProfile();
      setUserProfile(response.data);
      
      // 设置表单初始值
      profileForm.setFieldsValue({
        email: response.data.email,
        // fullName: response.data.fullName
      });
    } catch (error) {
      console.error('获取用户资料失败:', error);
      message.error('获取用户资料失败');
    } finally {
      setLoading(false);
    }
  }, [profileForm]); // 添加 profileForm 作为依赖

  // 页面加载时获取用户资料
  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  // 更新个人资料
  const handleUpdateProfile = async (values) => {
    try {
      setLoading(true);
      const response = await profileAPI.updateProfile(values);
      message.success('个人资料更新成功');
      setUserProfile(response.data);
      
      // 刷新全局用户信息
      if (refreshUserInfo) {
        refreshUserInfo();
      }
    } catch (error) {
      console.error('更新个人资料失败:', error);
      message.error(error.response?.data?.message || '更新个人资料失败');
    } finally {
      setLoading(false);
    }
  };

  // 修改密码
  const handleChangePassword = async (values) => {
    try {
      setLoading(true);
      await profileAPI.changePassword(values);
      message.success('密码修改成功');
      passwordForm.resetFields();
      setActiveKey('1'); // 切换回个人资料标签页
    } catch (error) {
      console.error('修改密码失败:', error);
      message.error(error.response?.data?.message || '修改密码失败');
    } finally {
      setLoading(false);
    }
  };

  // 上传头像前的验证
  const beforeUpload = (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件!');
      return Upload.LIST_IGNORE;
    }
    
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('图片大小不能超过2MB!');
      return Upload.LIST_IGNORE;
    }
    
    return true; // 允许上传
  };

  // 上传头像
  const handleUploadAvatar = async (options) => {
    const { file, onSuccess, onError } = options;
    
    try {
      setAvatarLoading(true);
      
      // 创建 FormData 对象
      const formData = new FormData();
      formData.append('file', file);
      
      // 调用上传头像API
      const response = await profileAPI.uploadAvatar(formData);
      
      message.success('头像上传成功');
      setUserProfile(response.data);
      
      // 刷新全局用户信息
      if (refreshUserInfo) {
        refreshUserInfo();
      }
      
      onSuccess(response, file);
    } catch (error) {
      console.error('上传头像失败:', error);
      message.error(error.response?.data?.message || '上传头像失败');
      onError(error);
    } finally {
      setAvatarLoading(false);
    }
  };

  // 标签页切换
  const handleTabChange = (key) => {
    setActiveKey(key);
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>个人资料</Title>
      
      <Spin spinning={loading}>
        <Tabs activeKey={activeKey} onChange={handleTabChange}>
          {/* 基本信息标签页 */}
          <TabPane tab="基本信息" key="1">
            <Row gutter={[24, 24]}>
              <Col xs={24} md={8}>
                <Card style={{ textAlign: 'center' }}>
                  <div style={{ marginBottom: 20 }}>
                    <Spin spinning={avatarLoading}>
                      <Avatar 
                        size={120} 
                        icon={<UserOutlined />} 
                        src={userProfile?.avatarUrl}
                        style={{ backgroundColor: '#1890ff' }}
                      />
                    </Spin>
                  </div>
                  
                  <Typography.Title level={4}>
                    {currentUser?.username}
                  </Typography.Title>
                  
                  <Text type="secondary">
                    {userProfile?.vip ? 'VIP 用户' : '普通用户'}
                  </Text>
                  
                  <Divider />
                  
                  <Upload
                    name="avatar"
                    showUploadList={false}
                    beforeUpload={beforeUpload}
                    customRequest={handleUploadAvatar}
                  >
                    <Button 
                      icon={<UploadOutlined />}
                      loading={avatarLoading}
                    >
                      更换头像
                    </Button>
                  </Upload>
                </Card>
              </Col>
              
              <Col xs={24} md={16}>
                <Card title="个人信息">
                  <Form
                    form={profileForm}
                    layout="vertical"
                    onFinish={handleUpdateProfile}
                    initialValues={{
                      email: userProfile?.email,
                      // fullName: userProfile?.fullName
                    }}
                  >
                    <Form.Item
                      name="username"
                      label="用户名"
                    >
                      <Input 
                        prefix={<UserOutlined />}
                        disabled
                        placeholder="用户名"
                        value={currentUser?.username}
                      />
                    </Form.Item>
                    
                    <Form.Item
                      name="email"
                      label="邮箱"
                      rules={[
                        { required: true, message: '请输入邮箱!' },
                        { type: 'email', message: '请输入有效的邮箱地址!' }
                      ]}
                    >
                      <Input 
                        prefix={<MailOutlined />}
                        placeholder="邮箱"
                      />
                    </Form.Item>
                    

                    
                    <Form.Item>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                      >
                        保存修改
                      </Button>
                    </Form.Item>
                  </Form>
                </Card>
              </Col>
            </Row>
          </TabPane>
          
          {/* 修改密码标签页 */}
          <TabPane tab="修改密码" key="2">
            <Card title="修改密码">
              <Form
                form={passwordForm}
                layout="vertical"
                onFinish={handleChangePassword}
              >
                <Form.Item
                  name="currentPassword"
                  label="当前密码"
                  rules={[
                    { required: true, message: '请输入当前密码!' }
                  ]}
                >
                  <Input.Password 
                    prefix={<LockOutlined />}
                    placeholder="当前密码"
                  />
                </Form.Item>
                
                <Form.Item
                  name="newPassword"
                  label="新密码"
                  rules={[
                    { required: true, message: '请输入新密码!' },
                    { min: 6, message: '密码至少6个字符!' }
                  ]}
                >
                  <Input.Password 
                    prefix={<LockOutlined />}
                    placeholder="新密码"
                  />
                </Form.Item>
                
                <Form.Item
                  name="confirmPassword"
                  label="确认新密码"
                  dependencies={['newPassword']}
                  rules={[
                    { required: true, message: '请确认新密码!' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('newPassword') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('两次输入的密码不一致!'));
                      },
                    }),
                  ]}
                >
                  <Input.Password 
                    prefix={<LockOutlined />}
                    placeholder="确认新密码"
                  />
                </Form.Item>
                
                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                  >
                    修改密码
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </TabPane>
        </Tabs>
      </Spin>
    </div>
  );
};

export default UserProfile;