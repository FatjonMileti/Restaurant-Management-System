import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/authStore';
import { Box, Typography, TextField, Button, Paper } from '@mui/material';
import { ClientError } from 'graphql-request';
import { registerSchema, RegisterFormData } from '../../validation/schemas';

const getGraphQLErrorMessage = (err: unknown): string => {
  if (err instanceof ClientError) {
    return err.response.errors?.[0]?.message || err.message || 'Registration failed';
  }
  if (err instanceof TypeError && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
    return 'Network error: backend is unavailable';
  }
  if (err instanceof Error) {
    return err.message || 'Registration failed';
  }
  return 'Registration failed';
};

export default function RegisterFormComponent() {
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });
  const [error, setError] = useState('');
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser(data.name, data.email, data.password);
      navigate('/login');
    } catch (err) {
      setError(getGraphQLErrorMessage(err));
    }
  };

  return (
    <Box className="max-w-md mx-auto mt-20">
      <Paper className="p-5 rounded-xl">
        <Typography variant="h4" className="text-2xl font-bold mb-4">Register</Typography>
        {error && <Typography className="text-red-600 mb-2">{error}</Typography>}
        <form onSubmit={handleSubmit(onSubmit)}>
          <TextField fullWidth placeholder="Name" {...register('name')} error={!!errors.name} helperText={errors.name?.message} margin="normal" />
          <TextField fullWidth type="email" placeholder="Email" {...register('email')} error={!!errors.email} helperText={errors.email?.message} margin="normal" />
          <TextField fullWidth type="password" placeholder="Password (min 6 chars)" {...register('password')} error={!!errors.password} helperText={errors.password?.message} margin="normal" />
          <TextField fullWidth placeholder="Phone" {...register('phone')} margin="normal" />
          <Button type="submit" fullWidth variant="contained" className="w-full p-3 !bg-[#e94560] hover:!bg-[#d63d54] !text-white normal-case mt-4">Register</Button>
        </form>
      </Paper>
      <Typography className="mt-2">Already have an account? <Link to="/login" className="text-[#e94560]">Login</Link></Typography>
    </Box>
  );
}
