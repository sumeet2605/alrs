import React, { useState } from 'react';
import { Layout, Menu, theme, message, Avatar, Dropdown } from 'antd';
import { HomeOutlined, UserOutlined, SettingOutlined, LogoutOutlined, PictureOutlined, PlusOutlined } from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Typography from '@mui/material/Typography';
import { DownOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';

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
  const baseItems = [
    { key: '/dashboard', icon: <HomeOutlined />, label: 'Dashboard' },
    // Only show "Users" link if the user is an 'Owner' (admin)
    ...(userRole === 'Owner' 
      ? [{ key: '/dashboard/admin/users', icon: <UserOutlined />, label: 'User Management' }] 
      : []
    ),
    { key: '/settings', icon: <SettingOutlined />, label: 'Settings' },
  ];

  // Galleries submenu
  const galleriesSubMenu = {
    key: 'galleries',
    icon: <PictureOutlined />,
    label: 'Galleries',
    children: [
      { key: '/dashboard/galleries', label: 'All Galleries' },
      { key: '/dashboard/galleries?new=true', icon: <PlusOutlined />, label: 'New Gallery' },
    ],
  };

  // Build final menu items array
  const items = [
    ...baseItems,
    galleriesSubMenu,
    { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', danger: true }
  ];

  const handleMenuClick = (e: { key: string }) => {
    if (e.key === 'logout') {
      handleLogout();
    } else {
      // If the key contains a query (like ?new=true), navigate with full string
      navigate(e.key);
    }
  };
  
  const handleLogout = () => {
    logout();
    message.success('Successfully logged out.');
    navigate('/login');
  };

  // Derive a readable title for the header
  const resolveTitle = () => {
    // exact pathname match first
    const flattened = items.flatMap(it => (it as any).children ? (it as any).children : it);
    const exact = flattened.find((it: any) => it.key === location.pathname);
    if (exact) return exact.label;
    // check top-level items
    const top = items.find(it => it.key === location.pathname);
    if (top && (top as any).label) return (top as any).label;
    // fallback: if path starts with /dashboard/galleries/ show 'Gallery Editor'
    if (location.pathname.startsWith('/dashboard/galleries/')) return 'Gallery Editor';
    return 'Dashboard';
  };

  // --- User dropdown menu (AntD v5 menu API) ---
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar src={null} icon={<UserOutlined />} />
          <span>{userRole || 'Client'}</span>
        </span>
      ),
      disabled: true,
    },
    { type: 'divider' },
    { key: 'change-password', label: 'Change Password' },
    { key: 'logout', label: 'Logout', danger: true },
  ];

  const onUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout') return handleLogout();
    if (key === 'change-password') return navigate('/change-password');
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
          selectedKeys={[location.pathname]} 
          mode="inline" 
          items={items as any}
          onClick={handleMenuClick}
        />
      </Sider>
      
      {/* Main Content Area */}
      <Layout>
        {/* Header */}
        <Header style={{ padding: 0, background: colorBgContainer }}>
            <div style={{ padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" style={{ margin: 0 }}>
                    {resolveTitle()}
                </Typography>
                {/* User Icon and Dropdown (using menu prop) */}
                <Dropdown menu={{ items: userMenuItems, onClick: onUserMenuClick }} trigger={['click']}>
                  <span style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
                    <Avatar src={null} icon={<UserOutlined />} style={{ marginRight: 8 }} />
                    <DownOutlined />
                  </span>
                </Dropdown>
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
