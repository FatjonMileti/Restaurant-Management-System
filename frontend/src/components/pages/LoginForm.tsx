import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/authStore';
import { Box, Typography, TextField, Button, Paper } from '@mui/material';
import { ClientError } from 'graphql-request';

const getGraphQLErrorMessage = (err: unknown): string => {
  if (err instanceof ClientError) {
    return err.response.errors?.[0]?.message || err.message || 'Login failed';
  }
  if (err instanceof TypeError && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
    return 'Network error: backend is unavailable';
  }
  if (err instanceof Error) {
    return err.message || 'Login failed';
  }
  return 'Login failed';
};

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
      setError(getGraphQLErrorMessage(err));
    }
  };

  return (
    <Box className="max-w-md mx-auto mt-20">
      <Paper className="p-5 rounded-xl">
        <Typography variant="h4" className="text-2xl font-bold mb-4">Login</Typography>
        {error && <Typography className="text-red-600 mb-2">{error}</Typography>}
        <form onSubmit={handleSubmit(onSubmit)}>
          <TextField fullWidth type="email" placeholder="Email" {...register('email', { required: true })} margin="normal" />
          <TextField fullWidth type="password" placeholder="Password" {...register('password', { required: true })} margin="normal" />
          <Button type="submit" fullWidth variant="contained" className="w-full p-3 !bg-[#e94560] hover:!bg-[#d63d54] !text-white normal-case mt-4">Login</Button>
        </form>
      </Paper>
      <Typography className="mt-2">Don't have an account? <Link to="/register" className="text-[#e94560]">Register</Link></Typography>
    </Box>
  );
}
