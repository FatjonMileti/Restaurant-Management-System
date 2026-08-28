import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/authStore';
import { Box, Typography, TextField, Button, Paper } from '@mui/material';
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
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 8 }}>
      <Paper sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 2 }}>Register</Typography>
        {error && <Typography sx={{ color: 'error.main', mb: 2 }}>{error}</Typography>}
        <form onSubmit={handleSubmit(onSubmit)}>
          <TextField fullWidth placeholder="Name" {...register('name', { required: true })} margin="normal" />
          <TextField fullWidth type="email" placeholder="Email" {...register('email', { required: true })} margin="normal" />
          <TextField fullWidth type="password" placeholder="Password (min 6 chars)" {...register('password', { required: true, minLength: 6 })} margin="normal" />
          <TextField fullWidth placeholder="Phone" {...register('phone')} margin="normal" />
          <Button type="submit" fullWidth variant="contained" color="primary" sx={{ mt: 2 }}>Register</Button>
        </form>
      </Paper>
      <Typography sx={{ mt: 2 }}>Already have an account? <Link to="/login" style={{ color: '#e94560' }}>Login</Link></Typography>
    </Box>
  );
}
