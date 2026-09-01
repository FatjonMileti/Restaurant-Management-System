import { create } from 'zustand';

export interface CartItem {
  menuItem: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: { _id: string; name: string; price: number }) => void;
  removeItem: (menuItemId: string) => void;
  replaceItems: (items: CartItem[]) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],

  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((c) => c.menuItem === item._id);
      if (existing) {
        return {
          items: state.items.map((c) =>
            c.menuItem === item._id ? { ...c, quantity: c.quantity + 1 } : c,
          ),
        };
      }
      return {
        items: [
          ...state.items,
          { menuItem: item._id, name: item.name, price: item.price, quantity: 1 },
        ],
      };
    }),

  removeItem: (menuItemId) =>
    set((state) => ({ items: state.items.filter((c) => c.menuItem !== menuItemId) })),

  replaceItems: (items: CartItem[]) => set({ items }),
  clear: () => set({ items: [] }),
}));
