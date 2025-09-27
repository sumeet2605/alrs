import React, { useState, useEffect } from 'react';
import { Table, Card, Tag, Spin, Space, Button, message } from 'antd';
import type { UserResponse } from '../api/models/UserResponse'; // Generated type
import { UsersService } from '../api/services/UsersService'; // Generated service
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

const AdminUsersPage: React.FC = () => {
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Role Check
  useEffect(() => {
    if (userRole !== 'Owner') {
      message.error('Access Denied: You do not have permission to view this page.');
      navigate('/dashboard');
    }
  }, [userRole, navigate]);

  // 2. Data Fetching
  const fetchUsers = async () => {
    if (userRole !== 'Owner') return; // Double-check before fetching
    
    setLoading(true);
    try {
      // Calls the protected /api/users endpoint (token is attached via interceptor)
      const data: UserResponse[] = await UsersService.listAllUsersApiUsersGet();
      setUsers(data);
      message.success(`Successfully loaded ${data.length} users.`);
    } catch (error: any) {
      // If the token is invalid or user is not 'Owner' (401/403)
      message.error(error.message || 'Failed to fetch user list. Check server logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []); // Run only once on mount

  // 3. Table Column Definition
  const columns = [
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      sorter: (a: UserResponse, b: UserResponse) => a.username.localeCompare(b.username),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Full Name',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (text: string | null) => text || 'N/A', // Handle optional field
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const color = role === 'Owner' ? 'volcano' : 'geekblue';
        return <Tag color={color}>{role.name.toUpperCase()}</Tag>;
      },
      filters: [
        { text: 'Owner', value: 'Owner' },
        { text: 'Client', value: 'Client' },
      ],
      onFilter: (value: string | number | boolean, record: UserResponse) => record.role.indexOf(value as string) === 0,
    },
    {
      title: 'Active',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (is_active: boolean) => (
        is_active 
          ? <Tag icon={<CheckCircleOutlined />} color="success">Active</Tag>
          : <Tag icon={<CloseCircleOutlined />} color="error">Inactive</Tag>
      ),
      filters: [
        { text: 'Active', value: true },
        { text: 'Inactive', value: false },
      ],
      onFilter: (value: string | number | boolean, record: UserResponse) => record.is_active === value,
    },
    {
      title: 'Action',
      key: 'action',
      render: (text: string, record: UserResponse) => (
        <Space size="middle">
          <Button size="small" type="primary" onClick={() => message.info(`Viewing ${record.username}`)}>View</Button>
          <Button size="small" danger onClick={() => message.warn(`Deactivating ${record.username}`)}>Deactivate</Button>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
        <div 
          style={{ 
            padding: '50px', 
            textAlign: 'center', 
            borderRadius: 8, 
            border: '1px solid #e8e8e8' // Optional: add a border to the loading block
          }}
        >
          {/* Wrap the content (which is implicitly the Spin itself in standalone mode) 
              with the tip for AntD to recognize the "nesting" context. */}
          <Spin size="large" tip="Loading User Data..." />
        </div>
    );
  }

  return (
    <div>
      <Typography variant="h4" gutterBottom style={{ marginBottom: 24 }}>
        User Management (Owner Access)
      </Typography>
      
      <Card 
        title="Registered Studio Users" 
        extra={<Button type="primary" onClick={fetchUsers}>Refresh List</Button>}
      >
        <Table 
          columns={columns} 
          dataSource={users} 
          rowKey="email" // Use a unique key
          pagination={{ pageSize: 10 }} 
          scroll={{ x: 'max-content' }} // Ensures table is scrollable on small screens
        />
      </Card>
      
      <Card style={{ marginTop: 20 }} title="Administrative Tools">
        <Space wrap>
            {/* These buttons would lead to the Bulk Creation pages */}
            <Button onClick={() => message.info('Navigating to Role creation...')}>Manage Roles</Button>
            <Button onClick={() => message.info('Navigating to Permission creation...')}>Manage Permissions</Button>
        </Space>
      </Card>
    </div>
  );
};

export default AdminUsersPage;