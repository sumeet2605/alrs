import React, { useState } from 'react';
import { AuthenticationService } from '../api/services/AuthenticationService';
import type { ChangePasswordRequest } from '../api/models/ChangePasswordRequest';

const ChangePasswordPage: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Password policy checks
  const passwordPolicies = [
    {
      label: 'At least 8 characters',
      test: (pw: string) => pw.length >= 8,
    },
    {
      label: 'At least one uppercase letter',
      test: (pw: string) => /[A-Z]/.test(pw),
    },
    {
      label: 'At least one lowercase letter',
      test: (pw: string) => /[a-z]/.test(pw),
    },
    {
      label: 'At least one digit',
      test: (pw: string) => /\d/.test(pw),
    },
    {
      label: 'At least one special character',
      test: (pw: string) => /[^A-Za-z0-9]/.test(pw),
    },
  ];
  const passwordPolicyResults = passwordPolicies.map(p => p.test(newPassword));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match');
      setLoading(false);
      return;
    }
    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      setLoading(false);
      return;
    }
    if (!passwordPolicies.every(p => p.test(newPassword))) {
      setError('New password does not meet all password policies');
      setLoading(false);
      return;
    }
    try {
      const payload: ChangePasswordRequest = {
        current_password: currentPassword,
        new_password: newPassword,
      };
      const response = await AuthenticationService.changePasswordApiChangePasswordPost(payload);
      setSuccess(response.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: 24 }}>
      <h2>Change Password</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label>Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
            minLength={8}
            style={{ width: '100%', padding: 8 }}
          />
          <ul style={{ margin: '8px 0 0 0', padding: 0, listStyle: 'none', fontSize: 13 }}>
            {passwordPolicies.map((policy, idx) => (
              <li key={policy.label} style={{ color: passwordPolicyResults[idx] ? 'green' : 'red' }}>
                {passwordPolicyResults[idx] ? '✓' : '✗'} {policy.label}
              </li>
            ))}
          </ul>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            style={{ width: '100%', padding: 8 }}
          />
          {confirmPassword && newPassword !== confirmPassword && (
            <div style={{ color: 'red', marginTop: 8 }}>
              New password and confirm password do not match
            </div>
          )}
          {newPassword && currentPassword === newPassword && (
            <div style={{ color: 'red', marginTop: 8 }}>
              New password must be different from current password
            </div>
          )}
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 8 }}>
          {loading ? 'Changing...' : 'Change Password'}
        </button>
        {error && <div style={{ color: 'red', marginTop: 16 }}>{error}</div>}
        {success && <div style={{ color: 'green', marginTop: 16 }}>{success}</div>}
      </form>
    </div>
  );
};

export default ChangePasswordPage;
