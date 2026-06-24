import React, { useEffect, useState } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

interface MenuItem {
  _id: string;
  name: string;
  price: number;
  available: boolean;
}

interface CartItem {
  menuItem: string;
  name: string;
  price: number;
  quantity: number;
}

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

interface OrderUser {
  _id: string;
  name: string;
  email: string;
}

interface Order {
  _id: string;
  user?: OrderUser;
  items: OrderItem[];
  totalAmount: number;
  status: string;
  tableNumber?: number;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  pending: '#f39c12', preparing: '#3498db', completed: '#27ae60', cancelled: '#e74c3c',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: 10, marginBottom: 10, borderRadius: 5, border: '1px solid #ccc', fontSize: '1rem',
  boxSizing: 'border-box',
};

const submitStyle: React.CSSProperties = {
  padding: '10px 25px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer',
};

const addBtnStyle: React.CSSProperties = {
  padding: '10px 20px', background: '#16a085', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer',
};

const menuBtnStyle: React.CSSProperties = {
  padding: '8px 16px', background: '#0f3460', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer',
};

const actionBtnStyle: React.CSSProperties = {
  padding: '5px 12px', background: '#3498db', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer',
  marginLeft: 5,
};

function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumber] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetchOrders();
    if (user?.role !== 'customer') fetchMenu();
  }, []);

  const fetchOrders = async () => {
    const { data } = await API.get<Order[]>('/orders');
    setOrders(data);
  };

  const fetchMenu = async () => {
    const { data } = await API.get<MenuItem[]>('/menu');
    setMenuItems(data.filter((i) => i.available));
  };

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem === item._id);
      if (existing) {
        return prev.map((c) => c.menuItem === item._id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { menuItem: item._id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((c) => c.menuItem !== id));
  };

  const handleCreateOrder = async () => {
    if (cart.length === 0) return;
    await API.post('/orders', { items: cart, tableNumber: Number(tableNumber) || undefined });
    setCart([]);
    setTableNumber('');
    setShowCreate(false);
    fetchOrders();
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    await API.put(`/orders/${id}/status`, { status });
    fetchOrders();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Orders</h2>
        {user?.role !== 'customer' && (
          <button onClick={() => setShowCreate(!showCreate)} style={addBtnStyle}>
            {showCreate ? 'Cancel' : '+ New Order'}
          </button>
        )}
      </div>

      {showCreate && (
        <div style={{ background: '#f5f5f5', padding: 20, borderRadius: 8, marginBottom: 20 }}>
          <h3>Create Order</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 15 }}>
            {menuItems.map((item) => (
              <button key={item._id} onClick={() => addToCart(item)} style={menuBtnStyle}>
                {item.name} - ${item.price.toFixed(2)}
              </button>
            ))}
          </div>

          {cart.length > 0 && (
            <div>
              <h4>Cart</h4>
              {cart.map((c) => (
                <div key={c.menuItem} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span>{c.name} x{c.quantity} - ${(c.price * c.quantity).toFixed(2)}</span>
                  <button onClick={() => removeFromCart(c.menuItem)} style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer' }}>Remove</button>
                </div>
              ))}
              <p><strong>Total: ${cart.reduce((s, c) => s + c.price * c.quantity, 0).toFixed(2)}</strong></p>
              <input type="number" placeholder="Table number" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} style={{ padding: 8, marginRight: 10, borderRadius: 4, border: '1px solid #ccc' }} />
              <button onClick={handleCreateOrder} style={submitStyle}>Place Order</button>
            </div>
          )}
        </div>
      )}

      {orders.map((order) => (
        <div key={order._id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 15, marginBottom: 15 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <strong>Order #{order._id.slice(-6).toUpperCase()}</strong>
              {order.tableNumber && <span> | Table {order.tableNumber}</span>}
              <p style={{ color: '#666', fontSize: '0.9rem' }}>{new Date(order.createdAt).toLocaleString()}</p>
              {order.user && user?.role !== 'customer' && (
                <p style={{ color: '#888', fontSize: '0.85rem' }}>By: {order.user.name} ({order.user.email})</p>
              )}
              {order.items.map((item, i) => (
                <p key={i}>{item.name} x{item.quantity} - ${(item.price * item.quantity).toFixed(2)}</p>
              ))}
              <p><strong>Total: ${order.totalAmount.toFixed(2)}</strong></p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{
                background: statusColors[order.status], color: '#fff', padding: '4px 12px', borderRadius: 12,
                display: 'inline-block', marginBottom: 10,
              }}>
                {order.status}
              </span>
              {user?.role !== 'customer' && order.status !== 'completed' && order.status !== 'cancelled' && (
                <div>
                  {order.status === 'pending' && <button onClick={() => handleUpdateStatus(order._id, 'preparing')} style={actionBtnStyle}>Start Preparing</button>}
                  {order.status === 'preparing' && <button onClick={() => handleUpdateStatus(order._id, 'completed')} style={actionBtnStyle}>Mark Completed</button>}
                  <button onClick={() => handleUpdateStatus(order._id, 'cancelled')} style={{ ...actionBtnStyle, background: '#e74c3c' }}>Cancel</button>
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
