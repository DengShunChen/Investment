// pms-frontend/components/AppLayout.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  DesktopOutlined,
  FileOutlined,
  PieChartOutlined,
  TeamOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Breadcrumb, Layout, Menu, theme, Spin, Button } from 'antd';
import { useAuthStore } from '../store/authStore';

const { Header, Content, Footer, Sider } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: MenuItem[],
): MenuItem {
  return { key, icon, children, label } as MenuItem;
}

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, clearAuth, user } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && !isAuthenticated && pathname !== '/login') {
      router.push('/login');
    }
  }, [hydrated, isAuthenticated, router, pathname]);

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  const menuItems: MenuItem[] =
    user?.role === 'ADVISOR'
      ? [
          getItem('Dashboard', '/', <PieChartOutlined />),
          getItem('Clients', '/clients', <UserOutlined />),
          getItem('Reports', '/reports', <FileOutlined />),
        ]
      : [
          getItem('Overview', '/', <PieChartOutlined />),
          getItem('My Portfolio', '/portfolio', <UserOutlined />),
          getItem('Reports', '/reports', <FileOutlined />),
        ];

  // If we are on the login page, render the children directly without the layout.
  // This avoids the redirect loop and showing the main layout on the login screen.
  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (!hydrated || !isAuthenticated) {
    // This check also handles the initial render before hydration.
    // A more sophisticated app might have a dedicated loading component.
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
        <div className="demo-logo-vertical" style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)' }} />
        <Menu theme="dark" defaultSelectedKeys={['/']} mode="inline" items={menuItems.map(item => ({...item, onClick: () => router.push(item?.key as string)}))} />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 16px', background: colorBgContainer, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Button type="primary" icon={<LogoutOutlined />} onClick={handleLogout}>
            Logout
          </Button>
        </Header>
        <Content style={{ margin: '0 16px' }}>
          <Breadcrumb style={{ margin: '16px 0' }}>
             <Breadcrumb.Item>User</Breadcrumb.Item>
             <Breadcrumb.Item>{user?.username || 'Guest'}</Breadcrumb.Item>
          </Breadcrumb>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            {children}
          </div>
        </Content>
        <Footer style={{ textAlign: 'center' }}>
          Portfolio Management System ©{new Date().getFullYear()}
        </Footer>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
