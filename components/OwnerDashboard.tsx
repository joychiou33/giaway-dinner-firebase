import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Order, OrderStatus, TableTotal, OrderItem, MenuItem, Category } from '../types';
import { TABLES } from '../constants';
import { Clock, ChefHat, CreditCard, PlusCircle, LayoutDashboard, ReceiptText, AlertCircle, History, Printer, X, BellRing, BellOff, LogOut, ShieldEllipsis, KeyRound, Check, Trash2, ShoppingCart, MapPin, Utensils, Edit, Ban, CheckCircle2, Image as ImageIcon, QrCode } from 'lucide-react';
import CustomerView from './CustomerView';

// 定義分類列表供下拉選單使用
const CATEGORIES: Category[] = ['主食', '小菜', '湯品', '飲料'];

interface OwnerDashboardProps {
  orders: Order[];
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  onClearTable: (tableNumber: string) => void;
  onDeleteOrder: (orderId: string) => void;
  onAddOrder: (tableNumber: string, items: OrderItem[]) => Promise<void>;
  onLogout: () => void;
  onChangePasscode: (newPass: string) => boolean;

  // 菜單管理相關 Props
  menuItems?: MenuItem[];
  onAddMenu: (item: Omit<MenuItem, 'id'>) => Promise<void>;
  onUpdateMenu: (id: string, updates: Partial<MenuItem>) => Promise<void>;
  onDeleteMenu: (id: string) => Promise<void>;
}

const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  orders, onUpdateStatus, onClearTable, onDeleteOrder, onAddOrder, onLogout, onChangePasscode,
  menuItems = [],
  onAddMenu, onUpdateMenu, onDeleteMenu
}) => {
  const [activeTab, setActiveTab] = React.useState<'kitchen' | 'billing' | 'manual' | 'history' | 'settings' | 'menu'>('kitchen');
  const [confirmingTable, setConfirmingTable] = useState<string | null>(null);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const [isPrintingQR, setIsPrintingQR] = useState(false);

  const [manualTable, setManualTable] = useState<string | null>(null);

  const [newPass, setNewPass] = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');
  const [passMessage, setPassMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  const [autoPrintEnabled, setAutoPrintEnabled] = useState<boolean>(() => localStorage.getItem('auto_print_enabled') === 'true');
  const autoPrintedIds = useRef<Set<string>>(new Set());

  // --- 菜單管理 State ---
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);

  const [menuForm, setMenuForm] = useState<{
    name: string;
    price: string;
    category: Category;
    description: string;
    image: string;
    available: boolean;
  }>({
    name: '',
    price: '',
    category: '主食',
    description: '',
    image: '',
    available: true
  });

  const pendingOrders = useMemo(() => orders.filter(o => o.status === 'pending').sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()), [orders]);
  const preparingOrders = useMemo(() => orders.filter(o => o.status === 'preparing'), [orders]);

  useEffect(() => {
    if (!autoPrintEnabled) return;
    const newOrders = pendingOrders.filter(o => !autoPrintedIds.current.has(o.id));

    if (newOrders.length > 0) {
      newOrders.forEach(o => autoPrintedIds.current.add(o.id));
      const latestOrder = newOrders[newOrders.length - 1];
      handlePrint(latestOrder);
    }
  }, [pendingOrders, autoPrintEnabled]);

  const activeTables = useMemo(() => {
    const tableMap: Record<string, TableTotal> = {};
    orders.filter(o => o.status === 'completed').forEach(o => {
      const tNum = o.tableNumber || '未知';
      if (!tableMap[tNum]) {
        tableMap[tNum] = { tableNumber: tNum, totalAmount: 0, orderIds: [] };
      }
      tableMap[tNum].totalAmount += o.totalPrice;
      tableMap[tNum].orderIds.push(o.id);
    });
    return Object.values(tableMap).sort((a, b) => a.tableNumber.localeCompare(b.tableNumber));
  }, [orders]);

  const totalUnpaidRevenue = useMemo(() => activeTables.reduce((acc, t) => acc + t.totalAmount, 0), [activeTables]);

  const filteredHistoryOrders = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return orders.filter(o => o.status === 'paid' && o.createdAt >= start && o.createdAt <= end).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [orders, startDate, endDate]);

  const totalFilteredRevenue = useMemo(() => filteredHistoryOrders.reduce((acc, o) => acc + o.totalPrice, 0), [filteredHistoryOrders]);

  const handlePrint = (order: Order) => {
    setIsPrintingQR(false);
    setPrintingOrder(order);
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintingOrder(null), 500);
    }, 100);
  };

  const handleUpdatePasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length !== 8) {
      setPassMessage({ text: '密碼必須為 8 位數字', type: 'error' });
      return;
    }
    if (newPass !== confirmNewPass) {
      setPassMessage({ text: '兩次輸入的密碼不一致', type: 'error' });
      return;
    }
    if (onChangePasscode(newPass)) {
      setPassMessage({ text: '密碼修改成功！', type: 'success' });
      setNewPass('');
      setConfirmNewPass('');
      setTimeout(() => setPassMessage(null), 3000);
    }
  };

  const handleOpenMenuModal = (item?: MenuItem) => {
    if (item) {
      setEditingMenuItem(item);
      setMenuForm({
        name: item.name,
        price: item.price.toString(),
        category: item.category,
        description: item.description,
        image: item.image,
        available: item.available
      });
    } else {
      setEditingMenuItem(null);
      setMenuForm({ name: '', price: '', category: '主食', description: '', image: '', available: true });
    }
    setIsMenuModalOpen(true);
  };

  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseInt(menuForm.price);
    if (!menuForm.name || isNaN(price)) return;

    const menuItemData = {
      name: menuForm.name,
      price: price,
      category: menuForm.category,
      description: menuForm.description,
      image: menuForm.image,
      available: menuForm.available
    };

    if (editingMenuItem) {
      await onUpdateMenu(editingMenuItem.id, menuItemData);
    } else {
      await onAddMenu(menuItemData);
    }
    setIsMenuModalOpen(false);
  };

  // -------------------------------------------------------------------------
  // Render Functions
  // -------------------------------------------------------------------------

  const renderMenuManagementSection = () => {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><Utensils className="text-orange-500" /> 菜單管理</h2>
            <p className="text-slate-500 text-sm">管理餐點、價格、圖片與供應狀態</p>
          </div>
          <button onClick={() => handleOpenMenuModal()} className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all">
            <PlusCircle size={18} /> 新增餐點
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {menuItems.map(item => (
            <div key={item.id} className={`bg-white rounded-xl border-2 shadow-sm flex overflow-hidden group transition-all ${item.available ? 'border-transparent' : 'border-slate-200 bg-slate-50 opacity-75'}`}>
              <div className="w-1/3 bg-slate-100 relative">
                <img
                  src={item.image || "https://placehold.co/150x150?text=No+Image"}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  onError={(e) => (e.currentTarget.src = 'https://placehold.co/150x150?text=Error')}
                />
                {!item.available && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-xs">已停售</div>}
              </div>

              <div className="w-2/3 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{item.category}</span>
                    {item.available ? <CheckCircle2 size={14} className="text-green-500" /> : <Ban size={14} className="text-slate-300" />}
                  </div>
                  <h3 className="font-black text-slate-800 leading-tight mb-1">{item.name}</h3>
                  <p className="text-xs text-slate-400 line-clamp-1">{item.description}</p>
                </div>

                <div className="flex justify-between items-end mt-3">
                  <span className="text-xl font-black text-orange-600">${item.price}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onUpdateMenu(item.id, { available: !item.available })}
                      className={`p-1.5 rounded-lg transition-colors ${item.available ? 'text-red-400 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`}
                      title={item.available ? "設為停售" : "重新上架"}
                    >
                      {item.available ? <Ban size={16} /> : <CheckCircle2 size={16} />}
                    </button>
                    <button onClick={() => handleOpenMenuModal(item)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit size={16} /></button>

                    {/* [修改] 垃圾桶按鈕：阻止冒泡，直接刪除，不跳 Confirm */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation(); // 防止觸發外層 onClick (如: 打開編輯)
                        onDeleteMenu(item.id); // 直接執行刪除
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {isMenuModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-lg">{editingMenuItem ? '編輯餐點' : '新增餐點'}</h3>
                <button onClick={() => setIsMenuModalOpen(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleSaveMenu} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1 space-y-2">
                    <div className="aspect-square rounded-xl bg-slate-100 overflow-hidden border border-slate-200 relative group flex items-center justify-center">
                      {menuForm.image ? (
                        <img
                          src={menuForm.image}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => (e.currentTarget.src = 'https://placehold.co/150x150?text=Error')}
                        />
                      ) : (
                        <ImageIcon className="text-slate-300 w-8 h-8" />
                      )}
                    </div>
                  </div>
                  <div className="col-span-2 space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">餐點名稱</label>
                      <input required type="text" value={menuForm.name} onChange={e => setMenuForm({ ...menuForm, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold outline-none focus:ring-2 focus:ring-orange-500" placeholder="例如：招牌火雞肉飯" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">價格</label>
                        <input required type="number" value={menuForm.price} onChange={e => setMenuForm({ ...menuForm, price: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold outline-none focus:ring-2 focus:ring-orange-500" placeholder="0" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">分類</label>
                        <select value={menuForm.category} onChange={e => setMenuForm({ ...menuForm, category: e.target.value as Category })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold outline-none focus:ring-2 focus:ring-orange-500">
                          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">圖片連結 (URL)</label>
                  <div className="flex items-center gap-2">
                    <ImageIcon size={16} className="text-slate-400" />
                    <input type="text" value={menuForm.image} onChange={e => setMenuForm({ ...menuForm, image: e.target.value })} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500" placeholder="https://..." />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">餐點描述</label>
                  <textarea rows={2} value={menuForm.description} onChange={e => setMenuForm({ ...menuForm, description: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500" placeholder="簡單介紹這道料理的特色..." />
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    id="available"
                    checked={menuForm.available}
                    onChange={e => setMenuForm({ ...menuForm, available: e.target.checked })}
                    className="w-5 h-5 accent-orange-500"
                  />
                  <label htmlFor="available" className="font-bold text-slate-700 cursor-pointer select-none">目前可販售 (上架中)</label>
                </div>

                <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all mt-4">
                  {editingMenuItem ? '儲存變更' : '確認新增'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderManualOrderSection = () => {
    if (!manualTable) {
      return (
        <div className="max-w-4xl mx-auto p-6 animate-in fade-in duration-300">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-blue-100 p-3 rounded-2xl text-blue-600"><MapPin size={28} /></div>
            <div>
              <h2 className="text-2xl font-black text-slate-800">櫃檯現場下單</h2>
              <p className="text-slate-500">請先點擊桌號進入點餐畫面</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {TABLES.map(table => (
              <button
                key={table}
                onClick={() => setManualTable(table)}
                className="bg-white border-2 border-slate-100 hover:border-orange-500 hover:bg-orange-50 p-6 rounded-2xl shadow-sm transition-all flex flex-col items-center gap-2 group"
              >
                <span className="text-3xl font-black text-slate-800 group-hover:text-orange-600">{table}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">點此開始</span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col animate-in slide-in-from-right-4 duration-300">
        <CustomerView
          menuItems={menuItems}
          onAddOrder={async (t, i) => {
            await onAddOrder(t, i);
            setManualTable(null);
            setActiveTab('kitchen');
          }}
          onBack={() => setManualTable(null)}
          initialTable={manualTable}
          lockTable={true}
          isStaffMode={true}
        />
      </div>
    );
  };

  const renderSettingsSection = () => (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 no-print">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-slate-100 p-2 rounded-lg text-slate-600"><ShieldEllipsis size={24} /></div>
          <div>
            <h3 className="text-lg font-black text-slate-800">管理密碼</h3>
            <p className="text-slate-500 text-xs">修改進入此管理後台的 8 位數密碼</p>
          </div>
        </div>
        <form onSubmit={handleUpdatePasscode} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><KeyRound size={12} /> 新密碼</label>
            <input type="password" inputMode="numeric" maxLength={8} value={newPass} onChange={(e) => setNewPass(e.target.value.replace(/\D/g, ''))} placeholder="輸入 8 位數字" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><KeyRound size={12} /> 確認新密碼</label>
            <input type="password" inputMode="numeric" maxLength={8} value={confirmNewPass} onChange={(e) => setConfirmNewPass(e.target.value.replace(/\D/g, ''))} placeholder="再次輸入以確認" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
          </div>
          <div className="md:col-span-2 flex flex-col sm:flex-row items-center gap-4">
            <button type="submit" className="w-full sm:w-auto bg-slate-900 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all active:scale-95">更新密碼</button>
            {passMessage && <p className={`text-xs font-bold flex items-center gap-1 ${passMessage.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{passMessage.type === 'success' && <Check size={14} />} {passMessage.text}</p>}
          </div>
        </form>
      </section>

      <section className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center no-print">
          <div>
            <h2 className="text-xl font-black text-slate-800">桌碼管理</h2>
            <p className="text-slate-500 text-sm">列印桌號專屬點餐 QR Code</p>
          </div>
          <button
            onClick={() => {
              setIsPrintingQR(true);
              setPrintingOrder(null);
              setTimeout(() => {
                window.print();
                setTimeout(() => setIsPrintingQR(false), 500);
              }, 100);
            }}
            className="bg-orange-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all"
          >
            <Printer size={18} /> 列印所有桌碼
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {TABLES.map(table => {
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}${window.location.pathname}#/customer/table/${table}`)}`;
            return (
              <div key={table} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                <img src={qrUrl} alt={`QR Table ${table}`} className="w-full aspect-square mb-3" />
                <p className="text-xs font-bold text-slate-600 mb-1">{table === '外帶' ? '門口外帶區' : `第 ${table} 桌`}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-100">
      <header className="bg-slate-900 text-white p-4 shadow-xl flex flex-wrap gap-4 justify-between items-center shrink-0 no-print">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 p-2 rounded-lg"><LayoutDashboard className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">店主管理後台</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Local Database Mode</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setAutoPrintEnabled(!autoPrintEnabled)} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${autoPrintEnabled ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
            {autoPrintEnabled ? <BellRing size={14} /> : <BellOff size={14} />} 自動印單: {autoPrintEnabled ? 'ON' : 'OFF'}
          </button>
          <button onClick={() => { setManualTable(null); setActiveTab('manual'); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition-all ${activeTab === 'manual' ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'}`}><PlusCircle size={18} /> 櫃檯點餐</button>
          <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-400 transition-colors"><LogOut size={20} /></button>
        </div>
      </header>

      {!manualTable && (
        <nav className="flex bg-white border-b shadow-sm shrink-0 no-print overflow-x-auto">
          <button onClick={() => setActiveTab('kitchen')} className={`flex-1 min-w-[80px] py-3 font-bold transition-all border-b-4 ${activeTab === 'kitchen' ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-transparent text-slate-400'}`}><ChefHat size={18} className="mx-auto" /><span className="text-[10px] block">製作進度</span></button>
          <button onClick={() => setActiveTab('billing')} className={`flex-1 min-w-[80px] py-3 font-bold transition-all border-b-4 ${activeTab === 'billing' ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-transparent text-slate-400'}`}><ReceiptText size={18} className="mx-auto" /><span className="text-[10px] block">結帳清單</span></button>
          <button onClick={() => setActiveTab('menu')} className={`flex-1 min-w-[80px] py-3 font-bold transition-all border-b-4 ${activeTab === 'menu' ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-transparent text-slate-400'}`}><Utensils size={18} className="mx-auto" /><span className="text-[10px] block">菜單管理</span></button>

          <button onClick={() => setActiveTab('manual')} className={`flex-1 min-w-[80px] py-3 font-bold transition-all border-b-4 ${activeTab === 'manual' ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-transparent text-slate-400'}`}><ShoppingCart size={18} className="mx-auto" /><span className="text-[10px] block">代客下單</span></button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 min-w-[80px] py-3 font-bold transition-all border-b-4 ${activeTab === 'history' ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-transparent text-slate-400'}`}><History size={18} className="mx-auto" /><span className="text-[10px] block">營業紀錄</span></button>
          <button onClick={() => setActiveTab('settings')} className={`flex-1 min-w-[80px] py-3 font-bold transition-all border-b-4 ${activeTab === 'settings' ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-transparent text-slate-400'}`}><QrCode size={18} className="mx-auto" /><span className="text-[10px] block">設置</span></button>
        </nav>
      )}

      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 no-print">
        {activeTab === 'kitchen' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-7xl mx-auto">
            <div className="space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-slate-700"><Clock className="text-orange-500" /> 待處理 ({pendingOrders.length})</h2>
              <div className="space-y-3">
                {pendingOrders.map(order => (
                  <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border-l-8 border-orange-500 animate-in slide-in-from-left-2">
                    <div className="flex justify-between mb-3">
                      <span className="text-lg font-black bg-slate-100 px-3 py-1 rounded-md">{order.tableNumber}</span>
                      <button onClick={() => handlePrint(order)} className="text-slate-400 hover:text-blue-500 p-1"><Printer size={16} /></button>
                    </div>
                    <ul className="space-y-1 mb-4">{order.items.map((item, idx) => (<li key={idx} className="flex justify-between text-slate-700"><span>{item.name}</span><span className="font-bold">x {item.quantity}</span></li>))}</ul>
                    <div className="flex gap-2">
                      <button onClick={() => onUpdateStatus(order.id, 'preparing')} className="flex-1 bg-blue-500 text-white py-2 rounded-lg font-bold text-sm active:scale-95 transition-transform">開始製作</button>
                      <button onClick={(e) => { e.stopPropagation(); onDeleteOrder(order.id); }} className="p-2 text-slate-300 hover:text-red-500 bg-slate-50 rounded-lg active:scale-90 transition-all"><Trash2 size={20} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-slate-700"><ChefHat className="text-blue-500" /> 製作中 ({preparingOrders.length})</h2>
              <div className="space-y-3">
                {preparingOrders.map(order => (
                  <div key={order.id} className="bg-blue-50 p-4 rounded-xl shadow-sm border border-blue-200 animate-in slide-in-from-right-2">
                    <span className="text-lg font-black bg-white px-3 py-1 rounded-md mb-3 block w-fit">{order.tableNumber}</span>
                    <ul className="space-y-1 mb-4">{order.items.map((item, idx) => (<li key={idx} className="flex justify-between text-blue-900"><span>{item.name}</span><span className="font-bold">x {item.quantity}</span></li>))}</ul>
                    <div className="flex gap-2">
                      <button onClick={() => onUpdateStatus(order.id, 'completed')} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold active:scale-95 transition-transform">完成出餐</button>
                      <button onClick={(e) => { e.stopPropagation(); onDeleteOrder(order.id); }} className="p-3 text-slate-300 hover:text-red-500 bg-white rounded-lg active:scale-90 transition-all"><Trash2 size={20} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm flex items-center justify-between border border-slate-200">
              <div><p className="text-slate-500 text-sm">待收總額</p><p className="text-4xl font-black text-slate-900 font-mono">${totalUnpaidRevenue}</p></div>
              <div className="bg-orange-100 p-4 rounded-2xl"><CreditCard className="w-8 h-8 text-orange-600" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeTables.map(table => {
                const tableItems = orders.filter(o => table.orderIds.includes(o.id)).flatMap(o => o.items).reduce((acc, curr) => {
                  acc[curr.name] = (acc[curr.name] || 0) + curr.quantity;
                  return acc;
                }, {} as Record<string, number>);
                return (
                  <div key={table.tableNumber} className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col">
                    <div className="flex justify-between items-start mb-4"><span className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold text-lg">{table.tableNumber}</span><p className="text-2xl font-black text-orange-600 font-mono">${table.totalAmount}</p></div>
                    <div className="flex-1 bg-slate-50 rounded-lg p-3 mb-4">
                      <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase border-b pb-1">點餐項目</p>
                      <div className="text-xs text-slate-600 space-y-1.5">
                        {Object.entries(tableItems).map(([name, qty]) => (<div key={name} className="flex justify-between border-b border-slate-200 border-dashed pb-1"><span>{name}</span><span className="font-bold text-slate-900">x{qty}</span></div>))}
                      </div>
                    </div>
                    {confirmingTable === table.tableNumber ? (
                      <div className="flex gap-2"><button onClick={() => { onClearTable(table.tableNumber); setConfirmingTable(null); }} className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-bold">確認結帳</button><button onClick={() => setConfirmingTable(null)} className="bg-slate-200 text-slate-600 px-4 py-2.5 rounded-lg">取消</button></div>
                    ) : (
                      <button onClick={() => setConfirmingTable(table.tableNumber)} className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-bold">清桌 / 結帳</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 使用函式呼叫，避免組件重新掛載 */}
        {activeTab === 'menu' && renderMenuManagementSection()}

        {activeTab === 'manual' && renderManualOrderSection()}

        {activeTab === 'history' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[150px] space-y-1"><label className="text-xs font-bold text-slate-500">選擇日期</label><input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setEndDate(e.target.value); }} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div><p className="text-slate-500 text-xs">合計營收</p><span className="text-3xl font-black text-green-600">${totalFilteredRevenue}</span></div>
                <div><p className="text-slate-500 text-xs">完成訂單</p><p className="text-3xl font-black text-slate-900">{filteredHistoryOrders.length}</p></div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
              {filteredHistoryOrders.length === 0 ? (
                <p className="p-8 text-center text-slate-400 font-medium">尚無相關歷史紀錄</p>
              ) : filteredHistoryOrders.map(order => (
                <div key={order.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center font-black text-sm">{order.tableNumber}</div>
                    <div className="overflow-hidden"><p className="font-black text-slate-900">${order.totalPrice}</p><p className="text-xs text-slate-500 truncate">{order.items.map(i => `${i.name}x${i.quantity}`).join(', ')}</p></div>
                  </div>
                  <button onClick={() => setSelectedOrder(order)} className="text-slate-300 hover:text-slate-900 p-2"><AlertCircle size={20} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* [修正] 改為呼叫 renderSettingsSection 函式，而非使用 JSX 組件 */}
        {activeTab === 'settings' && renderSettingsSection()}
      </main>

      <OrderDetailsModal />

      {/* 萬用列印區塊：支援「訂單兩聯」與「桌碼 QR」 */}
      <div className="print-only text-black bg-white w-full mx-auto">
        {printingOrder && !isPrintingQR && (
          <div className="max-w-[80mm] mx-auto p-2 text-sm font-mono">
            {/* 第一聯：顧客/櫃台聯 */}
            <div className="pb-4">
              <div className="text-center mb-2 border-b-2 border-black pb-2">
                <h2 className="text-xl font-bold">訂單確認聯</h2>
                <p className="text-[10px] mt-1">{printingOrder.createdAt.toLocaleString()}</p>
                <p className="text-[10px]">單號: {printingOrder.id.slice(-6)}</p>
              </div>

              <div className="flex justify-between items-end mb-2">
                <span className="text-lg font-bold">桌號:</span>
                <span className="text-4xl font-black">{printingOrder.tableNumber}</span>
              </div>

              <div className="border-t border-b border-dashed border-black py-2 mb-2 space-y-1">
                {printingOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="font-bold text-base">{item.name}</span>
                    <span className="font-bold text-base">x {item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between font-bold text-xl mt-2">
                <span>總計:</span>
                <span>${printingOrder.totalPrice}</span>
              </div>
            </div>

            {/* 剪裁線 */}
            <div className="w-full border-b-4 border-dashed border-black my-6 relative">
              <span className="absolute left-1/2 -top-3 -translate-x-1/2 bg-white px-2 text-[10px] text-slate-500">剪裁線</span>
            </div>

            {/* 第二聯：廚房備餐聯 */}
            <div className="pt-2">
              <div className="text-center mb-2 border-b border-black pb-1">
                <h2 className="text-xl font-black">廚房製作單</h2>
              </div>
              <div className="flex justify-between items-center mb-4 bg-black text-white p-2 rounded-sm">
                <span className="text-xl font-bold">桌號</span>
                <span className="text-4xl font-black">{printingOrder.tableNumber}</span>
              </div>
              <div className="space-y-4">
                {printingOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center border-b border-slate-300 pb-2">
                    <span className="font-black text-2xl w-2/3 leading-tight">{item.name}</span>
                    <span className="font-black text-3xl">x{item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {isPrintingQR && (
          <div className="w-full p-8">
            <h1 className="text-2xl font-bold text-center mb-6 border-b pb-4">桌號 QR Code 配置圖</h1>
            <div className="grid grid-cols-3 gap-8">
              {TABLES.map(table => {
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${window.location.origin}${window.location.pathname}#/customer/table/${table}`)}`;
                return (
                  <div key={table} className="border-2 border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center aspect-[3/4]">
                    <img src={qrUrl} alt={`QR ${table}`} className="w-full mb-4" />
                    <div className="text-4xl font-black">{table}</div>
                    <div className="text-sm text-slate-500 mt-2">掃描點餐</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );

  function OrderDetailsModal() {
    if (!selectedOrder) return null;
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
        <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center bg-slate-50"><h3 className="font-bold">訂單詳情</h3><button onClick={() => setSelectedOrder(null)}><X size={20} /></button></div>
          <div className="p-6">
            <div className="text-3xl font-black bg-slate-900 text-white px-4 py-1 rounded-xl w-fit mb-6">桌號 {selectedOrder.tableNumber}</div>
            <div className="space-y-3 mb-6">{selectedOrder.items.map((item, idx) => (<div key={idx} className="flex justify-between border-b border-dashed pb-2"><span>{item.name} x{item.quantity}</span><span className="font-bold">${item.price * item.quantity}</span></div>))}</div>
            <div className="flex justify-between pt-2"><span className="font-bold text-slate-500">總金額</span><span className="text-2xl font-black text-orange-600">${selectedOrder.totalPrice}</span></div>
          </div>
          <div className="p-4 bg-slate-50 flex gap-2"><button onClick={() => handlePrint(selectedOrder)} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><Printer size={18} /> 列印</button><button onClick={() => setSelectedOrder(null)} className="flex-1 bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-bold">關閉</button></div>
        </div>
      </div>
    );
  }
};

export default OwnerDashboard;