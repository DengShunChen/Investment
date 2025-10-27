// pms-frontend/app/clients/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Table, Button, Space, message, Modal, Form, Input } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';

// TODO: Replace with the actual Client type from your data model
interface Client {
  id: string;
  name: string;
  email: string;
  riskProfile: string;
}

const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchClients = async () => {
    try {
      setLoading(true);
      // NOTE: Using the API proxy we set up in next.config.mjs
      const response = await fetch('/api/clients');
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      const data = await response.json();
      setClients(data);
    } catch (error) {
      console.error(error);
      message.error('Could not load client data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Mock data for now, replace with fetchClients() when API is ready
    setClients([
      { id: '1', name: 'John Brown', email: 'john.brown@example.com', riskProfile: 'Growth' },
      { id: '2', name: 'Jim Green', email: 'jim.green@example.com', riskProfile: 'Conservative' },
      { id: '3', name: 'Joe Black', email: 'joe.black@example.com', riskProfile: 'Balanced' },
    ]);
    setLoading(false);
    // fetchClients();
  }, []);

  const handleAddClient = () => {
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      console.log('Submitting new client:', values);
      // TODO: Implement API call to create a new client
      // await fetch('/api/clients', { method: 'POST', body: JSON.stringify(values), headers: { 'Content-Type': 'application/json' } });
      message.success('Client added successfully!');
      setIsModalVisible(false);
      // fetchClients(); // Refresh the list
    } catch (info) {
      console.log('Validate Failed:', info);
    }
  };

  const columns: TableProps<Client>['columns'] = [
    { title: 'Name', dataIndex: 'name', key: 'name', render: (text, record) => <a href={`/clients/${record.id}`}>{text}</a> },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Risk Profile', dataIndex: 'riskProfile', key: 'riskProfile' },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <a>Edit</a>
          <a>Delete</a>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddClient}>
          Add Client
        </Button>
      </div>
      <Table columns={columns} dataSource={clients} loading={loading} rowKey="id" />
      <Modal
        title="Add New Client"
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
      >
        <Form form={form} layout="vertical" name="add_client_form">
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Please input the client\'s name!' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Please input a valid email!' }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ClientsPage;
