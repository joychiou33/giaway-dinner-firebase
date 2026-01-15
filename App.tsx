
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Order, OrderItem, OrderStatus } from './types';
import CustomerView from './components/CustomerView';
import OwnerDashboard from './components/OwnerDashboard';
import { Store, ShoppingBag } from 'lucide-react';

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-[100] flex justify-around items-center h-16 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] md:max-w-md md:mx-auto md:rounded-t-2xl">
      <button 
        onClick={() => navigate('/customer')}
        className={`flex flex-col items-center gap-1 transition-colors ${path === '/customer' ? 'text-orange-500 font-bold' : 'text-slate-400'}`}
      >
        <ShoppingBag size={20} />
        <span className="text-xs">我要點餐</span>
      </button>
      <button 
        onClick={() => navigate('/owner')}
        className={`flex flex-col items-center gap-1 transition-colors ${path.startsWith('/owner') ? 'text-orange-500 font-bold' : 'text-slate-400'}`}
      >
        <Store size={20} />
        <span className="text-xs">老闆後台</span>
      </button>
    </div>
  );
};

const App: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('snack_orders');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setOrders(parsed.map((o: any) => ({ ...o, createdAt: new Date(o.createdAt) })));
      } catch (e) {
        console.error("Failed to parse orders", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('snack_orders', JSON.stringify(orders));
  }, [orders]);

  const handleAddOrder = useCallback((tableNumber: string, items: OrderItem[]) => {
    const newOrder: Order = {
      id: Math.random().toString(36).substr(2, 9),
      tableNumber,
      items,
      totalPrice: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      status: 'pending',
      createdAt: new Date(),
    };
    setOrders(prev => [...prev, newOrder]);
  }, []);

  const updateOrderStatus = useCallback((id: string, status: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  }, []);

  const clearTable = useCallback((tableNumber: string) => {
    // 改為將訂單狀態更新為 'paid' 而非刪除
    setOrders(prev => prev.map(o => 
      (o.tableNumber === tableNumber && o.status !== 'cancelled' && o.status !== 'paid') 
      ? { ...o, status: 'paid' } 
      : o
    ));
  }, []);

  return (
    <Router>
      <div className="pb-16 min-h-screen">
        <Routes>
          <Route path="/customer" element={<CustomerView onAddOrder={handleAddOrder} />} />
          <Route path="/customer/table/:tableId" element={<CustomerTableWrapper onAddOrder={handleAddOrder} />} />
          <Route path="/owner" element={<OwnerDashboard orders={orders} onUpdateStatus={updateOrderStatus} onClearTable={clearTable} onManualOrder={() => window.location.hash = '/owner/manual'} />} />
          <Route path="/owner/manual" element={<ManualOrderWrapper onAddOrder={handleAddOrder} />} />
          <Route path="/" element={<Navigate to="/customer" replace />} />
        </Routes>
        <Navigation />
      </div>
    </Router>
  );
};

const CustomerTableWrapper: React.FC<{ onAddOrder: (t: string, items: OrderItem[]) => void }> = ({ onAddOrder }) => {
  const tableId = window.location.hash.split('/').pop() || '';
  return <CustomerView onAddOrder={onAddOrder} initialTable={tableId} />;
};

const ManualOrderWrapper: React.FC<{ onAddOrder: (t: string, items: OrderItem[]) => void }> = ({ onAddOrder }) => {
  const navigate = useNavigate();
  return (
    <div className="relative pb-20">
      <CustomerView 
        onAddOrder={(t, i) => {
          onAddOrder(t, i);
          navigate('/owner');
        }} 
        isStaffMode 
      />
      <button 
        onClick={() => navigate('/owner')}
        className="fixed top-4 left-4 z-50 bg-white shadow-lg text-slate-900 p-2 rounded-full border border-slate-200 active:scale-95 transition-transform"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>
    </div>
  );
};

export default App;
