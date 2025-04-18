import React, {useEffect, useState} from 'react';
import {Button, Card, Col, Empty, List, message, Row, Space, Spin, Statistic, Tag, Typography} from 'antd';
import {
    ClockCircleOutlined,
    EyeOutlined,
    FileTextOutlined,
    HighlightOutlined,
    LoadingOutlined,
    SafetyOutlined
} from '@ant-design/icons';
import {useAuth} from '../../context/AuthContext';
import {useNavigate} from 'react-router-dom';
import {dashboardAPI} from '../../services/api';

const { Title, Paragraph } = Typography;

const Dashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [statistics, setStatistics] = useState({
    documents: 0,
    analysis: 0,
    keywords: 0,
    security: 0
  });
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 获取仪表盘数据
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 并行请求获取仪表盘数据
        const [statisticsResponse, activitiesResponse] = await Promise.all([
          dashboardAPI.getStatistics(),
          dashboardAPI.getRecentActivities(5)
        ]);

        setStatistics(statisticsResponse.data);
        
        // 处理活动数据，添加图标和标签
        const processedActivities = activitiesResponse.data.map(activity => {
          // 基于活动类型添加图标和标签颜色
          let icon = <FileTextOutlined style={{ color: '#1890ff' }} />;
          let tag = '文档';
          let color = 'default';
          let operationType = '查看';
          
          switch(activity.type) {
            case 'SUMMARY':
              icon = <EyeOutlined style={{ color: '#1890ff' }} />;
              tag = '摘要';
              color = 'blue';
              operationType = '摘要生成';
              break;
            case 'KEYWORDS':
              icon = <HighlightOutlined style={{ color: '#52c41a' }} />;
              tag = '关键词';
              color = 'green';
              operationType = '关键词提取';
              break;
            case 'SECURITY':
              icon = <SafetyOutlined style={{ color: '#faad14' }} />;
              tag = '敏感信息';
              color = 'orange';
              operationType = '安全检查';
              break;
            case 'POLISH':
              icon = <HighlightOutlined style={{ color: '#722ed1' }} />;
              tag = '润色';
              color = 'purple';
              operationType = '文档润色';
              break;
            case 'UPLOAD':
              icon = <FileTextOutlined style={{ color: '#1890ff' }} />;
              tag = '上传';
              color = 'cyan';
              operationType = '文档上传';
              break;
            case 'DOWNLOAD':
              icon = <FileTextOutlined style={{ color: '#1890ff' }} />;
              tag = '下载';
              color = 'geekblue';
              operationType = '文档下载';
              break;
            default:
              break;
          }
          
          return {
            ...activity,
            icon,
            tag,
            color,
            operationType
          };
        });
        
        setActivities(processedActivities);
      } catch (err) {
        console.error('获取仪表盘数据失败:', err);
        setError('获取仪表盘数据失败，请稍后再试');
        message.error('获取仪表盘数据失败，请稍后再试');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // 加载指示器配置
  const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '50px 0' }}>
        <Spin indicator={antIcon} tip="加载中..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Empty description={error} />
        <Button type="primary" onClick={() => window.location.reload()} style={{ marginTop: 16 }}>
          重试
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>欢迎, {currentUser?.username}!</Title>
        <Paragraph>智能文档系统帮助您高效管理和分析各类文档</Paragraph>
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
              dataSource={activities}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    avatar={item.icon}
                    title={
                      <span style={{ cursor: 'pointer' }}>
                        {item.documentName}
                        <Tag color={item.color} style={{ marginLeft: 8 }}>
                          {item.tag}
                        </Tag>
                      </span>
                    }
                    description={
                      <Space>
                        <span><ClockCircleOutlined /> {item.timestamp}</span>
                        <span>操作: {item.operationType || '查看'}</span>
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