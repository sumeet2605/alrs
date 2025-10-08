// src/pages/RegisterPage.tsx
import React, { useEffect, useState } from 'react';
import { Form, Input, Card, App, Select, Spin } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined, SignatureOutlined } from '@ant-design/icons';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { useNavigate } from 'react-router-dom';
import { UsersService } from '../api/services/UsersService'; // Generated service for register endpoint
import type { UserRegistration } from '../api/models/UserRegistration'; // Generated type

const { Option } = Select;

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [rolesLoading, setRolesLoading] = useState<boolean>(false);
  const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [form] = Form.useForm();
  const { message } = App.useApp();

  useEffect(() => {
    // fetch roles at mount
    let mounted = true;
    const loadRoles = async () => {
      setRolesLoading(true);
      try {
        const resp = await UsersService.listAllRolesApiRolesGet();
        // adapt to many possible shapes: resp may be array or {roles: [...]}
        let list: any[] = [];
        if (!resp) list = [];
        else if (Array.isArray(resp)) list = resp;
        else if (Array.isArray((resp as any).roles)) list = (resp as any).roles;
        else if (Array.isArray((resp as any).data)) list = (resp as any).data;
        else list = (resp as any);

        const normalized = (list || []).map((r: any) => ({
          id: String(r.id ?? r.role_id ?? r.name),
          name: r.name ?? r.label ?? r.role_name ?? String(r.id),
        }));

        if (mounted) setRoles(normalized);
      } catch (err: any) {
        console.error('failed loading roles', err);
        message.error('Failed to load roles (you can still register without a role).');
      } finally {
        if (mounted) setRolesLoading(false);
      }
    };
    loadRoles();
    return () => {
      mounted = false;
    };
  }, []);

  const onFinish = async (values: any) => {
    setLoading(true);

    // Filter out the full_name if it's an empty string before sending
    const payload: any = {
        username: values.username,
        email: values.email,
        password: values.password,
        full_name: values.full_name || null,
    };

    // include role in payload if selected - include both keys to be tolerant of backend naming
    if (values.role) {
      payload.role_id = values.role;
      payload.role = values.role;
    }

    try {
      // Call the generated API registration function
      await UsersService.registerUserApiRegisterPost(payload as UserRegistration);

      message.success('Registration successful!');
      navigate('/dashboard/admin/users');
    } catch (error: any) {
      // Handle Validation Errors (422) or other server errors
      const errorDetail = error?.response?.data?.detail;
      if (Array.isArray(errorDetail) && errorDetail.length > 0) {
        // Display specific validation errors from FastAPI
        errorDetail.forEach((err: any) => {
            message.error(`Field ${err.loc?.[1] ?? 'unknown'}: ${err.msg}`);
        });
      } else if (typeof errorDetail === 'string') {
        message.error(errorDetail);
      } else {
        message.error('Registration failed. Please check your details.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm" style={{ paddingTop: '5vh' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Typography component="h1" variant="h4" color="primary" gutterBottom>
          Join Alluring Lens
        </Typography>
        <Typography component="h2" variant="h5">
          Create Your Account
        </Typography>
      </div>

      <Card style={{ padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <Form
          form={form}
          name="register_form"
          onFinish={onFinish}
          layout="vertical"
          scrollToFirstError
        >
          {/* Username Field */}
          <Form.Item
            name="username"
            label="Username"
            rules={[
                { required: true, message: 'Please input your desired username!' },
                { min: 3, message: 'Username must be at least 3 characters.' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="Unique Username" size="large" />
          </Form.Item>

          {/* Email Field */}
          <Form.Item
            name="email"
            label="Email"
            rules={[
                { type: 'email', message: 'The input is not valid E-mail!' },
                { required: true, message: 'Please input your E-mail!' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Email Address" size="large" />
          </Form.Item>
          
          {/* Full Name (Optional) */}
          <Form.Item
            name="full_name"
            label="Full Name (Optional)"
            rules={[{ max: 100, message: 'Full name cannot exceed 100 characters.' }]}
          >
            <Input prefix={<SignatureOutlined />} placeholder="Your Full Name" size="large" />
          </Form.Item>

          {/* Role select (optional) */}
          <Form.Item
            name="role"
            label="Role (optional)"
            rules={[]}
          >
            {rolesLoading ? (
              <Spin />
            ) : (
              <Select placeholder="Select a role (optional)" allowClear>
                {roles.map((r) => (
                  <Option key={r.id} value={r.id}>
                    {r.name}
                  </Option>
                ))}
              </Select>
            )}
          </Form.Item>

          {/* Password Field */}
          <Form.Item
            name="password"
            label="Password"
            rules={[
                { required: true, message: 'Please input your Password!' },
                { min: 8, message: 'Password must be at least 8 characters.' }
            ]}
            hasFeedback
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password (min 8 chars)" size="large" />
          </Form.Item>

          {/* Confirm Password Field */}
          <Form.Item
            name="confirm"
            label="Confirm Password"
            dependencies={['password']}
            hasFeedback
            rules={[
              { required: true, message: 'Please confirm your password!' },
              ({ getFieldValue }) => ({
                validator(_: any, value: any) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('The two passwords that you entered do not match!'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Confirm Password" size="large" />
          </Form.Item>

          {/* Submit Button */}
          <Form.Item style={{ marginTop: 32 }}>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="secondary"
              size="large"
              disabled={loading}
              onClick={() => form.submit()}
            >
              {loading ? 'Creating Account...' : 'Register'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </Container>
  );
};

export default RegisterPage;
