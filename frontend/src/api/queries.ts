import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { request as gqlRequest, gql } from 'graphql-request';
import { useAuthStore } from '../store/authStore';
import {
  GET_CATEGORIES,
  CREATE_CATEGORY,
  UPDATE_CATEGORY,
  DELETE_CATEGORY,
  GET_MENU_ITEMS,
  CREATE_MENU_ITEM,
  UPDATE_MENU_ITEM,
  DELETE_MENU_ITEM,
  GET_ORDERS,
  CREATE_ORDER,
  UPDATE_ORDER,
  DELETE_ORDER,
  UPDATE_ORDER_STATUS,
  GET_RESERVATIONS,
  CREATE_RESERVATION,
  UPDATE_RESERVATION,
  DELETE_RESERVATION,
  CANCEL_RESERVATION,
  GET_USERS,
  CREATE_USER,
  UPDATE_USER_ROLE,
  DELETE_USER,
  GET_RESTAURANT_SETTINGS,
  UPDATE_RESTAURANT_SETTINGS,
  GET_TABLES,
  GET_DASHBOARD_STATS,
} from '../graphql/queries';

const endpoint = process.env.REACT_APP_GRAPHQL_URL || 'http://localhost:5000/graphql';

const request = <T = any>(url: string, document: any, variables?: any) => {
  const token = useAuthStore.getState().user?.token;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return gqlRequest<T>(url, document, variables, headers);
};

const mapId = <T extends { id?: string; [k: string]: any }>(obj: T | null): T | null => {
  if (!obj) return null;
  const { id, ...rest } = obj as any;
  return { ...rest, _id: id, id: undefined } as T;
};

const mapArray = <T extends { id?: string; [k: string]: any }>(
  arr: T[] | undefined | null,
): T[] => {
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
  items: { menuItem: string; name: string; price: number; quantity: number }[];
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
  tableNumber?: number;
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
  useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const data = await request(endpoint, GET_CATEGORIES);
      return mapArray<Category>((data as any)?.categories);
    },
    staleTime: 60 * 1000,
  });

export const useCreateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string }) => request(endpoint, CREATE_CATEGORY, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useUpdateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id: string; name: string }) =>
      request(endpoint, UPDATE_CATEGORY, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useDeleteCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request(endpoint, DELETE_CATEGORY, { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useMenu = () =>
  useQuery({
    queryKey: ['menu'],
    queryFn: async () => {
      const data = await request(endpoint, GET_MENU_ITEMS);
      return mapArray<MenuItem>((data as any)?.menuItems);
    },
    staleTime: 60 * 1000,
  });

export const useCreateMenuItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<MenuItem, '_id' | 'available'>) =>
      request(endpoint, CREATE_MENU_ITEM, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menu'] });
      qc.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useUpdateMenuItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id: string; data: Partial<MenuItem> }) =>
      request(endpoint, UPDATE_MENU_ITEM, { id: payload.id, ...payload.data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menu'] });
      qc.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useDeleteMenuItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request(endpoint, DELETE_MENU_ITEM, { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menu'] });
      qc.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useOrders = () =>
  useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const data = await request(endpoint, GET_ORDERS);
      return mapArray<Order>((data as any)?.orders);
    },
    staleTime: 30 * 1000,
  });

export const useCreateOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: NewOrderPayload) => {
      const variables = {
        items: payload.items.map((i: any) => ({
          menuItem: i.menuItem,
          name: i.name || i.menuItem,
          quantity: i.quantity,
          price: i.price || 0,
        })),
        tableNumber: payload.tableNumber,
        paymentMethod: 'cash',
      };
      const data = await request(endpoint, CREATE_ORDER, variables);
      return mapId<Order>((data as any)?.createOrder);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['tables'] });
      qc.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useUpdateOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id: string; data: Partial<Order> }) =>
      request(endpoint, UPDATE_ORDER, { id: payload.id, ...payload.data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['tables'] });
      qc.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useDeleteOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request(endpoint, DELETE_ORDER, { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['tables'] });
      qc.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useUpdateOrderStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      request(endpoint, UPDATE_ORDER_STATUS, { id, status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['tables'] });
      qc.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useReservations = () =>
  useQuery({
    queryKey: ['reservations'],
    queryFn: async () => {
      const data = await request(endpoint, GET_RESERVATIONS);
      return mapArray<Reservation>((data as any)?.reservations);
    },
    staleTime: 30 * 1000,
  });

export const useCreateReservation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: NewReservationPayload) => request(endpoint, CREATE_RESERVATION, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      qc.invalidateQueries({ queryKey: ['tables'] });
      qc.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useUpdateReservation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id: string; data: Partial<Reservation> }) =>
      request(endpoint, UPDATE_RESERVATION, { id: payload.id, ...payload.data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      qc.invalidateQueries({ queryKey: ['tables'] });
      qc.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useDeleteReservation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request(endpoint, DELETE_RESERVATION, { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      qc.invalidateQueries({ queryKey: ['tables'] });
      qc.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useCancelReservation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request(endpoint, CANCEL_RESERVATION, { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      qc.invalidateQueries({ queryKey: ['tables'] });
      qc.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useUsers = () =>
  useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const data = await request(endpoint, GET_USERS);
      return mapArray<AdminUser>((data as any)?.authUsers);
    },
    staleTime: 60 * 1000,
  });

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: NewUserPayload) => request(endpoint, CREATE_USER, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useDeleteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request(endpoint, DELETE_USER, { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useUpdateUserRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      request(endpoint, UPDATE_USER_ROLE, { id, role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export interface RestaurantSettings {
  _id: string;
  name: string;
  logo: string;
  address: string;
  phone: string;
  email: string;
  tableCount: number;
}

export interface TableStatus {
  number: number;
  isBusy: boolean;
  busyType?: string | null;
  occupiedBy?: string | null;
}

export const useRestaurantSettings = () =>
  useQuery({
    queryKey: ['restaurantSettings'],
    queryFn: async () => {
      const data = await request(endpoint, GET_RESTAURANT_SETTINGS);
      const raw = (data as any)?.restaurantSettings;
      if (!raw) return null;
      return mapId<RestaurantSettings>(raw);
    },
    staleTime: 60 * 1000,
  });

export const useUpdateRestaurantSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<RestaurantSettings> & { tableCount?: number }) => {
      const vars: any = {};
      if (payload.name !== undefined) vars.name = payload.name;
      if (payload.logo !== undefined) vars.logo = payload.logo;
      if (payload.address !== undefined) vars.address = payload.address;
      if (payload.phone !== undefined) vars.phone = payload.phone;
      if (payload.email !== undefined) vars.email = payload.email;
      if (payload.tableCount !== undefined) vars.tableCount = Number(payload.tableCount);
      return request(endpoint, UPDATE_RESTAURANT_SETTINGS, vars);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['restaurantSettings'] });
      qc.invalidateQueries({ queryKey: ['tables'] });
      qc.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useTables = () =>
  useQuery({
    queryKey: ['tables'],
    queryFn: async () => {
      const data = await request(endpoint, GET_TABLES);
      return ((data as any)?.tables || []) as TableStatus[];
    },
    staleTime: 30 * 1000,
  });

export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  preparingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalReservations: number;
  confirmedReservations: number;
  completedReservations: number;
  cancelledReservations: number;
  totalMenuItems: number;
  availableMenuItems: number;
  totalUsers: number;
  totalCategories: number;
  totalTables: number;
  busyTables: number;
  freeTables: number;
  totalRevenue: number;
  todayOrders: number;
  todayReservations: number;
  recentOrders: Order[];
  ordersByStatus: { status: string; count: number }[];
  reservationsByStatus: { status: string; count: number }[];
}

export const useDashboardStats = () =>
  useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const data = await request(endpoint, GET_DASHBOARD_STATS);
      const raw = (data as any)?.dashboardStats;
      if (!raw) return null;
      return {
        ...raw,
        recentOrders: mapArray<Order>(raw.recentOrders || []),
      } as DashboardStats;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
