import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/authStore';
import { AxiosError } from 'axios';

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  phone: string;
}

export default function RegisterFormComponent() {
  const { register, handleSubmit } = useForm<RegisterFormData>();
  const [error, setError] = useState('');
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser(data.name, data.email, data.password);
      navigate('/login');
    } catch (err) {
      const axiosErr = err as AxiosError<{ message: string }>;
      setError(axiosErr.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="auth-wrapper">
      <h2 className="page-title mb-4">Register</h2>
      {error && <p className="error-text mb-3">{error}</p>}
      <form onSubmit={handleSubmit(onSubmit)} className="auth-card">
        <input placeholder="Name" {...register('name', { required: true })} className="form-input" />
        <input type="email" placeholder="Email" {...register('email', { required: true })} className="form-input" />
        <input type="password" placeholder="Password (min 6 chars)" {...register('password', { required: true, minLength: 6 })} className="form-input" />
        <input placeholder="Phone" {...register('phone')} className="form-input" />
        <button type="submit" className="btn-primary-block">Register</button>
      </form>
      <p className="mt-4">Already have an account? <Link to="/login" className="text-[#e94560] hover:underline">Login</Link></p>
    </div>
  );
}
