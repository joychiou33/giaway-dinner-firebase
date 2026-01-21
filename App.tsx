
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Order, OrderItem, OrderStatus } from './types';
import CustomerView from './components/CustomerView';
import OwnerDashboard from './components/OwnerDashboard';
import OwnerLogin from './components/OwnerLogin';
import { Store, ShoppingBag, Lock } from 'lucide-react';
// 使用 dbService 統一管理 Firebase 操作
import { dbService } from './services/dbService';

const Navigation: React.FC<{ isOwner: boolean }> = ({ isOwner }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-[100] flex justify-around items-center h-16 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] md:max-w-md md:mx-auto md:rounded-t-2xl no-print">
      <button
        onClick={() => navigate('/customer')}
        className={`flex-1 flex flex-col items-center gap-1 transition-colors ${path.startsWith('/customer') ? 'text-orange-500 font-bold' : 'text-slate-400'}`}
      >
        <ShoppingBag size={20} />
        <span className="text-[10px] font-bold">我要點餐</span>
      </button>

      {isOwner ? (
        <button
          onClick={() => navigate('/owner')}
          className={`flex-1 flex flex-col items-center gap-1 transition-colors ${path.startsWith('/owner') ? 'text-orange-500 font-bold' : 'text-slate-400'}`}
        >
          <Store size={20} />
          <span className="text-[10px] font-bold">老闆後台</span>
        </button>
      ) : (
        <button
          onClick={() => navigate('/login')}
          className="flex-1 flex flex-col items-center gap-1 text-slate-300 hover:text-slate-400"
        >
          <Lock size={18} />
          <span className="text-[10px]">管理登入</span>
        </button>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isOwner, setIsOwner] = useState<boolean>(() => sessionStorage.getItem('is_owner') === 'true');

  const [ownerPasscode, setOwnerPasscode] = useState<string>(() => {
    const saved = localStorage.getItem('owner_passcode');
    return saved || '88888888';
  });

  // 使用 Firebase 即時監聽訂單變動
  useEffect(() => {
    const unsubscribe = dbService.subscribeToOrders((firebaseOrders) => {
      setOrders(firebaseOrders);
      // 同步到 localStorage 作為備份
      localStorage.setItem('giaway_orders', JSON.stringify(firebaseOrders));
    });

    // 清理監聽器
    return () => unsubscribe();
  }, []);

  const handleLogin = (pass: string) => {
    if (pass === ownerPasscode) {
      setIsOwner(true);
      sessionStorage.setItem('is_owner', 'true');
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setIsOwner(false);
    sessionStorage.removeItem('is_owner');
  };

  const handleChangePasscode = (newPass: string) => {
    if (newPass.length === 8 && /^\d+$/.test(newPass)) {
      setOwnerPasscode(newPass);
      localStorage.setItem('owner_passcode', newPass);
      return true;
    }
    return false;
  };

  const handleAddOrder = useCallback(async (tableNumber: string, items: OrderItem[]) => {
    try {
      await dbService.createOrder(tableNumber, items);
      console.log('訂單已建立');
    } catch (error) {
      console.error('建立訂單失敗:', error);
      alert('建立訂單失敗，請重試');
    }
  }, []);

  const updateOrderStatus = useCallback(async (id: string, status: OrderStatus) => {
    try {
      await dbService.updateOrderStatus(id, status);
      console.log('訂單狀態已更新:', id, status);
    } catch (error) {
      console.error('更新訂單狀態失敗:', error);
      alert('更新訂單狀態失敗，請重試');
    }
  }, []);

  const clearTable = useCallback(async (tableNumber: string) => {
    try {
      // 找出該桌所有未結帳的訂單
      const tablePendingOrders = orders.filter(o =>
        o.tableNumber === tableNumber &&
        o.status !== 'cancelled' &&
        o.status !== 'paid'
      );

      const orderIds = tablePendingOrders.map(o => o.id);
      await dbService.clearTable(tableNumber, orderIds);

      console.log(`桌號 ${tableNumber} 已結帳，共 ${orderIds.length} 筆訂單`);
    } catch (error) {
      console.error('結帳失敗:', error);
      alert('結帳失敗，請重試');
    }
  }, [orders]);

  const deleteOrder = useCallback(async (orderId: string) => {
    console.log('App.deleteOrder 被呼叫，訂單 ID:', orderId);
    try {
      await dbService.deleteOrder(orderId);
      console.log('✅ 訂單已刪除:', orderId);
    } catch (error) {
      console.error('❌ 刪除訂單失敗:', error);
      alert('刪除訂單失敗，請重試');
    }
  }, []);

  return (
    <Router>
      <div className="pb-16 min-h-screen">
        <Routes>
          <Route path="/customer" element={<CustomerView onAddOrder={handleAddOrder} />} />
          <Route path="/customer/table/:tableId" element={<CustomerTableWrapper onAddOrder={handleAddOrder} />} />
          <Route
            path="/owner/*"
            element={isOwner ? (
              <OwnerDashboard
                orders={orders}
                onUpdateStatus={updateOrderStatus}
                onClearTable={clearTable}
                onDeleteOrder={deleteOrder}
                onAddOrder={handleAddOrder}
                onLogout={handleLogout}
                onChangePasscode={handleChangePasscode}
              />
            ) : <Navigate to="/login" replace />}
          />
          <Route path="/login" element={<OwnerLogin onLogin={handleLogin} />} />
          <Route path="/" element={<Navigate to="/customer" replace />} />
        </Routes>
        <Navigation isOwner={isOwner} />
      </div>
    </Router>
  );
};

const CustomerTableWrapper: React.FC<{ onAddOrder: (t: string, items: OrderItem[]) => Promise<void> }> = ({ onAddOrder }) => {
  const { tableId } = useParams();
  return <CustomerView onAddOrder={onAddOrder} initialTable={tableId || ''} lockTable />;
};

export default App;
