import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getGraphQLErrorMessage } from '../../utils/graphqlErrors';
import {
  useCreateUser,
  useUpdateUser,
  useAdminUpdateUserPassword,
  AdminUser,
} from '../../api/queries';
import {
  userFormSchema,
  userUpdateSchema,
  UserFormData,
  UserUpdateFormData,
} from '../../validation/schemas';

const ROLES = ['customer', 'staff', 'admin'] as const;

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
  editingUser?: AdminUser | null;
}

export default function UserForm({ onSuccess, onCancel, editingUser }: Props) {
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const updatePassword = useAdminUpdateUserPassword();
  const isEditing = !!editingUser;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormData | UserUpdateFormData>({
    resolver: zodResolver(isEditing ? userUpdateSchema : userFormSchema) as any,
    defaultValues: isEditing
      ? {
          name: editingUser?.name ?? '',
          email: editingUser?.email ?? '',
          phone: editingUser?.phone ?? '',
          role: (editingUser?.role as any) ?? 'customer',
          newPassword: '',
        }
      : { name: '', email: '', password: '', phone: '', role: 'customer' },
  });

  useEffect(() => {
    if (editingUser) {
      reset({
        name: editingUser.name ?? '',
        email: editingUser.email ?? '',
        phone: editingUser.phone ?? '',
        role: (editingUser.role as any) ?? 'customer',
        newPassword: '',
      } as any);
    } else {
      reset({ name: '', email: '', password: '', phone: '', role: 'customer' } as any);
    }
  }, [editingUser, reset]);

  const onSubmit = async (data: any) => {
    try {
      if (isEditing && editingUser) {
        await updateUser.mutateAsync({
          id: editingUser._id,
          data: { name: data.name, email: data.email, phone: data.phone, role: data.role },
        });
        if (data.newPassword) {
          await updatePassword.mutateAsync({ id: editingUser._id, password: data.newPassword });
        }
      } else {
        await createUser.mutateAsync(data as UserFormData);
      }
      reset();
      onSuccess();
    } catch (err) {
      alert(getGraphQLErrorMessage(err, 'Operation failed'));
    }
  };

  const pending = createUser.isPending || updateUser.isPending || updatePassword.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-gray-100 p-5 rounded-lg mb-5">
      <input placeholder="Name" {...register('name')} className="form-input-sm" />
      {(errors as any).name && <p className="error-text text-sm">{(errors as any).name.message}</p>}
      <input type="email" placeholder="Email" {...register('email')} className="form-input-sm" />
      {(errors as any).email && (
        <p className="error-text text-sm">{(errors as any).email.message}</p>
      )}
      {!isEditing ? (
        <>
          <input
            type="password"
            placeholder="Password"
            {...register('password' as any)}
            className="form-input-sm"
          />
          {(errors as any).password && (
            <p className="error-text text-sm">{(errors as any).password.message}</p>
          )}
        </>
      ) : (
        <>
          <input
            type="password"
            placeholder="New password (leave blank to keep current)"
            {...register('newPassword' as any)}
            className="form-input-sm"
          />
          {(errors as any).newPassword && (
            <p className="error-text text-sm">{(errors as any).newPassword.message}</p>
          )}
        </>
      )}
      <input placeholder="Phone" {...register('phone')} className="form-input-sm" />
      <select {...register('role')} className="form-input-sm">
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      {(errors as any).role && <p className="error-text text-sm">{(errors as any).role.message}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? 'Saving...' : isEditing ? 'Save Changes' : 'Create User'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
