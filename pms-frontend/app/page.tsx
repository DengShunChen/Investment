// pms-frontend/app/page.tsx
'use client';

import React from 'react';
import { useAuthStore } from '../store/authStore';
import { Card, Row, Col, Statistic } from 'antd';
import { ArrowUpOutlined, UserOutlined } from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Mock Data
const mockAdvisorStats = {
  aum: 12500000,
  clientCount: 84,
  performanceYTD: 5.7,
};

const mockClientPerformance = [
  { date: '2023-01', value: 100000 },
  { date: '2023-02', value: 102000 },
  { date: '2023-03', value: 105000 },
  { date: '2023-04', value: 103500 },
  { date: '2023-05', value: 108000 },
  { date: '2023-06', value: 112000 },
];

const AdvisorDashboard: React.FC = () => (
  <div>
    <h1>Advisor Dashboard</h1>
    <Row gutter={16}>
      <Col span={8}>
        <Card>
          <Statistic
            title="Assets Under Management (AUM)"
            value={mockAdvisorStats.aum}
            precision={0}
            prefix="$"
          />
        </Card>
      </Col>
      <Col span={8}>
        <Card>
          <Statistic
            title="Active Clients"
            value={mockAdvisorStats.clientCount}
            prefix={<UserOutlined />}
          />
        </Card>
      </Col>
      <Col span={8}>
        <Card>
          <Statistic
            title="YTD Performance"
            value={mockAdvisorStats.performanceYTD}
            precision={2}
            valueStyle={{ color: '#3f8600' }}
            prefix={<ArrowUpOutlined />}
            suffix="%"
          />
        </Card>
      </Col>
    </Row>
  </div>
);

const ClientOverview: React.FC = () => (
  <div>
    <h1>Your Portfolio Overview</h1>
    <Card title="Performance Summary">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={mockClientPerformance}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="value" stroke="#8884d8" name="Portfolio Value" />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  </div>
);


const HomePage: React.FC = () => {
  const { user } = useAuthStore();

  if (user?.role === 'ADVISOR') {
    return <AdvisorDashboard />;
  }

  if (user?.role === 'CLIENT') {
    return <ClientOverview />;
  }

  // Fallback or loading state
  return <div>Welcome to the Portfolio Management System.</div>;
};

export default HomePage;
