import React, { useState } from 'react';
import { AuthenticationService } from '../api/services/AuthenticationService';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await AuthenticationService.forgotPasswordApiForgotPasswordPost({ email });
      setMessage('If the email exists, a reset link has been sent.');
      setEmail('');
    } catch (err: any) {
      setError(err?.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: 24 }}>
      <h2>Forgot Password</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 8 }}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
        {error && <div style={{ color: 'red', marginTop: 16 }}>{error}</div>}
        {message && <div style={{ color: 'green', marginTop: 16 }}>{message}</div>}
      </form>
    </div>
  );
};

export default ForgotPasswordPage;
