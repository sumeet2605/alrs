import React, { useMemo } from 'react';
import { Card, Row, Col, Statistic } from 'antd';
// Removed: import { useAuth } from '../contexts/AuthContext'; - This caused the build error

import Typography from '@mui/material/Typography';
import { ArrowUpOutlined, ClockCircleOutlined, TeamOutlined } from '@ant-design/icons';

// --- MOCK AuthContext/useAuth for standalone functionality (The FIX) ---
// Since the environment couldn't resolve the external import, we provide a basic hook here.
interface AuthContextType {
  // We use 'Owner' as a default role for demonstration, but this should come from your actual API response.
  userRole: string | null; 
}

/**
 * Mock useAuth hook to simulate fetching the user's role.
 * Replace this with your actual useAuth hook connected to your authentication service.
 */
const useAuth = (): AuthContextType => {
  // Assuming the user is logged in, use the role from your authentication state.
  // For now, hardcode 'Owner' to test the role-based logic.
  const mockUserRole = 'Owner'; 
  return { userRole: mockUserRole };
};
// --------------------------------------------------------------------------

/**
 * Utility function to return a dynamic team size based on the user's role.
 * You can expand this function to handle all your defined backend roles.
 */
const getTeamSizeByRole = (role: string | null | undefined): number => {
  const roleName = (role || 'Client').toLowerCase();
  switch (roleName) {
    case 'admin':
    case 'owner':
      return 15;
    case 'manager':
      return 5;
    case 'developer':
      return 3;
    default:
      return 1; // Default for 'Client' or unknown roles
  }
};

const DashboardPage: React.FC = () => {
  // Now using the mock useAuth defined above
  const { userRole } = useAuth();
  const displayRole = userRole || 'Client';
  
  // Calculate dynamic values based on the role
  const teamSize = useMemo(() => getTeamSizeByRole(userRole), [userRole]);
  const lowerCaseRole = displayRole.toLowerCase();

  // Determine custom message and logic based on role
  const quickActionMessage = useMemo(() => {
    switch (lowerCaseRole) {
      case 'admin':
      case 'owner':
        return "As an **Owner/Admin**, you have full control over user management, finance reports, and system configuration. Use the side menu to navigate key administrative tasks.";
      case 'manager':
        return "As a **Manager**, focus on monitoring active sessions, allocating resources to new projects, and reviewing team efficiency reports.";
      case 'developer':
        return "As a **Developer**, your focus is on code commits and resolving open issues. Use the task tracker for your daily priorities.";
      case 'client':
      default:
        return "As a **Client**, this dashboard provides an overview of your active projects. Use the 'Projects' menu to review status and provide feedback.";
    }
  }, [lowerCaseRole]);
  
  // Custom logic for the 'New Projects' statistic
  const newProjectsValue = lowerCaseRole === 'client' ? 1 : 11;


  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <Typography variant="h4" gutterBottom style={{ marginBottom: 24 }}>
        Welcome back, {displayRole}!
      </Typography>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card bordered={false} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <Statistic
              title="New Projects (30 Days)"
              value={newProjectsValue} // Dynamic value
              precision={0}
              valueStyle={{ color: '#3f8600' }}
              prefix={<ArrowUpOutlined />}
              suffix="projects"
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card bordered={false} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <Statistic
              title="Active Sessions"
              value={93.05}
              precision={2}
              valueStyle={{ color: '#cf1322' }}
              prefix={<ClockCircleOutlined />}
              suffix="hours"
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card bordered={false} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <Statistic
              title="Team Size"
              value={teamSize} // Dynamic value based on role
              valueStyle={{ color: '#1890ff' }}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
      </Row>
      
      <Card title="Quick Actions" style={{ marginTop: 24 }} className="shadow-lg">
        <p className="text-gray-600 mb-2">Your dashboard provides a high-level overview of your studio's operations.</p>
        {/* Using dangerouslySetInnerHTML to allow for simple Markdown-like text (e.g., **bold**) */}
        <p className="font-medium" dangerouslySetInnerHTML={{ __html: quickActionMessage }}></p>
      </Card>
    </div>
  );
};

export default DashboardPage;
