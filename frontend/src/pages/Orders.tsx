import React, { useState } from 'react';
import { useAuth } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import {
  useCreateOrder,
  useMenu,
  useOrders,
  useUpdateOrderStatus,
} from '../api/queries';

const statusColorMap: Record<string, string> = {
  pending: 'bg-amber-500',
  preparing: 'bg-blue-500',
  completed: 'bg-green-600',
  cancelled: 'bg-red-500',
};

function Orders() {
  const { user } = useAuth();
  const { data: orders = [], error: ordersError } = useOrders();
  const { data: menu = [] } = useMenu();
  const createOrder = useCreateOrder();
  const updateStatus = useUpdateOrderStatus();
  const cart = useCartStore();
  const menuItems = menu.filter((i) => i.available);

  const [tableNumber, setTableNumber] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [actionError, setActionError] = useState('');
  const error = ordersError instanceof Error ? ordersError.message : actionError;

  const handleCreateOrder = async () => {
    if (cart.items.length === 0) return;
    try {
      await createOrder.mutateAsync({
        items: cart.items.map((c) => ({ menuItem: c.menuItem, quantity: c.quantity })),
        tableNumber: Number(tableNumber) || undefined,
      });
      cart.clear();
      setTableNumber('');
      setShowCreate(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to place order');
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await updateStatus.mutateAsync({ id, status });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update order status');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Orders</h2>
        {user?.role !== 'customer' && (
          <button onClick={() => setShowCreate(!showCreate)} className="px-5 py-2.5 bg-[#16a085] text-white border-none rounded-md cursor-pointer hover:bg-[#138d75] transition-colors">
            {showCreate ? 'Cancel' : '+ New Order'}
          </button>
        )}
      </div>

      {showCreate && (
        <div className="bg-gray-100 p-5 rounded-lg mb-5 mt-4">
          <h3 className="text-lg font-semibold mb-3">Create Order</h3>
          <div className="flex flex-wrap gap-2.5 mb-4">
            {menuItems.map((item) => (
              <button key={item._id} onClick={() => cart.addItem(item)} className="px-4 py-2 bg-[#0f3460] text-white border-none rounded-md cursor-pointer hover:bg-[#16213e] transition-colors text-sm">
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
                  <button onClick={() => cart.removeItem(c.menuItem)} className="bg-red-500 text-white border-none rounded px-2 py-1 cursor-pointer hover:bg-red-600 transition-colors text-xs">Remove</button>
                </div>
              ))}
              <p className="mt-3"><strong>Total: ${cart.items.reduce((s, c) => s + c.price * c.quantity, 0).toFixed(2)}</strong></p>
              <div className="flex gap-2.5 mt-3 items-center">
                <input type="number" placeholder="Table number" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} className="p-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#e94560] w-36" />
                <button onClick={handleCreateOrder} disabled={createOrder.isPending} className="px-6 py-2.5 bg-[#e94560] text-white border-none rounded-md cursor-pointer hover:bg-[#d63d54] transition-colors disabled:opacity-50">Place Order</button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-red-600 mt-3">{error}</p>}
      {orders.map((order) => (
        <div key={order._id} className="border border-gray-200 rounded-lg p-4 mb-4 bg-white shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between">
            <div>
              <strong>Order #{order._id.slice(-6).toUpperCase()}</strong>
              {order.tableNumber && <span> | Table {order.tableNumber}</span>}
              <p className="text-gray-500 text-sm">{new Date(order.createdAt).toLocaleString()}</p>
              {order.user && user?.role !== 'customer' && (
                <p className="text-gray-400 text-xs">By: {order.user.name} ({order.user.email})</p>
              )}
              {order.items.map((item, i) => (
                <p key={i} className="text-sm mt-1">{item.name} x{item.quantity} - ${(item.price * item.quantity).toFixed(2)}</p>
              ))}
              <p className="mt-2"><strong>Total: ${order.totalAmount.toFixed(2)}</strong></p>
            </div>
            <div className="text-right">
              <span className={`${statusColorMap[order.status] || 'bg-gray-500'} text-white px-3 py-1 rounded-full inline-block mb-2.5 text-sm capitalize`}>
                {order.status}
              </span>
              {user?.role !== 'customer' && order.status !== 'completed' && order.status !== 'cancelled' && (
                <div className="flex flex-col gap-1.5 items-end">
                  {order.status === 'pending' && <button onClick={() => handleUpdateStatus(order._id, 'preparing')} className="px-3 py-1.5 bg-blue-500 text-white border-none rounded cursor-pointer hover:bg-blue-600 transition-colors text-xs">Start Preparing</button>}
                  {order.status === 'preparing' && <button onClick={() => handleUpdateStatus(order._id, 'completed')} className="px-3 py-1.5 bg-blue-500 text-white border-none rounded cursor-pointer hover:bg-blue-600 transition-colors text-xs">Mark Completed</button>}
                  <button onClick={() => handleUpdateStatus(order._id, 'cancelled')} className="px-3 py-1.5 bg-red-500 text-white border-none rounded cursor-pointer hover:bg-red-600 transition-colors text-xs">Cancel</button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Orders;
