// src/components/DefaultLayout.tsx
import React, { useState, useMemo } from 'react';
import { Layout, Menu, theme, App, Dropdown, Avatar } from 'antd';
import {
  HomeOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  PictureOutlined,
  PlusOutlined,
  DownOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Typography from '@mui/material/Typography';

const { Header, Content, Sider } = Layout;

const DefaultLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { logout, userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // base items (role-aware)
  const baseItems: MenuProps['items'] = useMemo(() => {
    const items: MenuProps['items'] = [
      { key: '/dashboard', icon: <HomeOutlined />, label: 'Dashboard' },
      ...(userRole === 'Owner'
        ? [{ key: '/dashboard/admin/users', icon: <UserOutlined />, label: 'User Management' } as const]
        : []),
    ];

    // Galleries submenu
    items.push({
      key: 'galleries',
      icon: <PictureOutlined />,
      label: 'Galleries',
      children: [
        { key: '/dashboard/galleries', label: 'All Galleries' },
        { key: '/dashboard/galleries?new=true', icon: <PlusOutlined />, label: 'New Gallery' },
      ],
    });

    // Settings submenu (now includes Branding)
    items.push({
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      children: [
        { key: '/settings', label: 'General' },
        { key: '/settings/branding', label: 'Branding' }, // 👈 new
      ],
    });

    // Logout
    items.push({ key: 'logout', icon: <LogoutOutlined />, label: 'Logout', danger: true });

    return items;
  }, [userRole]);

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    if (e.key === 'logout') {
      logout();
      message.success('Successfully logged out.');
      navigate('/login');
    } else {
      navigate(e.key);
    }
  };

  // Selected/open keys so submenus expand when deep-linking
  const selectedKey = location.pathname + (location.search || '');
  const openKeys = useMemo(() => {
    const path = location.pathname;
    const keys: string[] = [];
    if (path.startsWith('/dashboard/galleries')) keys.push('galleries');
    if (path.startsWith('/settings')) keys.push('settings');
    return keys;
  }, [location.pathname]);

  const resolveTitle = () => {
    // find exact child match first
    const flat: Array<{ key: string; label: string }> = [];
    (baseItems || []).forEach((it: any) => {
      if (it?.children) {
        it.children.forEach((c: any) => flat.push({ key: c.key, label: c.label }));
      } else if (it?.key && it?.label) {
        flat.push({ key: it.key, label: it.label });
      }
    });

    const exact = flat.find((f) => f.key === selectedKey || f.key === location.pathname);
    if (exact) return exact.label;

    if (location.pathname.startsWith('/dashboard/galleries/')) return 'Gallery Editor';
    if (location.pathname.startsWith('/settings/branding')) return 'Branding';
    if (location.pathname.startsWith('/settings')) return 'Settings';
    return 'Dashboard';
  };

  // antd v5 Dropdown.menu (overlay is deprecated)
  const userMenu: MenuProps = {
    items: [
      {
        key: 'profile',
        disabled: true,
        label: (
          <span>
            <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }} />
            {userRole || 'Client'}
          </span>
        ),
      },
      { type: 'divider' },
      {
        key: 'change-password',
        label: 'Change Password',
        onClick: () => navigate('/change-password'),
      },
      {
        key: 'logout',
        danger: true,
        label: 'Logout',
        onClick: () => {
          logout();
          message.success('Successfully logged out.');
          navigate('/login');
        },
      },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
        <div
          className="demo-logo-vertical"
          style={{ height: 32, margin: 16, color: 'white', textAlign: 'center', fontWeight: 'bold' }}
        >
          {collapsed ? 'ALS' : 'Alluring Lens'}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          items={baseItems}
          selectedKeys={[selectedKey, location.pathname]}
          defaultOpenKeys={openKeys}
          onClick={handleMenuClick}
        />
      </Sider>

      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer }}>
          <div
            style={{ padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Typography variant="h6" style={{ margin: 0 }}>
              {resolveTitle()}
            </Typography>

            <Dropdown menu={userMenu} trigger={['click']}>
              <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }} />
                <DownOutlined />
              </span>
            </Dropdown>
          </div>
        </Header>

        <Content style={{ margin: '24px 16px' }}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default DefaultLayout;
