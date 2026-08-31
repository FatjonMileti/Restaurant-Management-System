import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRestaurantSettings, useUpdateRestaurantSettings } from '../../api/queries';
import SectionCard from '../SectionCard';

interface FormData {
  name: string;
  logo: string;
  address: string;
  phone: string;
  email: string;
  tableCount: number;
}

export default function RestaurantSection() {
  const { data: settings, isLoading } = useRestaurantSettings();
  const update = useUpdateRestaurantSettings();
  const [success, setSuccess] = React.useState('');
  const [error, setError] = React.useState('');

  const { register, handleSubmit, reset } = useForm<FormData>({
    defaultValues: { name: '', logo: '', address: '', phone: '', email: '', tableCount: 10 },
  });

  useEffect(() => {
    if (settings) {
      reset({
        name: settings.name || '',
        logo: settings.logo || '',
        address: settings.address || '',
        phone: settings.phone || '',
        email: settings.email || '',
        tableCount: settings.tableCount || 10,
      });
    }
  }, [settings, reset]);

  const onSubmit = async (data: FormData) => {
    setError('');
    setSuccess('');
    try {
      await update.mutateAsync({
        name: data.name,
        logo: data.logo,
        address: data.address,
        phone: data.phone,
        email: data.email,
        tableCount: Number(data.tableCount),
      });
      setSuccess('Restaurant details updated');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    }
  };

  if (isLoading) return <SectionCard title="Restaurant Details"><p className="text-gray-400">Loading...</p></SectionCard>;

  return (
    <SectionCard title="Restaurant Details">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2">
        <label className="form-label">Restaurant Name *</label>
        <input placeholder="Restaurant name" {...register('name', { required: true })} className="form-input-sm" />

        <label className="form-label">Logo URL</label>
        <input placeholder="https://... or /images/logo.png" {...register('logo')} className="form-input-sm" />
        {settings?.logo && <img src={settings.logo} alt="logo preview" className="h-12 w-12 object-cover rounded mt-1" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />}

        <label className="form-label">Address</label>
        <input placeholder="123 Main St, City" {...register('address')} className="form-input-sm" />

        <label className="form-label">Phone</label>
        <input placeholder="+1 (555) 123-4567" {...register('phone')} className="form-input-sm" />

        <label className="form-label">Email</label>
        <input type="email" placeholder="info@restaurant.com" {...register('email')} className="form-input-sm" />

        <label className="form-label">Number of Tables *</label>
        <input type="number" min={1} {...register('tableCount', { required: true, valueAsNumber: true, min: 1 })} className="form-input-sm" />

        {error && <p className="error-text text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">{success}</p>}

        <button type="submit" disabled={update.isPending} className="btn-primary w-fit mt-2">
          {update.isPending ? 'Saving...' : 'Save Details'}
        </button>
      </form>
    </SectionCard>
  );
}
