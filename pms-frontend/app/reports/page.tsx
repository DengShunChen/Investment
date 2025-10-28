// pms-frontend/app/reports/page.tsx
'use client';

import React from 'react';
import { Card, Form, Select, DatePicker, Button, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';

const { Option } = Select;
const { RangePicker } = DatePicker;

// Mock data for client selection
const mockClients = [
  { id: '1', name: 'John Brown' },
  { id: '2', name: 'Jim Green' },
  { id: '3', name: 'Joe Black' },
];

const ReportsPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    const { clientId, dateRange } = values;
    const [startDate, endDate] = dateRange;

    // Format dates as YYYY-MM-DD
    const formattedStartDate = startDate.format('YYYY-MM-DD');
    const formattedEndDate = endDate.format('YYYY-MM-DD');

    console.log('Generating report for:', {
      clientId,
      startDate: formattedStartDate,
      endDate: formattedEndDate,
    });

    try {
      // Use the API proxy to call the backend PDF generation endpoint
      const response = await fetch(`/api/portfolios/${clientId}/report?format=pdf&startDate=${formattedStartDate}&endDate=${formattedEndDate}`);

      if (!response.ok) {
        throw new Error(`Report generation failed with status: ${response.status}`);
      }

      // Handle the PDF stream
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${clientId}-${formattedEndDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      message.success('Report downloaded successfully!');
    } catch (error) {
      console.error(error);
      message.error('Failed to download the report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Report Generator">
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ reportType: 'performance' }}
      >
        <Form.Item
          name="clientId"
          label="Select Client"
          rules={[{ required: true, message: 'Please select a client!' }]}
        >
          <Select placeholder="Choose a client">
            {mockClients.map(client => (
              <Option key={client.id} value={client.id}>{client.name}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="dateRange"
          label="Select Date Range"
          rules={[{ required: true, message: 'Please select a date range!' }]}
        >
          <RangePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            icon={<DownloadOutlined />}
            loading={loading}
          >
            Generate and Download PDF
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default ReportsPage;
