import React from 'react';
import {BrowserRouter} from 'react-router-dom';
import {App as AntdApp, ConfigProvider} from 'antd';
import zhCN from 'antd/lib/locale/zh_CN';
import './styles/app.css';
import AppRoutes from './routes/AppRoutes';
import {AuthProvider} from './context/AuthContext';

function App() {
  return (
    <ConfigProvider 
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 4,
        },
      }}
    >
      <BrowserRouter>
        <AuthProvider>
          <AntdApp>
            <AppRoutes />
          </AntdApp>
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;