import React, {useState} from 'react';
import {Button, Card, Divider, Form, Input, Typography, Row, Col, Carousel, Space} from 'antd';
import {IdcardOutlined, LockOutlined, MailOutlined, UserOutlined, FileTextOutlined, SafetyCertificateOutlined, RocketOutlined, CrownOutlined} from '@ant-design/icons';
import {Link, useNavigate} from 'react-router-dom';
import {useAuth} from '../../context/AuthContext';

const { Title, Text, Paragraph } = Typography;

const Register = () => {
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const success = await register(values);
      if (success) {
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // 系统特点和主要功能
  const features = [
    {
      icon: <FileTextOutlined style={{ fontSize: 32 }} />,
      title: '智能文档管理',
      description: '多格式支持、在线预览与检索，让文档管理更轻松'
    },
    {
      icon: <SafetyCertificateOutlined style={{ fontSize: 32 }} />,
      title: '智能分析引擎',
      description: '关键词提取、文本润色、安全审查和摘要生成，深度挖掘文档价值'
    },
    {
      icon: <RocketOutlined style={{ fontSize: 32 }} />,
      title: '先进AI技术',
      description: '基于Langchain4j框架与大语言模型，实现高精度智能文档处理'
    },
    {
      icon: <CrownOutlined style={{ fontSize: 32 }} />,
      title: 'VIP增值服务',
      description: '更大存储空间、更高并发性能和定制化分析模型'
    }
  ];

  return (
    <div style={{ 
      height: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      overflow: 'hidden',
      margin: 0,
      padding: 0
    }}>
      <Row style={{ width: '100%', height: '100%' }} justify="center" align="middle">
        <Col xs={24} sm={24} md={22} lg={20} xl={18} xxl={16}>
          <Card 
            bordered={false}
            style={{ 
              borderRadius: '16px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
              height: '90vh',
              display: 'flex',
              flexDirection: 'column'
            }}
            bodyStyle={{ padding: 0, height: '100%' }}
          >
            <Row style={{ height: '100%' }}>
              {/* 左侧系统介绍 */}
              <Col xs={0} sm={0} md={14} lg={14} xl={14} 
                style={{ 
                  background: 'linear-gradient(120deg, #1890ff 0%, #096dd9 100%)', 
                  padding: '40px',
                  color: 'white',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <Title level={1} style={{ color: 'white', marginBottom: 30 }}>
                      智能文档系统
                    </Title>
                    <Paragraph style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, marginBottom: 40 }}>
                      利用先进的AI技术，为您提供从文档管理、智能分析到知识推理的一站式解决方案。
                    </Paragraph>
                  </div>
                  
                  <Carousel autoplay dots={{ className: 'carousel-dots' }} style={{ flex: 1 }}>
                    {features.map((feature, index) => (
                      <div key={index} style={{ padding: '40px 20px' }}>
                        <div style={{ textAlign: 'center', marginBottom: 30 }}>
                          {feature.icon}
                        </div>
                        <Title level={3} style={{ color: 'white', textAlign: 'center', marginTop: 0 }}>
                          {feature.title}
                        </Title>
                        <Paragraph style={{ color: 'rgba(255,255,255,0.85)', textAlign: 'center', fontSize: 16 }}>
                          {feature.description}
                        </Paragraph>
                      </div>
                    ))}
                  </Carousel>
                  
                  <div style={{ marginTop: 30 }}>
                    <Paragraph style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', fontSize: 13 }}>
                      © 2025 智能文档系统 V1.0
                    </Paragraph>
                  </div>
                </div>
              </Col>
              
              {/* 移动端视图 - 顶部标题区域 */}
              <Col xs={24} sm={24} md={0} style={{ 
                padding: '30px', 
                background: 'linear-gradient(120deg, #1890ff 0%, #096dd9 100%)',
                textAlign: 'center'
              }}>
                <Title level={2} style={{ color: 'white', marginBottom: 10 }}>
                  智能文档系统
                </Title>
                <Paragraph style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
                  AI驱动的一站式文档智能化平台
                </Paragraph>
              </Col>
              
              {/* 右侧注册表单 */}
              <Col 
                xs={24} sm={24} md={10} lg={10} xl={10} 
                style={{ 
                  padding: '30px', 
                  display: 'flex', 
                  flexDirection: 'column',
                  justifyContent: 'center',
                  height: '100%',
                  overflowY: 'auto'
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <Title level={2}>创建账户</Title>
                  <Text type="secondary">加入智能文档系统，体验AI的力量</Text>
                </div>
                
                <Form
                  name="register"
                  initialValues={{ remember: true }}
                  onFinish={onFinish}
                  size="large"
                  layout="vertical"
                >
                  <Form.Item
                    name="username"
                    rules={[
                      { required: true, message: '请输入用户名!' },
                      { min: 3, message: '用户名至少3个字符!' }
                    ]}
                  >
                    <Input 
                      prefix={<UserOutlined />} 
                      placeholder="用户名" 
                      size="large"
                    />
                  </Form.Item>

                  <Form.Item
                    name="email"
                    rules={[
                      { required: true, message: '请输入邮箱!' },
                      { type: 'email', message: '请输入有效的邮箱地址!' }
                    ]}
                  >
                    <Input 
                      prefix={<MailOutlined />} 
                      placeholder="邮箱" 
                      size="large"
                    />
                  </Form.Item>

                  <Form.Item
                    name="fullName"
                    rules={[{ required: true, message: '请输入您的全名!' }]}
                  >
                    <Input 
                      prefix={<IdcardOutlined />} 
                      placeholder="全名" 
                      size="large"
                    />
                  </Form.Item>

                  <Form.Item
                    name="password"
                    rules={[
                      { required: true, message: '请输入密码!' },
                      { min: 6, message: '密码至少6个字符!' }
                    ]}
                  >
                    <Input.Password
                      prefix={<LockOutlined />}
                      placeholder="密码"
                      size="large"
                    />
                  </Form.Item>

                  <Form.Item
                    name="confirmPassword"
                    dependencies={['password']}
                    rules={[
                      { required: true, message: '请确认密码!' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('password') === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('两次输入的密码不匹配!'));
                        },
                      }),
                    ]}
                  >
                    <Input.Password
                      prefix={<LockOutlined />}
                      placeholder="确认密码"
                      size="large"
                    />
                  </Form.Item>

                  <Form.Item>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      style={{ width: '100%', height: '46px', borderRadius: '8px' }}
                      loading={loading}
                      size="large"
                    >
                      注册
                    </Button>
                  </Form.Item>
                  
                  <Divider plain>或者</Divider>
                  
                  <div style={{ textAlign: 'center' }}>
                    <Space>
                      <Text type="secondary">已有账户?</Text>
                      <Link to="/login">
                        <Button type="link" style={{ padding: 0 }}>立即登录</Button>
                      </Link>
                    </Space>
                  </div>
                </Form>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
      
      <style jsx>{`
        .carousel-dots li button {
          background: rgba(255, 255, 255, 0.3) !important;
        }
        .carousel-dots li.slick-active button {
          background: white !important;
        }
      `}</style>
    </div>
  );
};

export default Register;