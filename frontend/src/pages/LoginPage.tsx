import React from 'react';
import { Form, Input, Card, message } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { Body_user_login_api_login_post } from '../api/models/Body_user_login_api_login_post'; // Generated type

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [loading, setLoading] = React.useState(false);

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const onFinish = async (values: Body_user_login_api_login_post) => {
    setLoading(true);
    try {
      // Call the login function from the AuthContext
      await login(values);
      // Success is handled inside the context, we just navigate
      message.success('Login successful! Redirecting...');
      navigate('/dashboard');
    } catch (error: any) {
      // Assuming FastAPI returns structured errors or a simple 401
      const errorMessage = error?.response?.data?.detail || 'Invalid credentials or network error.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    // Use MUI Container for centering and max width
    <Container component="main" maxWidth="xs" style={{ paddingTop: '10vh' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Typography component="h1" variant="h4" color="primary" gutterBottom>
          Alluring Lens Studios
        </Typography>
        <Typography component="h2" variant="h5">
          Sign In
        </Typography>
      </div>

      {/* Ant Design Card for the modern container look */}
      <Card style={{ padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <Form
          name="login_form"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          layout="vertical"
        >
          {/* Username/Email Field */}
          <Form.Item
            name="username" // Maps to LoginRequest 'username'
            rules={[{ required: true, message: 'Please input your Username or Email!' }]}
          >
            <Input
              prefix={<MailOutlined className="site-form-item-icon" />}
              placeholder="Username or Email"
              size="large"
            />
          </Form.Item>

          {/* Password Field */}
          <Form.Item
            name="password" // Maps to LoginRequest 'password'
            rules={[{ required: true, message: 'Please input your Password!' }]}
          >
            <Input.Password
              prefix={<LockOutlined className="site-form-item-icon" />}
              placeholder="Password"
              size="large"
            />
          </Form.Item>

          {/* Submit Button (using MUI Button for styling) */}
          <Form.Item style={{ marginTop: 32 }}>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              loading={loading}
              onClick={() => { /* Manually trigger AntD form submit */ }}
            >
              {loading ? 'Logging in...' : 'Log In'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
      
    </Container>
  );
};

export default LoginPage;