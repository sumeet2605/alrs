import React from 'react';
import { Form, Input, Card, message } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined, SignatureOutlined } from '@ant-design/icons';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { useNavigate, Link } from 'react-router-dom';
import { UsersService } from '../api/services/UsersService'; // Generated service for register endpoint
import type { UserRegistration } from '../api/models/UserRegistration'; // Generated type

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [form] = Form.useForm();

  const onFinish = async (values: UserRegistration) => {
    setLoading(true);

    // Filter out the full_name if it's an empty string before sending
    const payload = {
        ...values,
        full_name: values.full_name || null // Ensure optional field is null if empty
    };

    try {
      // Call the generated API registration function
      await UsersService.registerUserApiRegisterPost(payload);

      message.success('Registration successful! Please log in.');
      navigate('/login');
    } catch (error: any) {
      // Handle Validation Errors (422) or other server errors
      const errorDetail = error?.response?.data?.detail;
      if (Array.isArray(errorDetail) && errorDetail.length > 0) {
        // Display specific validation errors from FastAPI
        errorDetail.forEach(err => {
            message.error(`Field ${err.loc[1]}: ${err.msg}`);
        });
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
          {/* Username Field (minLength: 3, maxLength: 50) */}
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

          {/* Email Field (format: email) */}
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

          {/* Password Field (minLength: 8) */}
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

          {/* Confirm Password Field (Client-side match check) */}
          <Form.Item
            name="confirm"
            label="Confirm Password"
            dependencies={['password']}
            hasFeedback
            rules={[
              { required: true, message: 'Please confirm your password!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
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
              onClick={() => { /* Manually trigger AntD form submit */ }}
            >
              {loading ? 'Creating Account...' : 'Register'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
      
      {/* Login Link */}
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <Typography variant="body2">
          Already have an account? <Link to="/login">Log In</Link>
        </Typography>
      </div>
    </Container>
  );
};

export default RegisterPage;