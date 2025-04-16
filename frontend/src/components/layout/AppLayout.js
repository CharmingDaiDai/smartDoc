import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Badge, Typography, theme } from 'antd';
import { 
  MenuFoldOutlined, 
  MenuUnfoldOutlined, 
  UserOutlined, 
  DashboardOutlined,
  FileTextOutlined,
  LogoutOutlined,
  AppstoreOutlined,
  CrownOutlined
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { token } = theme.useToken();
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // 用户菜单项配置
  const userMenuItems = [
    {
      key: 'profile',
      label: '个人资料',
      icon: <UserOutlined />,
      onClick: () => navigate('/profile')
    },
    {
      key: 'vip',
      label: 'VIP会员中心',
      icon: <CrownOutlined />,
      onClick: () => navigate('/vip/membership')
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />,
      onClick: handleLogout
    }
  ];

  // 主侧边栏菜单项配置
  const sideMenuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
    {
      key: '/documents',
      icon: <FileTextOutlined />,
      label: '文档管理',
    },
    {
      key: 'analysis',
      icon: <AppstoreOutlined />,
      label: '文档分析',
      children: [
        {
          key: '/analysis/summary',
          label: '文档摘要',
        },
        {
          key: '/analysis/keywords',
          label: '关键词提取',
        },
        {
          key: '/analysis/polish',
          label: '文档润色',
        },
        {
          key: '/analysis/security',
          label: '敏感信息检测',
        }
      ],
    },
    ...(currentUser?.isVip ? [
      {
        key: 'vip',
        icon: <CrownOutlined />,
        label: 'VIP专区',
        children: [
          {
            key: '/vip/advanced-analysis',
            label: '高级分析',
          },
          {
            key: '/vip/batch-processing',
            label: '批量处理',
          },
        ],
      }
    ] : []),
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        theme="light"
        style={{
          boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
          zIndex: 2
        }}
      >
        <div style={{ padding: '16px', textAlign: 'center' }}>
          {collapsed ? (
            <Title level={4} style={{ margin: 0 }}>SD</Title>
          ) : (
            <Title level={3} style={{ margin: 0 }}>智能文档系统</Title>
          )}
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['analysis', 'vip']}
          items={sideMenuItems}
          onClick={({key}) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 16px',
            background: '#fff',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 1
          }}
        >
          <div>
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              className: 'trigger',
              onClick: () => setCollapsed(!collapsed),
              style: { fontSize: '18px', cursor: 'pointer' }
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              arrow
            >
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: 8 }}>
                  {currentUser?.isVip && (
                    <Badge count={<CrownOutlined style={{ color: '#faad14' }} />} offset={[-5, 5]}>
                      <Avatar 
                        icon={!currentUser?.avatarUrl && <UserOutlined />} 
                        src={currentUser?.avatarUrl}
                      />
                    </Badge>
                  )}
                  {!currentUser?.isVip && (
                    <Avatar 
                      icon={!currentUser?.avatarUrl && <UserOutlined />} 
                      src={currentUser?.avatarUrl}
                    />
                  )}
                </span>
                <span>{currentUser?.username || '用户'}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: token.colorBgContainer,
            borderRadius: 4,
            overflow: 'auto'
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;