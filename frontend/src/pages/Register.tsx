import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../store/authStore';
import { AxiosError } from 'axios';

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
    <div className="max-w-md mx-auto mt-20">
      <h2 className="text-2xl font-bold mb-4">Register</h2>
      {error && <p className="text-red-600 mb-3">{error}</p>}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
        <input name="name" placeholder="Name" value={form.name} onChange={handleChange} required className="w-full p-3 mb-4 rounded-md border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-[#e94560]" />
        <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required className="w-full p-3 mb-4 rounded-md border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-[#e94560]" />
        <input name="password" type="password" placeholder="Password (min 6 chars)" value={form.password} onChange={handleChange} required className="w-full p-3 mb-4 rounded-md border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-[#e94560]" />
        <input name="phone" placeholder="Phone" value={form.phone} onChange={handleChange} className="w-full p-3 mb-4 rounded-md border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-[#e94560]" />
        <button type="submit" className="w-full p-3 bg-[#e94560] text-white border-none rounded-md text-base cursor-pointer hover:bg-[#d63d54] transition-colors">Register</button>
      </form>
      <p className="mt-4">Already have an account? <Link to="/login" className="text-[#e94560] hover:underline">Login</Link></p>
    </div>
  );
}

export default Register;
