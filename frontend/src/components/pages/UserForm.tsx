import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ClientError } from 'graphql-request';
import { useCreateUser } from '../../api/queries';
import { userFormSchema, UserFormData } from '../../validation/schemas';

const ROLES = ['customer', 'staff', 'admin'] as const;

const getGraphQLErrorMessage = (err: unknown): string => {
  if (err instanceof ClientError)
    return err.response.errors?.[0]?.message || err.message || 'Operation failed';
  if (
    err instanceof TypeError &&
    (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))
  )
    return 'Network error: backend is unavailable';
  if (err instanceof Error) return err.message || 'Operation failed';
  return 'Operation failed';
};

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function UserForm({ onSuccess, onCancel }: Props) {
  const createUser = useCreateUser();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: { name: '', email: '', password: '', phone: '', role: 'customer' },
  });

  const onSubmit = async (data: UserFormData) => {
    try {
      await createUser.mutateAsync(data);
      reset();
      onSuccess();
    } catch (err) {
      alert(getGraphQLErrorMessage(err) || 'Create failed');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-gray-100 p-5 rounded-lg mb-5">
      <input placeholder="Name" {...register('name')} className="form-input-sm" />
      {errors.name && <p className="error-text text-sm">{errors.name.message}</p>}
      <input type="email" placeholder="Email" {...register('email')} className="form-input-sm" />
      {errors.email && <p className="error-text text-sm">{errors.email.message}</p>}
      <input
        type="password"
        placeholder="Password"
        {...register('password')}
        className="form-input-sm"
      />
      {errors.password && <p className="error-text text-sm">{errors.password.message}</p>}
      <input placeholder="Phone" {...register('phone')} className="form-input-sm" />
      <select {...register('role')} className="form-input-sm">
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      {errors.role && <p className="error-text text-sm">{errors.role.message}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={createUser.isPending}>
          {createUser.isPending ? 'Creating...' : 'Create User'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
