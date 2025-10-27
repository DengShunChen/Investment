// pms-frontend/app/layout.tsx
'use client'; // This directive is necessary for Ant Design components

import React from 'react';
import { ConfigProvider } from 'antd';
import { StyleProvider } from '@ant-design/cssinjs';
import theme from '../theme'; // We will create this file next
import AppLayout from '../components/AppLayout'; // We will create this component

import './globals.css';

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en">
      <body>
        <StyleProvider hashPriority="high">
          <ConfigProvider theme={theme}>
            <AppLayout>{children}</AppLayout>
          </ConfigProvider>
        </StyleProvider>
      </body>
    </html>
  );
};

export default RootLayout;
