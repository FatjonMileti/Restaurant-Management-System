import { useQuery, useMutation } from '@apollo/client/react';
import { client } from '../graphql/client';
import {
  GET_CATEGORIES, CREATE_CATEGORY, UPDATE_CATEGORY, DELETE_CATEGORY,
  GET_MENU_ITEMS, GET_MENU_ITEM, CREATE_MENU_ITEM, UPDATE_MENU_ITEM, DELETE_MENU_ITEM,
  GET_ORDERS, GET_ORDER, CREATE_ORDER, UPDATE_ORDER, DELETE_ORDER, UPDATE_ORDER_STATUS,
  GET_RESERVATIONS, GET_RESERVATION, CREATE_RESERVATION, UPDATE_RESERVATION, DELETE_RESERVATION, CANCEL_RESERVATION,
  GET_USERS, CREATE_USER, UPDATE_USER_ROLE, DELETE_USER,
  LOGIN, REGISTER, ME,
} from '../graphql/queries';

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

export const useCategories = () => {
  const { data, loading, error } = useQuery<{ categories: any[] }>(GET_CATEGORIES, { client });
  return { data: mapArray<Category>(data?.categories), isLoading: loading, error };
};

export const useCreateCategory = () => {
  const [mutate, { loading }] = useMutation<{ createCategory: any }, { name: string }>(CREATE_CATEGORY, { client, refetchQueries: [{ query: GET_CATEGORIES }] });
  return {
    isPending: loading,
    mutateAsync: async (payload: { name: string }) => {
      const { data } = await mutate({ variables: payload });
      return mapId(data?.createCategory);
    },
  };
};

export const useUpdateCategory = () => {
  const [mutate, { loading }] = useMutation<{ updateCategory: any }, { id: string; name: string }>(UPDATE_CATEGORY, { client, refetchQueries: [{ query: GET_CATEGORIES }] });
  return {
    isPending: loading,
    mutateAsync: async (payload: { id: string; name: string }) => {
      const { data } = await mutate({ variables: { id: payload.id, name: payload.name } });
      return mapId(data?.updateCategory);
    },
  };
};

export const useDeleteCategory = () => {
  const [mutate, { loading }] = useMutation<{ deleteCategory: string }, { id: string }>(DELETE_CATEGORY, { client, refetchQueries: [{ query: GET_CATEGORIES }] });
  return {
    isPending: loading,
    mutateAsync: async (id: string) => {
      const { data } = await mutate({ variables: { id } });
      return data?.deleteCategory;
    },
  };
};

export const useMenu = () => {
  const { data, loading, error } = useQuery<{ menuItems: any[] }>(GET_MENU_ITEMS, { client });
  return { data: mapArray<MenuItem>(data?.menuItems), isLoading: loading, error };
};

export const useCreateMenuItem = () => {
  const [mutate, { loading }] = useMutation<{ createMenuItem: any }, any>(CREATE_MENU_ITEM, { client, refetchQueries: [{ query: GET_MENU_ITEMS }] });
  return {
    isPending: loading,
    mutateAsync: async (payload: Omit<MenuItem, '_id' | 'available'>) => {
      const { data } = await mutate({ variables: payload });
      return mapId<MenuItem>(data?.createMenuItem);
    },
  };
};

export const useUpdateMenuItem = () => {
  const [mutate, { loading }] = useMutation<{ updateMenuItem: any }, any>(UPDATE_MENU_ITEM, { client, refetchQueries: [{ query: GET_MENU_ITEMS }] });
  return {
    isPending: loading,
    mutateAsync: async (payload: { id: string; data: Partial<MenuItem> }) => {
      const { data } = await mutate({ variables: { id: payload.id, ...payload.data } });
      return mapId<MenuItem>(data?.updateMenuItem);
    },
  };
};

export const useDeleteMenuItem = () => {
  const [mutate, { loading }] = useMutation<{ deleteMenuItem: string }, { id: string }>(DELETE_MENU_ITEM, { client, refetchQueries: [{ query: GET_MENU_ITEMS }] });
  return {
    isPending: loading,
    mutateAsync: async (id: string) => {
      const { data } = await mutate({ variables: { id } });
      return data?.deleteMenuItem;
    },
  };
};

export const useOrders = () => {
  const { data, loading, error } = useQuery<{ orders: any[] }>(GET_ORDERS, { client });
  return { data: mapArray<Order>(data?.orders), isLoading: loading, error };
};

export const useCreateOrder = () => {
  const [mutate, { loading }] = useMutation<{ createOrder: any }, any>(CREATE_ORDER, { client, refetchQueries: [{ query: GET_ORDERS }] });
  return {
    isPending: loading,
    mutateAsync: async (payload: NewOrderPayload) => {
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
      const { data } = await mutate({ variables });
      return mapId<Order>(data?.createOrder);
    },
  };
};

export const useUpdateOrder = () => {
  const [mutate, { loading }] = useMutation<{ updateOrder: any }, any>(UPDATE_ORDER, { client, refetchQueries: [{ query: GET_ORDERS }] });
  return {
    isPending: loading,
    mutateAsync: async (payload: { id: string; data: Partial<Order> }) => {
      const { data } = await mutate({ variables: { id: payload.id, ...payload.data } });
      return mapId<Order>(data?.updateOrder);
    },
  };
};

export const useDeleteOrder = () => {
  const [mutate, { loading }] = useMutation<{ deleteOrder: string }, { id: string }>(DELETE_ORDER, { client, refetchQueries: [{ query: GET_ORDERS }] });
  return {
    isPending: loading,
    mutateAsync: async (id: string) => {
      const { data } = await mutate({ variables: { id } });
      return data?.deleteOrder;
    },
  };
};

export const useUpdateOrderStatus = () => {
  const [mutate, { loading }] = useMutation<{ updateOrderStatus: any }, { id: string; status: string }>(UPDATE_ORDER_STATUS, { client, refetchQueries: [{ query: GET_ORDERS }] });
  return {
    isPending: loading,
    mutateAsync: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await mutate({ variables: { id, status } });
      return mapId<Order>(data?.updateOrderStatus);
    },
  };
};

export const useReservations = () => {
  const { data, loading, error } = useQuery<{ reservations: any[] }>(GET_RESERVATIONS, { client });
  return { data: mapArray<Reservation>(data?.reservations), isLoading: loading, error };
};

export const useCreateReservation = () => {
  const [mutate, { loading }] = useMutation<{ createReservation: any }, any>(CREATE_RESERVATION, { client, refetchQueries: [{ query: GET_RESERVATIONS }] });
  return {
    isPending: loading,
    mutateAsync: async (payload: NewReservationPayload) => {
      const { data } = await mutate({ variables: payload });
      return mapId<Reservation>(data?.createReservation);
    },
  };
};

export const useUpdateReservation = () => {
  const [mutate, { loading }] = useMutation<{ updateReservation: any }, any>(UPDATE_RESERVATION, { client, refetchQueries: [{ query: GET_RESERVATIONS }] });
  return {
    isPending: loading,
    mutateAsync: async (payload: { id: string; data: Partial<Reservation> }) => {
      const { data } = await mutate({ variables: { id: payload.id, ...payload.data } });
      return mapId<Reservation>(data?.updateReservation);
    },
  };
};

export const useDeleteReservation = () => {
  const [mutate, { loading }] = useMutation<{ deleteReservation: string }, { id: string }>(DELETE_RESERVATION, { client, refetchQueries: [{ query: GET_RESERVATIONS }] });
  return {
    isPending: loading,
    mutateAsync: async (id: string) => {
      const { data } = await mutate({ variables: { id } });
      return data?.deleteReservation;
    },
  };
};

export const useCancelReservation = () => {
  const [mutate, { loading }] = useMutation<{ cancelReservation: any }, { id: string }>(CANCEL_RESERVATION, { client, refetchQueries: [{ query: GET_RESERVATIONS }] });
  return {
    isPending: loading,
    mutateAsync: async (id: string) => {
      const { data } = await mutate({ variables: { id } });
      return mapId<Reservation>(data?.cancelReservation);
    },
  };
};

export const useUsers = () => {
  const { data, loading, error } = useQuery<{ authUsers: any[] }>(GET_USERS, { client });
  return { data: mapArray<AdminUser>(data?.authUsers), isLoading: loading, error };
};

export const useCreateUser = () => {
  const [mutate, { loading }] = useMutation<{ createUserByAdmin: any }, any>(CREATE_USER, { client, refetchQueries: [{ query: GET_USERS }] });
  return {
    isPending: loading,
    mutateAsync: async (payload: NewUserPayload) => {
      const { data } = await mutate({ variables: payload });
      return mapId<AdminUser>(data?.createUserByAdmin);
    },
  };
};

export const useDeleteUser = () => {
  const [mutate, { loading }] = useMutation<{ deleteUser: string }, { id: string }>(DELETE_USER, { client, refetchQueries: [{ query: GET_USERS }] });
  return {
    isPending: loading,
    mutateAsync: async (id: string) => {
      const { data } = await mutate({ variables: { id } });
      return data?.deleteUser;
    },
  };
};

export const useUpdateUserRole = () => {
  const [mutate, { loading }] = useMutation<{ updateUserRole: any }, { id: string; role: string }>(UPDATE_USER_ROLE, { client, refetchQueries: [{ query: GET_USERS }] });
  return {
    isPending: loading,
    mutateAsync: async ({ id, role }: { id: string; role: string }) => {
      const { data } = await mutate({ variables: { id, role } });
      return mapId<AdminUser>(data?.updateUserRole);
    },
  };
};
