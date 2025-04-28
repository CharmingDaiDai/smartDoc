import React from 'react';
import {BrowserRouter} from 'react-router-dom';
import {ConfigProvider} from 'antd';
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
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;