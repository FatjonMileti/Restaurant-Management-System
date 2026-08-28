import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/authStore';
import { Box, Typography, TextField, Button, Paper } from '@mui/material';
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
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 8 }}>
      <Paper sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 2 }}>Login</Typography>
        {error && <Typography sx={{ color: 'error.main', mb: 2 }}>{error}</Typography>}
        <form onSubmit={handleSubmit(onSubmit)}>
          <TextField fullWidth type="email" placeholder="Email" {...register('email', { required: true })} margin="normal" />
          <TextField fullWidth type="password" placeholder="Password" {...register('password', { required: true })} margin="normal" />
          <Button type="submit" fullWidth variant="contained" color="primary" sx={{ mt: 2 }}>Login</Button>
        </form>
      </Paper>
      <Typography sx={{ mt: 2 }}>Don't have an account? <Link to="/register" style={{ color: '#e94560' }}>Register</Link></Typography>
    </Box>
  );
}
