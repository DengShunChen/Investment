// pms-frontend/app/clients/[clientId]/page.tsx
'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Descriptions, Card, Row, Col, Typography, Table } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const { Title } = Typography;

// Mock Data - Replace with API calls
const mockClientDetails = {
  id: '1',
  name: 'John Brown',
  email: 'john.brown@example.com',
  riskProfile: 'Growth',
  inceptionDate: '2022-01-15',
};

const mockPerformanceData = [
  { date: '2023-01', value: 100000 },
  { date: '2023-02', value: 102000 },
  { date: '2023-03', value: 105000 },
  { date: '2023-04', value: 103500 },
  { date: '2023-05', value: 108000 },
  { date: '2023-06', value: 112000 },
];

const mockHoldingsData = [
  { id: 'h1', symbol: 'AAPL', name: 'Apple Inc.', quantity: 50, marketValue: 7500 },
  { id: 'h2', symbol: 'GOOGL', name: 'Alphabet Inc.', quantity: 20, marketValue: 5000 },
  { id: 'h3', symbol: 'MSFT', name: 'Microsoft Corp.', quantity: 30, marketValue: 9000 },
  { id: 'h4', symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', quantity: 100, marketValue: 22000 },
];

const holdingsColumns = [
  { title: 'Symbol', dataIndex: 'symbol', key: 'symbol' },
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Quantity', dataIndex: 'quantity', key: 'quantity' },
  { title: 'Market Value', dataIndex: 'marketValue', key: 'marketValue', render: (val: number) => `$${val.toLocaleString()}` },
];

const ClientDetailPage: React.FC = () => {
  const params = useParams();
  const { clientId } = params;

  // In a real app, you would use clientId to fetch data from your API
  // useEffect(() => { fetchClientData(clientId); }, [clientId]);

  return (
    <div>
      <Card title="Client Information" style={{ marginBottom: 24 }}>
        <Descriptions bordered>
          <Descriptions.Item label="Name">{mockClientDetails.name}</Descriptions.Item>
          <Descriptions.Item label="Email">{mockClientDetails.email}</Descriptions.Item>
          <Descriptions.Item label="Risk Profile">{mockClientDetails.riskProfile}</Descriptions.Item>
          <Descriptions.Item label="Inception Date">{mockClientDetails.inceptionDate}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Row gutter={24}>
        <Col span={24}>
          <Card title="Portfolio Performance">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="#8884d8" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Card title="Current Holdings" style={{ marginTop: 24 }}>
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

export default ClientDetailPage;
