import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../store/authStore';
import { AxiosError } from 'axios';

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  phone: string;
}

function Register() {
  const { register, handleSubmit } = useForm<RegisterForm>();
  const [error, setError] = useState('');
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (data: RegisterForm) => {
    try {
      await registerUser(data.name, data.email, data.password, data.phone);
      navigate('/dashboard');
    } catch (err) {
      const axiosErr = err as AxiosError<{ message: string }>;
      setError(axiosErr.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20">
      <h2 className="text-2xl font-bold mb-4">Register</h2>
      {error && <p className="text-red-600 mb-3">{error}</p>}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-lg shadow">
        <input placeholder="Name" {...register('name', { required: true })} className="w-full p-3 mb-4 rounded-md border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-[#e94560]" />
        <input type="email" placeholder="Email" {...register('email', { required: true })} className="w-full p-3 mb-4 rounded-md border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-[#e94560]" />
        <input type="password" placeholder="Password (min 6 chars)" {...register('password', { required: true, minLength: 6 })} className="w-full p-3 mb-4 rounded-md border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-[#e94560]" />
        <input placeholder="Phone" {...register('phone')} className="w-full p-3 mb-4 rounded-md border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-[#e94560]" />
        <button type="submit" className="w-full p-3 bg-[#e94560] text-white border-none rounded-md text-base cursor-pointer hover:bg-[#d63d54] transition-colors">Register</button>
      </form>
      <p className="mt-4">Already have an account? <Link to="/login" className="text-[#e94560] hover:underline">Login</Link></p>
    </div>
  );
}

export default Register;
