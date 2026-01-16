
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Order, OrderStatus, TableTotal, OrderItem } from '../types';
import { TABLES } from '../constants';
import { Clock, ChefHat, CreditCard, XCircle, PlusCircle, LayoutDashboard, ReceiptText, AlertCircle, History, Printer, X, Settings2, BellRing, BellOff, HelpCircle, FileDown, Calendar, QrCode, LogOut, ShieldEllipsis, KeyRound, Check, Trash2, ShoppingCart, Cloud, CloudOff } from 'lucide-react';
import CustomerView from './CustomerView';

interface OwnerDashboardProps {
  orders: Order[];
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  onClearTable: (tableNumber: string) => void;
  onAddOrder: (tableNumber: string, items: OrderItem[]) => void;
  onLogout: () => void;
  onChangePasscode: (newPass: string) => boolean;
  isCloudEnabled?: boolean;
}

const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ orders, onUpdateStatus, onClearTable, onAddOrder, onLogout, onChangePasscode, isCloudEnabled = false }) => {
  const [activeTab, setActiveTab] = React.useState<'kitchen' | 'billing' | 'manual' | 'history' | 'settings'>('kitchen');
  const [confirmingTable, setConfirmingTable] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showPrintHint, setShowPrintHint] = useState(false);
  
  const [newPass, setNewPass] = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');
  const [passMessage, setPassMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  const [autoPrintEnabled, setAutoPrintEnabled] = useState<boolean>(() => localStorage.getItem('auto_print_enabled') === 'true');
  const autoPrintedIds = useRef<Set<string>>(new Set());

  const pendingOrders = useMemo(() => orders.filter(o => o.status === 'pending').sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()), [orders]);
  const preparingOrders = useMemo(() => orders.filter(o => o.status === 'preparing'), [orders]);
  
  const activeTables = useMemo(() => {
    const tableMap: Record<string, TableTotal> = {};
    orders.filter(o => o.status !== 'cancelled' && o.status !== 'paid').forEach(o => {
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
    setSelectedOrder(order);
    setTimeout(() => window.print(), 150);
  };

  const handleClearTable = (tableNumber: string) => {
    onClearTable(tableNumber);
    setConfirmingTable(null);
  };

  // 解決刪除按鈕無反應：使用 stopPropagation 並直接呼叫狀態更新
  const handleDeleteOrder = (e: React.MouseEvent, orderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('確定要退掉/刪除這張訂單嗎？')) {
      onUpdateStatus(orderId, 'cancelled');
    }
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

  const SettingsSection = () => (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 no-print">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-slate-100 p-2 rounded-lg text-slate-600"><ShieldEllipsis size={24} /></div>
          <div>
            <h3 className="text-lg font-black text-slate-800">安全設定</h3>
            <p className="text-slate-500 text-xs">修改管理後台進入密碼</p>
          </div>
        </div>
        <form onSubmit={handleUpdatePasscode} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><KeyRound size={12}/> 新密碼 (8 位數字)</label>
            <input type="password" inputMode="numeric" maxLength={8} value={newPass} onChange={(e) => setNewPass(e.target.value.replace(/\D/g, ''))} placeholder="輸入 8 位數字" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><KeyRound size={12}/> 確認新密碼</label>
            <input type="password" inputMode="numeric" maxLength={8} value={confirmNewPass} onChange={(e) => setConfirmNewPass(e.target.value.replace(/\D/g, ''))} placeholder="再次輸入新密碼" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
          </div>
          <div className="md:col-span-2 flex flex-col sm:flex-row items-center gap-4">
            <button type="submit" className="w-full sm:w-auto bg-slate-900 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all active:scale-95">儲存新密碼</button>
            {passMessage && <p className={`text-xs font-bold flex items-center gap-1 ${passMessage.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{passMessage.type === 'success' && <Check size={14} />} {passMessage.text}</p>}
          </div>
        </form>
      </section>
      <section className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center no-print">
          <div><h2 className="text-xl font-black text-slate-800">桌碼管理</h2><p className="text-slate-500 text-sm">列印桌號專屬點餐 QR Code</p></div>
          <button onClick={() => window.print()} className="bg-orange-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all"><Printer size={18} /> 列印桌碼</button>
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
            <h1 className="text-xl font-bold tracking-tight">小吃店管理</h1>
            <div className={`flex items-center gap-1 text-[10px] font-bold ${isCloudEnabled ? 'text-green-400' : 'text-slate-500'}`}>
              {isCloudEnabled ? <Cloud size={10} /> : <CloudOff size={10} />}
              {isCloudEnabled ? '雲端同步中' : '本地模式 (非同步)'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setAutoPrintEnabled(!autoPrintEnabled)} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${autoPrintEnabled ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
            {autoPrintEnabled ? <BellRing size={14} /> : <BellOff size={14} />} 自動列印: {autoPrintEnabled ? 'ON' : 'OFF'}
          </button>
          <button onClick={() => setActiveTab('manual')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition-all ${activeTab === 'manual' ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'}`}><PlusCircle size={18} /> 現場代點</button>
          <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-400 transition-colors"><LogOut size={20} /></button>
        </div>
      </header>

      <nav className="flex bg-white border-b shadow-sm shrink-0 no-print overflow-x-auto">
        <button onClick={() => setActiveTab('kitchen')} className={`flex-1 min-w-[80px] py-3 font-bold transition-all border-b-4 ${activeTab === 'kitchen' ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-transparent text-slate-400'}`}><ChefHat size={18} className="mx-auto" /><span className="text-[10px] block">出餐進度</span></button>
        <button onClick={() => setActiveTab('billing')} className={`flex-1 min-w-[80px] py-3 font-bold transition-all border-b-4 ${activeTab === 'billing' ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-transparent text-slate-400'}`}><ReceiptText size={18} className="mx-auto" /><span className="text-[10px] block">桌況結帳</span></button>
        <button onClick={() => setActiveTab('manual')} className={`flex-1 min-w-[80px] py-3 font-bold transition-all border-b-4 ${activeTab === 'manual' ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-transparent text-slate-400'}`}><ShoppingCart size={18} className="mx-auto" /><span className="text-[10px] block">現場點餐</span></button>
        <button onClick={() => setActiveTab('history')} className={`flex-1 min-w-[80px] py-3 font-bold transition-all border-b-4 ${activeTab === 'history' ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-transparent text-slate-400'}`}><History size={18} className="mx-auto" /><span className="text-[10px] block">營收報表</span></button>
        <button onClick={() => setActiveTab('settings')} className={`flex-1 min-w-[80px] py-3 font-bold transition-all border-b-4 ${activeTab === 'settings' ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-transparent text-slate-400'}`}><QrCode size={18} className="mx-auto" /><span className="text-[10px] block">設定</span></button>
      </nav>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 no-print">
        {activeTab === 'kitchen' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-7xl mx-auto">
            <div className="space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-slate-700"><Clock className="text-orange-500" /> 等待中 ({pendingOrders.length})</h2>
              <div className="space-y-3">
                {pendingOrders.map(order => (
                  <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border-l-8 border-orange-500">
                    <div className="flex justify-between mb-3"><span className="text-lg font-black bg-slate-100 px-3 py-1 rounded-md">{order.tableNumber}</span><button onClick={() => handlePrint(order)} className="text-slate-400 hover:text-blue-500 p-1"><Printer size={16}/></button></div>
                    <ul className="space-y-1 mb-4">{order.items.map((item, idx) => (<li key={idx} className="flex justify-between text-slate-700"><span>{item.name}</span><span className="font-bold">x {item.quantity}</span></li>))}</ul>
                    <div className="flex gap-2">
                      <button onClick={() => onUpdateStatus(order.id, 'preparing')} className="flex-1 bg-blue-500 text-white py-2 rounded-lg font-bold text-sm">開始製作</button>
                      <button onClick={(e) => handleDeleteOrder(e, order.id)} className="p-2 text-slate-300 hover:text-red-500 bg-slate-50 rounded-lg"><Trash2 size={20} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-slate-700"><ChefHat className="text-blue-500" /> 製作中 ({preparingOrders.length})</h2>
              <div className="space-y-3">
                {preparingOrders.map(order => (
                  <div key={order.id} className="bg-blue-50 p-4 rounded-xl shadow-sm border border-blue-200">
                    <span className="text-lg font-black bg-white px-3 py-1 rounded-md mb-3 block w-fit">{order.tableNumber}</span>
                    <ul className="space-y-1 mb-4">{order.items.map((item, idx) => (<li key={idx} className="flex justify-between text-blue-900"><span>{item.name}</span><span className="font-bold">x {item.quantity}</span></li>))}</ul>
                    <button onClick={() => onUpdateStatus(order.id, 'completed')} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold">已出餐</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm flex items-center justify-between border border-slate-200">
               <div><p className="text-slate-500 text-sm">店內待收</p><p className="text-4xl font-black text-slate-900 font-mono">${totalUnpaidRevenue}</p></div>
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
                      <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase border-b pb-1">餐點摘要 (全桌合計)</p>
                      <div className="text-xs text-slate-600 space-y-1.5">
                        {Object.entries(tableItems).map(([name, qty]) => (<div key={name} className="flex justify-between border-b border-slate-200 border-dashed pb-1"><span>{name}</span><span className="font-bold text-slate-900">x{qty}</span></div>))}
                      </div>
                    </div>
                    {confirmingTable === table.tableNumber ? (
                      <div className="flex gap-2"><button onClick={() => handleClearTable(table.tableNumber)} className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-bold">確認結帳</button><button onClick={() => setConfirmingTable(null)} className="bg-slate-200 text-slate-600 px-4 py-2.5 rounded-lg">取消</button></div>
                    ) : (
                      <button onClick={() => setConfirmingTable(table.tableNumber)} className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-bold">結帳 / 清桌</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'manual' && (
          <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
             <CustomerView onAddOrder={(t, i) => { onAddOrder(t, i); setActiveTab('kitchen'); }} isStaffMode={true} />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[150px] space-y-1"><label className="text-xs font-bold text-slate-500">日期</label><input type="date" value={startDate} onChange={(e) => {setStartDate(e.target.value); setEndDate(e.target.value);}} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div><p className="text-slate-500 text-xs">當日營收</p><span className="text-3xl font-black text-green-600">${totalFilteredRevenue}</span></div>
                <div><p className="text-slate-500 text-xs">單數</p><p className="text-3xl font-black text-slate-900">{filteredHistoryOrders.length}</p></div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
              {filteredHistoryOrders.map(order => (
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

        {activeTab === 'settings' && <SettingsSection />}
      </main>

      {/* 列印用組件與彈窗 */}
      <OrderDetailsModal />
      <div className="print-only text-black bg-white w-full max-w-[80mm] mx-auto p-4">
        {selectedOrder && (
          <div className="py-4">
            <div className="text-center mb-4"><h2 className="text-xl font-bold">點餐確認聯</h2></div>
            <div className="font-black text-3xl mb-4 text-center">桌號: {selectedOrder.tableNumber}</div>
            <div className="border-t border-b border-black py-2 mb-4">
              {selectedOrder.items.map((item, idx) => (<div key={idx} className="flex justify-between mb-1"><span className="font-bold text-lg">{item.name} x {item.quantity}</span></div>))}
            </div>
            <div className="flex justify-between font-bold text-xl"><span>總額: ${selectedOrder.totalPrice}</span></div>
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
          <div className="p-4 border-b flex justify-between items-center bg-slate-50"><h3 className="font-bold">訂單明細</h3><button onClick={() => setSelectedOrder(null)}><X size={20}/></button></div>
          <div className="p-6">
            <div className="text-3xl font-black bg-slate-900 text-white px-4 py-1 rounded-xl w-fit mb-6">桌號 {selectedOrder.tableNumber}</div>
            <div className="space-y-3 mb-6">{selectedOrder.items.map((item, idx) => (<div key={idx} className="flex justify-between border-b border-dashed pb-2"><span>{item.name} x{item.quantity}</span><span className="font-bold">${item.price * item.quantity}</span></div>))}</div>
            <div className="flex justify-between pt-2"><span className="font-bold text-slate-500">總計金額</span><span className="text-2xl font-black text-orange-600">${selectedOrder.totalPrice}</span></div>
          </div>
          <div className="p-4 bg-slate-50 flex gap-2"><button onClick={() => handlePrint(selectedOrder)} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><Printer size={18} /> 列印</button><button onClick={() => setSelectedOrder(null)} className="flex-1 bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-bold">關閉</button></div>
        </div>
      </div>
    );
  }
};

export default OwnerDashboard;
