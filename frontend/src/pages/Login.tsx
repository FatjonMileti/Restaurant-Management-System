import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AxiosError } from 'axios';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: 12, marginBottom: 15, borderRadius: 5, border: '1px solid #ccc', fontSize: '1rem',
  boxSizing: 'border-box',
};

const submitStyle: React.CSSProperties = {
  width: '100%', padding: 12, background: '#e94560', color: '#fff', border: 'none', borderRadius: 5,
  fontSize: '1rem', cursor: 'pointer',
};

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      const axiosErr = err as AxiosError<{ message: string }>;
      setError(axiosErr.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '80px auto' }}>
      <h2>Login</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
        <button type="submit" style={submitStyle}>Login</button>
      </form>
      <p style={{ marginTop: 15 }}>Don't have an account? <Link to="/register">Register</Link></p>
    </div>
  );
}

export default Login;
