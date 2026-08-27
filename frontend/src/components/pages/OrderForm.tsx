import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { useCreateOrder, useMenu, useUpdateOrder, Order } from '../../api/queries';

interface OrderFormData {
  tableNumber: string;
}

interface Props {
  showCreate: boolean;
  setShowCreate: (v: boolean) => void;
  editingOrder?: Order | null;
  onEditDone?: () => void;
}

export default function OrderFormComponent({ showCreate, setShowCreate, editingOrder, onEditDone }: Props) {
  const { user } = useAuth();
  const { data: menu = [] } = useMenu();
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  const cart = useCartStore();
  const menuItems = menu.filter((i) => i.available);

  const [actionError, setActionError] = useState('');
  const { register, handleSubmit, reset } = useForm<OrderFormData>({
    defaultValues: { tableNumber: editingOrder?.tableNumber ? String(editingOrder.tableNumber) : '' },
  });

  const prevEditingOrder = React.useRef(editingOrder);
  useEffect(() => {
    if (editingOrder && editingOrder !== prevEditingOrder.current) {
      prevEditingOrder.current = editingOrder;
      reset({ tableNumber: editingOrder.tableNumber ? String(editingOrder.tableNumber) : '' });
      cart.replaceItems(editingOrder.items.map(i => ({
        menuItem: i.menuItem || '',
        name: i.name,
        price: i.price,
        quantity: i.quantity,
      })));
    } else if (!editingOrder && prevEditingOrder.current) {
      prevEditingOrder.current = editingOrder;
      cart.clear();
    }
  }, [editingOrder]);

  const onSubmit = async (data: OrderFormData) => {
    if (cart.items.length === 0) return;
    try {
      if (editingOrder) {
        await updateOrder.mutateAsync({
          id: editingOrder._id,
          data: {
            items: cart.items.map((c) => ({ menuItem: c.menuItem, name: c.name, price: c.price, quantity: c.quantity })),
            tableNumber: Number(data.tableNumber) || undefined,
            status: 'pending',
          },
        });
        onEditDone?.();
      } else {
        await createOrder.mutateAsync({
          items: cart.items.map((c) => ({ menuItem: c.menuItem, name: c.name, price: c.price, quantity: c.quantity })),
          tableNumber: Number(data.tableNumber) || undefined,
        });
        setShowCreate(false);
      }
      cart.clear();
      reset();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : editingOrder ? 'Failed to edit order' : 'Failed to place order');
    }
  };

  if (!showCreate && !editingOrder) return null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="form-panel">
      <h3 className="text-lg font-semibold mb-3">{editingOrder ? 'Edit Order' : 'Create Order'}</h3>
      <div className="flex flex-wrap gap-2.5 mb-4">
        {menuItems.map((item) => (
          <button key={item._id} type="button" onClick={() => cart.addItem(item)} className="px-4 py-2 bg-[#0f3460] text-white border-none rounded-md cursor-pointer hover:bg-[#16213e] transition-colors text-sm">
            {item.name} - ${item.price.toFixed(2)}
          </button>
        ))}
      </div>
      {cart.items.length > 0 && (
        <div className="bg-white p-4 rounded-md">
          <h4 className="font-semibold mb-2">Cart</h4>
          {cart.items.map((c) => (
            <div key={c.menuItem} className="flex justify-between mb-1.5 items-center">
              <span className="text-sm">{c.name} x{c.quantity} - ${(c.price * c.quantity).toFixed(2)}</span>
              <button onClick={() => cart.removeItem(c.menuItem)} className="btn-danger-xs">Remove</button>
            </div>
          ))}
          <p className="mt-3"><strong>Total: ${cart.items.reduce((s, c) => s + c.price * c.quantity, 0).toFixed(2)}</strong></p>
          <div className="flex gap-2.5 mt-3 items-center">
            <input type="number" placeholder="Table number" {...register('tableNumber')} className="p-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#e94560] w-36" />
            <button type="submit" disabled={(editingOrder ? updateOrder.isPending : createOrder.isPending)} className="btn-primary">{editingOrder ? 'Save Changes' : 'Place Order'}</button>
            <button type="button" onClick={() => { if (editingOrder && onEditDone) { onEditDone(); } else { setShowCreate(false); } cart.clear(); }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}
      {actionError && <p className="error-text mt-3">{actionError}</p>}
    </form>
  );
}
