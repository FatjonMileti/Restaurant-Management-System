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

function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(form.name, form.email, form.password, form.phone);
      navigate('/dashboard');
    } catch (err) {
      const axiosErr = err as AxiosError<{ message: string }>;
      setError(axiosErr.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '80px auto' }}>
      <h2>Register</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input name="name" placeholder="Name" value={form.name} onChange={handleChange} required style={inputStyle} />
        <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required style={inputStyle} />
        <input name="password" type="password" placeholder="Password (min 6 chars)" value={form.password} onChange={handleChange} required style={inputStyle} />
        <input name="phone" placeholder="Phone" value={form.phone} onChange={handleChange} style={inputStyle} />
        <button type="submit" style={submitStyle}>Register</button>
      </form>
      <p style={{ marginTop: 15 }}>Already have an account? <Link to="/login">Login</Link></p>
    </div>
  );
}

export default Register;
