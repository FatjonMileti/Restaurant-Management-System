import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { request as gqlRequest, gql } from 'graphql-request';
import { useAuth, useAuthStore } from '../store/authStore';
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
  resolveGraphQLEndpoint,
} from '../graphql/queries';

const endpoint = resolveGraphQLEndpoint();

const request = <T = any>(url: string, document: any, variables?: any) => {
  const token = useAuthStore.getState().user?.token;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return gqlRequest<T>(url, document, variables, headers);
};

export const mapId = <T extends { id?: string; [k: string]: any }>(obj: T | null): T | null => {
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

// Nested `user` refs arrive as `{ id, ... }` — mapArray only converts the
// top-level id, so normalize the nested ref too. Without this,
// `order.user._id` is undefined and user-based filtering (and isOwner)
// never matches.
export const mapUserRef = <T extends { user?: any }>(obj: T): T => {
  const u = (obj as any)?.user;
  if (!u || typeof u !== 'object') return obj;
  const { id, _id, ...rest } = u;
  return { ...(obj as any), user: { ...rest, _id: _id ?? id, id: undefined } };
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
  updatedAt?: string;
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
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  tableNumber?: number;
  createdAt: string;
}

export interface NewOrderPayload {
  items: OrderItem[];
  tableNumber: number;
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
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  createdAt: string;
}

export interface NewReservationPayload {
  date: string;
  time: string;
  guests: number;
  tableNumber?: number;
  specialRequests?: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
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
    staleTime: Infinity,
  });

export const useCreateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string }) => request(endpoint, CREATE_CATEGORY, payload),
    onSuccess: (newCategory) => {
      qc.setQueryData(['categories'], (oldData: any) => {
        const list = oldData ?? [];
        const id = newCategory.createCategory.id;
        // The SSE upsert can land before the mutation response — skip dupes.
        if (list.some((c: any) => c && (c._id === id || c.id === id))) return list;
        return [...list, { ...newCategory.createCategory, _id: id }];
      });
      qc.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useUpdateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id: string; name: string }) =>
      request(endpoint, UPDATE_CATEGORY, payload),
    onSuccess: (updatedCategory) => {
      qc.setQueryData(['categories'], (oldData: any) => {
        return oldData.map((category: any) =>
          category._id === updatedCategory.updateCategory.id
            ? { ...category, name: updatedCategory.updateCategory.name }
            : category,
        );
      });
      qc.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useDeleteCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request(endpoint, DELETE_CATEGORY, { id }),
    onSuccess: (_, id) => {
      qc.setQueryData(['categories'], (oldData: any) => {
        return oldData.filter((category: Category) => category._id !== id);
      });
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
    staleTime: Infinity,
  });

export const useCreateMenuItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<MenuItem, '_id' | 'available'>) =>
      request(endpoint, CREATE_MENU_ITEM, payload),
    onSuccess: (newItem) => {
      qc.setQueryData(['menu'], (oldData: any) => {
        const list = oldData ?? [];
        const id = newItem.createMenuItem.id;
        // The SSE upsert can land before the mutation response — skip dupes.
        if (list.some((m: any) => m && (m._id === id || m.id === id))) return list;
        return [...list, { ...newItem.createMenuItem, _id: id }];
      });
      qc.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useUpdateMenuItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id: string; data: Partial<MenuItem> }) =>
      request(endpoint, UPDATE_MENU_ITEM, { id: payload.id, ...payload.data }),
    onSuccess: (updatedItem) => {
      qc.setQueryData(['menu'], (oldData: any) => {
        return oldData?.map((item: any) =>
          item._id === updatedItem.updateMenuItem.id
            ? { ...updatedItem.updateMenuItem, _id: updatedItem.updateMenuItem.id }
            : item,
        );
      });
    },
  });
};

export const useDeleteMenuItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request(endpoint, DELETE_MENU_ITEM, { id }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['dashboardStats'] });
      // Remove item from cache
      qc.setQueryData(['menu'], (oldData: any) => {
        return oldData?.filter((item: any) => item._id !== id);
      });
    },
  });
};

export const useOrders = () =>
  useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const data = await request(endpoint, GET_ORDERS);
      return mapArray<Order>((data as any)?.orders).map(mapUserRef);
    },
    staleTime: Infinity,
  });

export const useCreateOrder = () => {
  const qc = useQueryClient();
  const { user: authUser } = useAuth();
  return useMutation({
    mutationFn: async (payload: NewOrderPayload) => {
      const variables = {
        items: payload.items,
        tableNumber: payload.tableNumber,
        paymentMethod: 'cash',
      };
      const data = await request(endpoint, CREATE_ORDER, variables);
      return mapId<Order>((data as any)?.createOrder);
    },
    onSuccess: (newOrder) => {
      // The mutation result carries `id` (not `_id`) and a server-populated
      // user; normalize to the cached Order shape (OrderUser with `_id`) so
      // user filtering/isOwner keeps working. Prepend: the list is ordered
      // newest-first, so the new order belongs at the top.
      if (newOrder) {
        const orderWithUser: Order = {
          ...newOrder,
          user: authUser
            ? { _id: authUser._id, name: authUser.name, email: authUser.email }
            : newOrder.user,
        };
        qc.setQueryData(['orders'], (oldData: any) => {
          const list = oldData ?? [];
          // The orders:changed SSE event can land before the mutation
          // response — skip when the order is already cached.
          if (
            list.some(
              (o: Order) =>
                o && (o._id === orderWithUser._id || (o as any).id === orderWithUser._id),
            )
          ) {
            return list;
          }
          return [orderWithUser, ...list];
        });
      } else {
        qc.invalidateQueries({ queryKey: ['orders'] });
      }
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
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ['orders'] });
      const previousOrders = qc.getQueryData<Order[]>(['orders']);
      // UPDATE_ORDER returns only scalar fields, so the edited values must
      // come from the variables. totalAmount is recomputed like the backend
      // does when items change without an explicit total. Raw form items
      // carry `menuItem` as an id string (cached orders hold objects) — this
      // is render-safe (OrderCard/OrderForm handle both) and the settled
      // refetch restores the server shape.
      qc.setQueryData(['orders'], (oldData: any) =>
        (oldData ?? []).map((order: Order) =>
          order._id === payload.id
            ? {
                ...order,
                ...payload.data,
                totalAmount:
                  payload.data.totalAmount ??
                  (payload.data.items
                    ? payload.data.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
                    : order.totalAmount),
              }
            : order,
        ),
      );
      return { previousOrders };
    },
    onError: (_err, _payload, context) => {
      if (context?.previousOrders) qc.setQueryData(['orders'], context.previousOrders);
    },
    onSettled: (_data, _err, payload, context) => {
      // Table occupancy derives from orders' table numbers — skip the tables
      // refetch when the table didn't change. Unknown previous state stays
      // safe by invalidating.
      const prevTable = context?.previousOrders?.find((o) => o._id === payload.id)?.tableNumber;
      const tableChanged =
        payload.data.tableNumber === undefined
          ? false
          : prevTable === undefined || payload.data.tableNumber !== prevTable;
      if (tableChanged) qc.invalidateQueries({ queryKey: ['tables'] });
      qc.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useDeleteOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request(endpoint, DELETE_ORDER, { id }),
    onSuccess: (_, id) => {
      qc.setQueryData(['orders'], (oldData: any) => {
        return oldData?.filter((item: any) => item._id !== id);
      });
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
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ['orders'] });
      const previousOrders = qc.getQueryData<Order[]>(['orders']);
      qc.setQueryData(['orders'], (oldData: any) =>
        (oldData ?? []).map((order: Order) =>
          order._id === payload.id
            ? { ...order, status: payload.status as Order['status'] }
            : order,
        ),
      );
      return { previousOrders };
    },
    onError: (_err, _payload, context) => {
      if (context?.previousOrders) qc.setQueryData(['orders'], context.previousOrders);
    },
    onSettled: () => {
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
      return mapArray<Reservation>((data as any)?.reservations).map(mapUserRef);
    },
    staleTime: Infinity,
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
    onSuccess: (_, id) => {
      qc.setQueryData(['reservations'], (oldData: any) => {
        return oldData?.filter((reservation: Reservation) => reservation._id !== id);
      });
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
    staleTime: Infinity,
  });

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: NewUserPayload) => request(endpoint, CREATE_USER, payload),
    onSuccess: (newUser) => {
      qc.setQueryData(['users'], (oldData: any) => {
        const list = oldData ?? [];
        const id = newUser.createUserByAdmin.id;
        // The SSE upsert can land before the mutation response — skip dupes.
        if (list.some((u: any) => u && (u._id === id || u.id === id))) return list;
        return [...list, { ...newUser.createUserByAdmin, _id: id }];
      });
      qc.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useDeleteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request(endpoint, DELETE_USER, { id }),
    onSuccess: (_, id) => {
      qc.setQueryData(['users'], (oldData: any) => {
        return oldData?.filter((user: AdminUser) => user._id !== id);
      });
      qc.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useUpdateUserRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      request(endpoint, UPDATE_USER_ROLE, { id, role }),
    onSuccess: (_, { id, role }) => {
      qc.setQueryData(['users'], (oldData: any) => {
        return oldData?.map((user: AdminUser) => {
          if (user._id === id) {
            return { ...user, role };
          }
          return user;
        });
      });
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
  updatedAt?: string;
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
    staleTime: Infinity,
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
    onSuccess: (_, payload) => {
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
    meta: { silent: true },
    staleTime: Infinity,
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
        recentOrders: mapArray<Order>(raw.recentOrders || []).map(mapUserRef),
      } as DashboardStats;
    },
    meta: { silent: true },
    staleTime: Infinity,
    // refetchInterval: 60 * 1000,
  });
