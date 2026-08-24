import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import API from './axios';

export interface MenuItem {
  _id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image?: string;
  available: boolean;
}

export interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

export interface OrderUser {
  _id: string;
  name: string;
  email: string;
}

export interface Order {
  _id: string;
  user?: OrderUser;
  items: OrderItem[];
  totalAmount: number;
  status: string;
  tableNumber?: number;
  createdAt: string;
}

export interface NewOrderPayload {
  items: { menuItem: string; quantity: number }[];
  tableNumber?: number;
}

export interface ReservationUser {
  _id: string;
  name: string;
  email: string;
}

export interface Reservation {
  _id: string;
  user?: ReservationUser;
  date: string;
  time: string;
  guests: number;
  tableNumber?: number;
  status: string;
  specialRequests?: string;
  createdAt: string;
}

export interface NewReservationPayload {
  date: string;
  time: string;
  guests: number;
  specialRequests?: string;
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
}

export interface NewUserPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: string;
}

const getJSON = async <T>(url: string): Promise<T> => {
  const { data } = await API.get<T>(url);
  return data;
};

// ---- Menu ----

export const useMenu = () =>
  useQuery({ queryKey: ['menu'], queryFn: () => getJSON<MenuItem[]>('/menu') });

export const useCreateMenuItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<MenuItem, '_id' | 'available'>) => API.post('/menu', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu'] }),
  });
};

export const useDeleteMenuItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => API.delete(`/menu/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu'] }),
  });
};

// ---- Orders ----

export const useOrders = () =>
  useQuery({ queryKey: ['orders'], queryFn: () => getJSON<Order[]>('/orders') });

export const useCreateOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: NewOrderPayload) => API.post('/orders', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
};

export const useUpdateOrderStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      API.put(`/orders/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
};

// ---- Reservations ----

export const useReservations = () =>
  useQuery({ queryKey: ['reservations'], queryFn: () => getJSON<Reservation[]>('/reservations') });

export const useCreateReservation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: NewReservationPayload) => API.post('/reservations', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  });
};

export const useCancelReservation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => API.put(`/reservations/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  });
};

// ---- Admin users ----

export const useUsers = () =>
  useQuery({ queryKey: ['users'], queryFn: () => getJSON<AdminUser[]>('/auth/users') });

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: NewUserPayload) => API.post('/auth/users', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useDeleteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => API.delete(`/auth/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useUpdateUserRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      API.patch(`/auth/users/${id}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
};
