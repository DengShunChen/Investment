// pms-frontend/app/portfolio/page.tsx
'use client';

import React from 'react';
import { Card, Row, Col, Typography, Table } from 'antd';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const { Title } = Typography;

// Mock Data - Replace with API calls
const mockAssetAllocation = [
  { name: 'US Stocks', value: 40000 },
  { name: 'International Stocks', value: 30000 },
  { name: 'Bonds', value: 20000 },
  { name: 'Cash', value: 10000 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const mockHoldingsData = [
    { id: 'h1', symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', quantity: 100, marketValue: 22000 },
    { id: 'h2', symbol: 'VXUS', name: 'Vanguard Total International Stock ETF', quantity: 150, marketValue: 30000 },
    { id: 'h3', symbol: 'BND', name: 'Vanguard Total Bond Market ETF', quantity: 50, marketValue: 20000 },
    { id: 'h4', symbol: 'CASH', name: 'Cash and Equivalents', quantity: 10000, marketValue: 10000 },
];

const holdingsColumns = [
  { title: 'Symbol', dataIndex: 'symbol', key: 'symbol' },
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Quantity', dataIndex: 'quantity', key: 'quantity' },
  { title: 'Market Value', dataIndex: 'marketValue', key: 'marketValue', render: (val: number) => `$${val.toLocaleString()}` },
];

const MyPortfolioPage: React.FC = () => {
  // In a real app, you would fetch the logged-in client's data
  // useEffect(() => { fetchPortfolioData(); }, []);

  return (
    <div>
      <Row gutter={24}>
        <Col xs={24} lg={12}>
          <Card title="Asset Allocation">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={mockAssetAllocation}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={110}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {mockAssetAllocation.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Card title="Detailed Holdings" style={{ marginTop: 24 }}>
        <Table
          columns={holdingsColumns}
          dataSource={mockHoldingsData}
          rowKey="id"
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default MyPortfolioPage;
