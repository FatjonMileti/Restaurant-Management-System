import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/authStore';
import { AxiosError } from 'axios';

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginFormComponent() {
  const { register, handleSubmit } = useForm<LoginFormData>();
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
      navigate('/dashboard');
    } catch (err) {
      const axiosErr = err as AxiosError<{ message: string }>;
      setError(axiosErr.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="auth-wrapper">
      <h2 className="page-title mb-4">Login</h2>
      {error && <p className="error-text mb-3">{error}</p>}
      <form onSubmit={handleSubmit(onSubmit)} className="auth-card">
        <input type="email" placeholder="Email" {...register('email', { required: true })} className="form-input" />
        <input type="password" placeholder="Password" {...register('password', { required: true })} className="form-input" />
        <button type="submit" className="btn-primary-block">Login</button>
      </form>
      <p className="mt-4">Don't have an account? <Link to="/register" className="text-[#e94560] hover:underline">Register</Link></p>
    </div>
  );
}
