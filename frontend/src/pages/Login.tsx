import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../store/authStore';
import { AxiosError } from 'axios';

interface LoginForm {
  email: string;
  password: string;
}

function Login() {
  const { register, handleSubmit } = useForm<LoginForm>();
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password);
      navigate('/dashboard');
    } catch (err) {
      const axiosErr = err as AxiosError<{ message: string }>;
      setError(axiosErr.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20">
      <h2 className="text-2xl font-bold mb-4">Login</h2>
      {error && <p className="text-red-600 mb-3">{error}</p>}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-lg shadow">
        <input type="email" placeholder="Email" {...register('email', { required: true })} className="w-full p-3 mb-4 rounded-md border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-[#e94560]" />
        <input type="password" placeholder="Password" {...register('password', { required: true })} className="w-full p-3 mb-4 rounded-md border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-[#e94560]" />
        <button type="submit" className="w-full p-3 bg-[#e94560] text-white border-none rounded-md text-base cursor-pointer hover:bg-[#d63d54] transition-colors">Login</button>
      </form>
      <p className="mt-4">Don't have an account? <Link to="/register" className="text-[#e94560] hover:underline">Register</Link></p>
    </div>
  );
}

export default Login;
