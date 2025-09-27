import React, { useState } from 'react';
import { Layout, Menu, theme, message } from 'antd';
import { HomeOutlined, UserOutlined, SettingOutlined, LogoutOutlined } from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Typography from '@mui/material/Typography';

const { Header, Content, Sider } = Layout;

const DefaultLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { logout, userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  
  // Define menu items based on user role
  const menuItems = [
    { key: '/dashboard', icon: <HomeOutlined />, label: 'Dashboard' },
    // Only show "Users" link if the user is an 'Owner' (admin)
    ...(userRole === 'Owner' 
      ? [{ key: '/admin/users', icon: <UserOutlined />, label: 'User Management' }] 
      : []
    ),
    { key: '/settings', icon: <SettingOutlined />, label: 'Settings' },
  ];

  const handleMenuClick = (e: { key: string }) => {
    if (e.key === 'logout') {
      handleLogout();
    } else {
      navigate(e.key);
    }
  };
  
  const handleLogout = () => {
    logout();
    message.success('Successfully logged out.');
    navigate('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Sidebar (Sider) */}
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
        <div className="demo-logo-vertical" style={{ 
          height: 32, 
          margin: 16, 
          color: 'white', 
          textAlign: 'center',
          fontWeight: 'bold' 
        }}>
          {collapsed ? 'ALS' : 'Alluring Lens'}
        </div>
        <Menu 
          theme="dark" 
          defaultSelectedKeys={[location.pathname]} 
          mode="inline" 
          items={[
            ...menuItems, 
            { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', danger: true }
          ]}
          onClick={handleMenuClick}
        />
      </Sider>
      
      {/* Main Content Area */}
      <Layout>
        {/* Header */}
        <Header style={{ padding: 0, background: colorBgContainer }}>
            <div style={{ padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" style={{ margin: 0 }}>
                    {/* Display current path title */}
                    {menuItems.find(item => item.key === location.pathname)?.label || 'Dashboard'}
                </Typography>
                <Typography variant="body1">
                    Welcome, {userRole || 'Client'}
                </Typography>
            </div>
        </Header>
        
        {/* Content */}
        <Content style={{ margin: '24px 16px' }}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            {/* The routed content goes here */}
            <Outlet /> 
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default DefaultLayout;