import React, { useState, useEffect } from 'react';
import { Layout, Menu, theme, message, Avatar, Dropdown } from 'antd';
import { HomeOutlined, UserOutlined, SettingOutlined, LogoutOutlined, PictureOutlined, PlusOutlined } from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Typography from '@mui/material/Typography';
import { DownOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Switch as MUISwitch, IconButton } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';

const { Header, Content, Sider } = Layout;

const DefaultLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try { return localStorage.getItem('als-darkmode') === 'true'; } catch { return false; }
  });

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

  // Galleries submenu (LEFT EXACTLY AS YOU WROTE IT — UNCHANGED)
  const galleriesSubMenu = {
    key: 'galleries',
    icon: <PictureOutlined />,
    label: 'Galleries',
    children: [
      { key: '/dashboard/galleries', label: 'All Galleries' },
      { key: '/dashboard/galleries?new=true', icon: <PlusOutlined />, label: 'New Gallery' },
    ],
  };

  // Build final menu items array (UNCHANGED)
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

  useEffect(() => {
    try { localStorage.setItem('als-darkmode', String(darkMode)); } catch {}
    document.body.style.background = darkMode ? '#121212' : '';
  }, [darkMode]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Sidebar (Sider) */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        theme={darkMode ? "dark" : "light"}
        style={{
          background: darkMode ? "#141414" : "#ffffff", // match AntD theme
        }}
      >
      <div
        className="demo-logo-vertical"
        style={{
          height: 32,
          margin: 16,
          color: darkMode ? "#fff" : "#000",
          textAlign: "center",
          fontWeight: "bold",
        }}
      >
        {collapsed ? "ALS" : "Alluring Lens"}
      </div>

      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        onClick={handleMenuClick}
        items={items as any}
        theme={darkMode ? "dark" : "light"}
        style={{
          background: darkMode ? "#141414" : "#ffffff", // constant with theme
          borderRight: "none",
        }}
      />
      </Sider>
      
      {/* Main Content Area */}
      <Layout>
        {/* Header */}
        <Header style={{ padding: 0, background: darkMode ? '#0f0f0f' : colorBgContainer }}>
            <div style={{ padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <Typography variant="h6" style={{ margin: 0 }}>
                    {resolveTitle()}
                  </Typography>
                </div>

                {/* Right-side controls: dark mode, settings, user */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <MUISwitch checked={darkMode} onChange={() => setDarkMode(!darkMode)} />

                  <IconButton onClick={() => navigate('/settings')} title="Settings" aria-label="settings" size="small">
                    <SettingsIcon />
                  </IconButton>

                  <Dropdown menu={{ items: userMenuItems, onClick: onUserMenuClick }} trigger={['click']}>
                    <span style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
                      <Avatar src={null} icon={<UserOutlined />} style={{ marginRight: 8 }} />
                      <DownOutlined />
                    </span>
                  </Dropdown>
                </div>
            </div>
        </Header>
        
        {/* Content */}
        <Content style={{ margin: '24px 16px' }}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: darkMode ? '#1f1f1f' : colorBgContainer,
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
