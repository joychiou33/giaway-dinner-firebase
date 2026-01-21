import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Order, OrderItem, OrderStatus, MenuItem } from './types';
import { INITIAL_MENU } from './constants';
import CustomerView from './components/CustomerView';
import OwnerDashboard from './components/OwnerDashboard';
import OwnerLogin from './components/OwnerLogin';
import { Store, ShoppingBag, Lock } from 'lucide-react';
import { dbService } from './services/dbService';
// [修正] 補上 setDoc
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, writeBatch, doc, setDoc } from 'firebase/firestore';

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
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU);

  const [ownerPasscode, setOwnerPasscode] = useState<string>(() => {
    const saved = localStorage.getItem('owner_passcode');
    return saved || '88888888';
  });

  useEffect(() => {
    const unsubscribe = dbService.subscribeToOrders((firebaseOrders) => {
      setOrders(firebaseOrders);
      localStorage.setItem('giaway_orders', JSON.stringify(firebaseOrders));
    });
    return () => unsubscribe();
  }, []);

  // 菜單讀取與初始化
  useEffect(() => {
    const fetchMenu = async () => {
      const db = getFirestore();
      try {
        const querySnapshot = await getDocs(collection(db, "menuItems"));

        if (querySnapshot.empty) {
          console.log("⚠️ 資料庫是空的，開始寫入初始菜單...");
          const batch = writeBatch(db);
          const newItems: MenuItem[] = [];

          INITIAL_MENU.forEach((item) => {
            const docRef = doc(collection(db, "menuItems"));
            // 這裡已經有正確寫入 ID，保持不變，但補上 updatedAt
            const itemWithFirebaseId = {
              ...item,
              id: docRef.id,
              available: true,
              updatedAt: new Date() // [新增] 初始資料也加上時間
            };
            batch.set(docRef, itemWithFirebaseId);
            newItems.push(itemWithFirebaseId);
          });

          await batch.commit();
          console.log("✅ 初始菜單寫入完成！");
          setMenuItems(newItems);
        } else {
          console.log("🔄 菜單資料庫已有資料，載入中...");
          const items = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              // 如果舊資料沒有 available，預設為 true
              available: data.available ?? true
            } as MenuItem;
          });
          setMenuItems(items);
        }
      } catch (error) {
        console.error("讀取菜單失敗:", error);
      }
    };

    fetchMenu();
  }, []);

  // --------------------------------------------------------
  // [修正重點] 新增菜單 - 明確寫入 id 和 updatedAt
  // --------------------------------------------------------
  const handleAddMenu = async (item: Omit<MenuItem, 'id'>) => {
    const db = getFirestore();
    try {
      // 1. 先產生一個新的 Document Reference (為了拿到自動產生的 ID)
      const newDocRef = doc(collection(db, "menuItems"));

      // 2. 準備要寫入的資料，明確包含 id 和 updatedAt
      const newItemData: MenuItem = {
        ...item,
        id: newDocRef.id, // [關鍵] 把 ID 寫進資料欄位
        updatedAt: new Date() // [關鍵] 加入目前時間
      };

      // 3. 使用 setDoc 寫入指定 ID 的位置
      await setDoc(newDocRef, newItemData);

      // 4. 更新本地 State
      setMenuItems(prev => [...prev, newItemData]);
      console.log("新增成功，ID:", newDocRef.id);
    } catch (e) {
      console.error("新增失敗:", e);
      alert("新增失敗，請檢查網路");
    }
  };

  // --------------------------------------------------------
  // [修正重點] 更新菜單 - 補上 updatedAt
  // --------------------------------------------------------
  const handleUpdateMenu = async (id: string, updates: Partial<MenuItem>) => {
    const db = getFirestore();
    try {
      const menuRef = doc(db, "menuItems", id);

      // 準備更新資料，自動補上 updatedAt
      const updatesWithTimestamp = {
        ...updates,
        updatedAt: new Date()
      };

      await updateDoc(menuRef, updatesWithTimestamp);

      setMenuItems(prev => prev.map(item => item.id === id ? { ...item, ...updatesWithTimestamp } : item));
    } catch (e) {
      console.error("更新失敗:", e);
      alert("更新失敗");
    }
  };

  const handleDeleteMenu = async (id: string) => {
    const db = getFirestore();
    try {
      await deleteDoc(doc(db, "menuItems", id));
      setMenuItems(prev => prev.filter(item => item.id !== id));
    } catch (e) {
      console.error("刪除失敗:", e);
      alert("刪除失敗");
    }
  };

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
          <Route
            path="/customer"
            element={
              <CustomerView
                onAddOrder={handleAddOrder}
                menuItems={menuItems}
              />
            }
          />
          <Route
            path="/customer/table/:tableId"
            element={
              <CustomerTableWrapper
                onAddOrder={handleAddOrder}
                menuItems={menuItems}
              />
            }
          />
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
                menuItems={menuItems}
                onAddMenu={handleAddMenu}
                onUpdateMenu={handleUpdateMenu}
                onDeleteMenu={handleDeleteMenu}
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

const CustomerTableWrapper: React.FC<{
  onAddOrder: (t: string, items: OrderItem[]) => Promise<void>;
  menuItems: MenuItem[];
}> = ({ onAddOrder, menuItems }) => {
  const { tableId } = useParams();
  return <CustomerView onAddOrder={onAddOrder} initialTable={tableId || ''} lockTable menuItems={menuItems} />;
};

export default App;