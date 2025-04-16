import React from 'react';
import { Row, Col, Card, Statistic, Typography, List, Tag, Space, Button } from 'antd';
import { 
  FileTextOutlined, 
  EyeOutlined, 
  HighlightOutlined, 
  SafetyOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph } = Typography;

// 模拟的最近活动数据
const recentActivities = [
  {
    id: 1,
    type: 'summary',
    documentName: '年度财务报告.docx',
    timestamp: '5分钟前',
    icon: <EyeOutlined style={{ color: '#1890ff' }} />,
    tag: '摘要'
  },
  {
    id: 2,
    type: 'keywords',
    documentName: '产品规划书.pdf',
    timestamp: '30分钟前',
    icon: <HighlightOutlined style={{ color: '#52c41a' }} />,
    tag: '关键词'
  },
  {
    id: 3,
    type: 'security',
    documentName: '员工信息表.xlsx',
    timestamp: '2小时前',
    icon: <SafetyOutlined style={{ color: '#faad14' }} />,
    tag: '敏感信息'
  },
  {
    id: 4,
    type: 'summary',
    documentName: '客户满意度调查.docx',
    timestamp: '昨天',
    icon: <EyeOutlined style={{ color: '#1890ff' }} />,
    tag: '摘要'
  }
];

// 模拟的功能统计数据
const statistics = {
  documents: 14,
  analysis: 27,
  keywords: 112,
  security: 8
};

const Dashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>欢迎, {currentUser?.username}!</Title>
        <Paragraph>智能文档分析系统帮助您高效管理和分析各类文档</Paragraph>
      </div>
      
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable>
            <Statistic 
              title="文档总数" 
              value={statistics.documents} 
              prefix={<FileTextOutlined />} 
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable>
            <Statistic 
              title="分析次数" 
              value={statistics.analysis} 
              prefix={<EyeOutlined />} 
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable>
            <Statistic 
              title="提取关键词" 
              value={statistics.keywords} 
              prefix={<HighlightOutlined />} 
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable>
            <Statistic 
              title="安全检测" 
              value={statistics.security} 
              prefix={<SafetyOutlined />} 
            />
          </Card>
        </Col>
      </Row>
      
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} md={16}>
          <Card 
            title="最近活动" 
            extra={<Button type="link">查看全部</Button>}
          >
            <List
              itemLayout="horizontal"
              dataSource={recentActivities}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    avatar={item.icon}
                    title={<a href="#">{item.documentName}</a>}
                    description={
                      <Space>
                        <Tag color={
                          item.type === 'summary' ? 'blue' : 
                          item.type === 'keywords' ? 'green' :
                          item.type === 'security' ? 'orange' : 'default'
                        }>
                          {item.tag}
                        </Tag>
                        <span><ClockCircleOutlined /> {item.timestamp}</span>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        
        <Col xs={24} md={8}>
          <Card title="常用功能" extra={<Button type="link">全部功能</Button>}>
            <List
              size="large"
              dataSource={[
                { title: '文档摘要', link: '/analysis/summary', icon: <EyeOutlined /> },
                { title: '关键词提取', link: '/analysis/keywords', icon: <HighlightOutlined /> },
                { title: '敏感信息检测', link: '/analysis/security', icon: <SafetyOutlined /> },
              ]}
              renderItem={item => (
                <List.Item 
                  style={{ cursor: 'pointer' }} 
                  onClick={() => navigate(item.link)}
                >
                  <Space>
                    {item.icon}
                    {item.title}
                  </Space>
                </List.Item>
              )}
            />
          </Card>
          
          <Card title="系统公告" style={{ marginTop: 16 }}>
            <Paragraph>
              <strong>新功能发布:</strong> 现已支持多种格式文档分析，包括PDF、Word、Excel等。
            </Paragraph>
            <Paragraph>
              <strong>VIP功能更新:</strong> VIP用户现可使用批量处理功能，提高工作效率。
            </Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;