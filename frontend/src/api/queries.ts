import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { request, gql } from 'graphql-request';
import {
  GET_CATEGORIES, CREATE_CATEGORY, UPDATE_CATEGORY, DELETE_CATEGORY,
  GET_MENU_ITEMS, GET_MENU_ITEM, CREATE_MENU_ITEM, UPDATE_MENU_ITEM, DELETE_MENU_ITEM,
  GET_ORDERS, GET_ORDER, CREATE_ORDER, UPDATE_ORDER, DELETE_ORDER, UPDATE_ORDER_STATUS,
  GET_RESERVATIONS, GET_RESERVATION, CREATE_RESERVATION, UPDATE_RESERVATION, DELETE_RESERVATION, CANCEL_RESERVATION,
  GET_USERS, CREATE_USER, UPDATE_USER_ROLE, DELETE_USER,
} from '../graphql/queries';

const endpoint = 'http://localhost:5000/graphql';

const mapId = <T extends { id?: string; [k: string]: any }>(obj: T | null): T | null => {
  if (!obj) return null;
  const { id, ...rest } = obj as any;
  return { ...rest, _id: id, id: undefined } as T;
};

const mapArray = <T extends { id?: string; [k: string]: any }>(arr: T[] | undefined | null): T[] => {
  if (!arr) return [];
  return arr.map((item) => {
    const { id, ...rest } = item as any;
    return { ...rest, _id: id, id: undefined } as T;
  });
};

export interface Category {
  _id: string;
  name: string;
}

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
  menuItem?: string;
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

export const useCategories = () =>
  useQuery({ queryKey: ['categories'], queryFn: async () => {
    const data = await request(endpoint, GET_CATEGORIES);
    return mapArray<Category>((data as any)?.categories);
  }});

export const useCreateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string }) => request(endpoint, CREATE_CATEGORY, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
};

export const useUpdateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id: string; name: string }) => request(endpoint, UPDATE_CATEGORY, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
};

export const useDeleteCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request(endpoint, DELETE_CATEGORY, { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
};

export const useMenu = () =>
  useQuery({ queryKey: ['menu'], queryFn: async () => {
    const data = await request(endpoint, GET_MENU_ITEMS);
    return mapArray<MenuItem>((data as any)?.menuItems);
  }});

export const useCreateMenuItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<MenuItem, '_id' | 'available'>) => request(endpoint, CREATE_MENU_ITEM, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu'] }),
  });
};

export const useUpdateMenuItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id: string; data: Partial<MenuItem> }) => request(endpoint, UPDATE_MENU_ITEM, { id: payload.id, ...payload.data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu'] }),
  });
};

export const useDeleteMenuItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request(endpoint, DELETE_MENU_ITEM, { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu'] }),
  });
};

export const useOrders = () =>
  useQuery({ queryKey: ['orders'], queryFn: async () => {
    const data = await request(endpoint, GET_ORDERS);
    return mapArray<Order>((data as any)?.orders);
  }});

export const useCreateOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: NewOrderPayload) => {
      const variables = {
        items: payload.items.map((i: any) => ({ menuItem: i.menuItem, name: i.name || i.menuItem, quantity: i.quantity, price: i.price || 0 })),
        tableNumber: payload.tableNumber,
        paymentMethod: 'cash',
      };
      const data = await request(endpoint, CREATE_ORDER, variables);
      return mapId<Order>((data as any)?.createOrder);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
};

export const useUpdateOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id: string; data: Partial<Order> }) => request(endpoint, UPDATE_ORDER, { id: payload.id, ...payload.data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
};

export const useDeleteOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request(endpoint, DELETE_ORDER, { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
};

export const useUpdateOrderStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => request(endpoint, UPDATE_ORDER_STATUS, { id, status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
};

export const useReservations = () =>
  useQuery({ queryKey: ['reservations'], queryFn: async () => {
    const data = await request(endpoint, GET_RESERVATIONS);
    return mapArray<Reservation>((data as any)?.reservations);
  }});

export const useCreateReservation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: NewReservationPayload) => request(endpoint, CREATE_RESERVATION, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  });
};

export const useUpdateReservation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id: string; data: Partial<Reservation> }) => request(endpoint, UPDATE_RESERVATION, { id: payload.id, ...payload.data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  });
};

export const useDeleteReservation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request(endpoint, DELETE_RESERVATION, { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  });
};

export const useCancelReservation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request(endpoint, CANCEL_RESERVATION, { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  });
};

export const useUsers = () =>
  useQuery({ queryKey: ['users'], queryFn: async () => {
    const data = await request(endpoint, GET_USERS);
    return mapArray<AdminUser>((data as any)?.authUsers);
  }});

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: NewUserPayload) => request(endpoint, CREATE_USER, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useDeleteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request(endpoint, DELETE_USER, { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useUpdateUserRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => request(endpoint, UPDATE_USER_ROLE, { id, role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
};
