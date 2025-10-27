// pms-frontend/app/(auth)/login/page.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button, Form, Input, Card, message } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../../store/authStore';

const LoginPage: React.FC = () => {
  const router = useRouter();
  const { setToken } = useAuthStore();

  const onFinish = async (values: any) => {
    try {
      // NOTE: Replace with your actual API endpoint
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error('Login failed!');
      }

      const data = await response.json();

      // Assuming the API returns a token and user object
      const { token, user } = data;

      setToken(token, user);
      message.success('Login successful!');
      router.push('/'); // Redirect to the main dashboard
    } catch (error) {
      console.error(error);
      message.error('Failed to login. Please check your credentials.');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
      <Card title="Login to PMS" style={{ width: 400 }}>
        <Form
          name="normal_login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Please input your Username!' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Username" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your Password!' }]}
          >
            <Input
              prefix={<LockOutlined />}
              type="password"
              placeholder="Password"
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" style={{ width: '100%' }}>
              Log in
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage;
