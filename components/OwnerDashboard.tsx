
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Order, OrderStatus, TableTotal } from '../types';
import { Clock, CheckCircle, ChefHat, CreditCard, XCircle, PlusCircle, LayoutDashboard, ReceiptText, AlertCircle, History, TrendingUp, Printer, X, Settings2, BellRing, BellOff, HelpCircle, FileDown, Calendar } from 'lucide-react';

interface OwnerDashboardProps {
  orders: Order[];
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  onClearTable: (tableNumber: string) => void;
  onManualOrder: () => void;
}

const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ orders, onUpdateStatus, onClearTable, onManualOrder }) => {
  const [activeTab, setActiveTab] = React.useState<'kitchen' | 'billing' | 'history'>('kitchen');
  const [confirmingTable, setConfirmingTable] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showPrintHint, setShowPrintHint] = useState(false);
  
  // 日期篩選狀態，預設為今日
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  const [autoPrintEnabled, setAutoPrintEnabled] = useState<boolean>(() => {
    return localStorage.getItem('auto_print_enabled') === 'true';
  });
  
  const autoPrintedIds = useRef<Set<string>>(new Set());

  // 廚房與桌況分頁所需的邏輯
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

  // 歷史紀錄篩選邏輯：根據所選日期區間過濾已結帳訂單
  const filteredHistoryOrders = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return orders
      .filter(o => o.status === 'paid' && o.createdAt >= start && o.createdAt <= end)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [orders, startDate, endDate]);

  const totalFilteredRevenue = useMemo(() => filteredHistoryOrders.reduce((acc, o) => acc + o.totalPrice, 0), [filteredHistoryOrders]);

  useEffect(() => {
    localStorage.setItem('auto_print_enabled', String(autoPrintEnabled));
  }, [autoPrintEnabled]);

  const handlePrint = (order: Order) => {
    setSelectedOrder(order);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  useEffect(() => {
    if (!autoPrintEnabled) return;
    const newPendingOrder = pendingOrders.find(o => !autoPrintedIds.current.has(o.id));
    if (newPendingOrder) {
      autoPrintedIds.current.add(newPendingOrder.id);
      handlePrint(newPendingOrder);
    }
  }, [pendingOrders, autoPrintEnabled]);

  const handleClearTable = (tableNumber: string) => {
    onClearTable(tableNumber);
    setConfirmingTable(null);
  };

  // 匯出 CSV 功能：匯出目前篩選區間內的所有資料
  const exportToCSV = () => {
    if (filteredHistoryOrders.length === 0) {
      alert("所選區間內尚無成交資料可匯出");
      return;
    }

    const headers = ["日期時間", "桌號", "訂單ID", "餐點摘要", "總金額"];
    const rows = filteredHistoryOrders.map(o => [
      o.createdAt.toLocaleString().replace(',', ''),
      o.tableNumber,
      o.id,
      o.items.map(i => `${i.name}x${i.quantity}`).join('; '),
      o.totalPrice
    ]);

    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.setAttribute("href", url);
    link.setAttribute("download", `小吃店營收報表_${startDate}_至_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const PrintSettingHint = () => {
    if (!showPrintHint) return null;
    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="p-4 border-b flex justify-between items-center bg-blue-50">
            <h3 className="font-bold text-blue-800 flex items-center gap-2"><Settings2 size={18} /> 如何實現「直接出單」？</h3>
            <button onClick={() => setShowPrintHint(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><X size={20} className="text-slate-500" /></button>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-slate-600 text-sm leading-relaxed">如果您想達成<b>「一有訂單，印表機直接吐紙」</b>，請按照以下步驟設定：</p>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-sm">
              <div className="flex gap-2"><b>1.</b> 關閉所有 Chrome 視窗</div>
              <div className="flex gap-2"><b>2.</b> 捷徑右鍵選「內容」</div>
              <div className="flex gap-2"><b>3.</b> 在「目標」最後面加上：<code className="bg-blue-100 px-1 text-blue-700"> --kiosk-printing</code></div>
            </div>
            <button onClick={() => setShowPrintHint(false)} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold">我明白了</button>
          </div>
        </div>
      </div>
    );
  };

  const OrderDetailsModal = () => {
    if (!selectedOrder) return null;
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
        <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="p-4 border-b flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800">訂單明細 #{selectedOrder.id.slice(-4)}</h3>
            <button onClick={() => setSelectedOrder(null)} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
          </div>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <span className="text-3xl font-black bg-slate-900 text-white px-4 py-1 rounded-xl">桌號 {selectedOrder.tableNumber}</span>
              <span className="text-slate-400 text-sm">{selectedOrder.createdAt.toLocaleTimeString()}</span>
            </div>
            <div className="space-y-3 mb-6">
              {selectedOrder.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center pb-2 border-b border-dashed border-slate-100">
                  <span className="font-medium text-slate-700">{item.name}</span>
                  <div className="flex gap-4">
                    <span className="text-slate-400">x{item.quantity}</span>
                    <span className="font-bold text-slate-900">${item.price * item.quantity}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="font-bold text-slate-500">總計金額</span>
              <span className="text-2xl font-black text-orange-600">${selectedOrder.totalPrice}</span>
            </div>
          </div>
          <div className="p-4 bg-slate-50 flex gap-2">
            {selectedOrder.status !== 'paid' && (
              <button onClick={() => handlePrint(selectedOrder)} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><Printer size={18} /> 列印</button>
            )}
            <button onClick={() => setSelectedOrder(null)} className="flex-1 bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-bold">關閉</button>
          </div>
        </div>
      </div>
    );
  };

  const PrintableReceipt = () => {
    if (!selectedOrder) return null;
    const ReceiptContent = ({ type }: { type: '廚房備餐聯' | '顧客確認聯' }) => (
      <div className="py-4">
        <div className="text-center mb-4"><h2 className="text-xl font-bold">{type}</h2><p className="text-xs">SmartSnack 點餐系統</p></div>
        <div className="flex justify-between mb-2"><span className="font-black text-3xl">桌號: {selectedOrder.tableNumber}</span><span className="text-sm">#{selectedOrder.id.slice(-4)}</span></div>
        <div className="text-xs mb-4">時間: {selectedOrder.createdAt.toLocaleString()}</div>
        <div className="border-t border-b border-black py-2 mb-4">
          {selectedOrder.items.map((item, idx) => (
            <div key={idx} className="flex justify-between mb-1"><span className="font-bold text-lg">{item.name} x {item.quantity}</span><span className={type === '廚房備餐聯' ? 'hidden' : ''}>${item.price * item.quantity}</span></div>
          ))}
        </div>
        <div className={`flex justify-between font-bold text-xl mb-4 ${type === '廚房備餐聯' ? 'hidden' : ''}`}><span>應收總額</span><span>${selectedOrder.totalPrice}</span></div>
        <div className="text-center text-[10px] mt-4 opacity-50 font-bold">*** 謝謝惠顧 ***</div>
      </div>
    );
    return (
      <div className="print-only text-black bg-white w-full max-w-[80mm] mx-auto p-4">
        <ReceiptContent type="廚房備餐聯" />
        <div className="border-t-2 border-dashed border-black my-8 relative"><span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-white px-2 text-[10px] font-bold italic">請沿此虛線撕開</span></div>
        <ReceiptContent type="顧客確認聯" />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100">
      <PrintSettingHint />
      <OrderDetailsModal />
      <PrintableReceipt />

      <header className="bg-slate-900 text-white p-4 shadow-xl flex flex-wrap gap-4 justify-between items-center shrink-0 no-print">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 p-2 rounded-lg"><LayoutDashboard className="w-6 h-6" /></div>
          <h1 className="text-xl font-bold tracking-tight">小吃店管理</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
            <button onClick={() => setAutoPrintEnabled(!autoPrintEnabled)} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${autoPrintEnabled ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              {autoPrintEnabled ? <BellRing size={14} /> : <BellOff size={14} />} 自動列印: {autoPrintEnabled ? 'ON' : 'OFF'}
            </button>
            <button onClick={() => setShowPrintHint(true)} className="p-1.5 text-slate-500 hover:text-blue-400 transition-colors"><HelpCircle size={16} /></button>
          </div>
          <button onClick={onManualOrder} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 shadow-lg shadow-blue-900/20"><PlusCircle size={18} /> 現場代點</button>
        </div>
      </header>

      <nav className="flex bg-white border-b shadow-sm shrink-0 no-print overflow-x-auto">
        <button onClick={() => setActiveTab('kitchen')} className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-4 font-bold transition-all border-b-4 ${activeTab === 'kitchen' ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-transparent text-slate-400'}`}><ChefHat size={18} /> 出餐進度</button>
        <button onClick={() => setActiveTab('billing')} className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-4 font-bold transition-all border-b-4 ${activeTab === 'billing' ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-transparent text-slate-400'}`}><ReceiptText size={18} /> 桌況結帳</button>
        <button onClick={() => setActiveTab('history')} className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-4 font-bold transition-all border-b-4 ${activeTab === 'history' ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-transparent text-slate-400'}`}><History size={18} /> 營收報表</button>
      </nav>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 no-print">
        {activeTab === 'kitchen' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-7xl mx-auto">
            <div className="space-y-4">
              <h2 className="text-lg font-bold flex items-center justify-between text-slate-700">
                <div className="flex items-center gap-2"><Clock className="text-orange-500" /> 等待中 ({pendingOrders.length})</div>
                {autoPrintEnabled && <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full animate-pulse border border-green-200">偵測出單中</span>}
              </h2>
              <div className="space-y-3">
                {pendingOrders.map(order => (
                  <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border-l-8 border-orange-500">
                    <div className="flex justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black bg-slate-100 px-3 py-1 rounded-md">桌號: {order.tableNumber}</span>
                        <button onClick={() => handlePrint(order)} className="text-slate-400 hover:text-blue-500 p-1"><Printer size={16}/></button>
                      </div>
                      <span className="text-xs text-slate-400">{order.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <ul className="space-y-1 mb-4">{order.items.map((item, idx) => (<li key={idx} className="flex justify-between items-center text-slate-700"><span>{item.name}</span><span className="font-bold">x {item.quantity}</span></li>))}</ul>
                    <div className="flex gap-2"><button onClick={() => onUpdateStatus(order.id, 'preparing')} className="flex-1 bg-blue-500 text-white py-2 rounded-lg font-bold text-sm">開始製作</button><button onClick={() => onUpdateStatus(order.id, 'cancelled')} className="p-2 text-slate-300 hover:text-red-500"><XCircle size={20} /></button></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-slate-700"><ChefHat className="text-blue-500" /> 製作中 ({preparingOrders.length})</h2>
              <div className="space-y-3">
                {preparingOrders.map(order => (
                  <div key={order.id} className="bg-blue-50 p-4 rounded-xl shadow-sm border border-blue-200">
                    <div className="flex justify-between mb-3"><div className="flex items-center gap-2"><span className="text-lg font-black bg-white px-3 py-1 rounded-md">桌號: {order.tableNumber}</span><button onClick={() => handlePrint(order)} className="text-blue-400 hover:text-blue-600 p-1"><Printer size={16}/></button></div></div>
                    <ul className="space-y-1 mb-4">{order.items.map((item, idx) => (<li key={idx} className="flex justify-between items-center text-blue-900 font-medium"><span>{item.name}</span><span className="font-bold">x {item.quantity}</span></li>))}</ul>
                    <button onClick={() => onUpdateStatus(order.id, 'completed')} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2">已出餐</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm flex items-center justify-between border border-slate-200">
               <div><p className="text-slate-500 text-sm">目前店內待收總額</p><p className="text-4xl font-black text-slate-900 font-mono">${totalUnpaidRevenue}</p></div>
               <div className="bg-orange-100 p-4 rounded-2xl"><CreditCard className="w-8 h-8 text-orange-600" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeTables.map(table => (
                <div key={table.tableNumber} className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2"><span className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold text-lg">{table.tableNumber}</span><span className="text-slate-500">桌</span></div>
                    <div className="text-right"><p className="text-xs text-slate-400">待收金額</p><p className="text-2xl font-black text-orange-600 font-mono">${table.totalAmount}</p></div>
                  </div>
                  {confirmingTable === table.tableNumber ? (
                    <div className="flex gap-2"><button onClick={() => handleClearTable(table.tableNumber)} className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-bold">確認結帳</button><button onClick={() => setConfirmingTable(null)} className="bg-slate-200 text-slate-600 px-4 py-2.5 rounded-lg font-bold">取消</button></div>
                  ) : (
                    <button onClick={() => setConfirmingTable(table.tableNumber)} className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-2.5 rounded-lg font-bold"><ReceiptText size={18} /> 結帳完成 / 清桌</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* 區間篩選與統計概覽 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[150px] space-y-1">
                  <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Calendar size={12}/> 開始日期</label>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>
                <div className="flex-1 min-w-[150px] space-y-1">
                  <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Calendar size={12}/> 結束日期</label>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>
                <button 
                  onClick={exportToCSV}
                  className="bg-slate-900 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/10 h-[42px]"
                >
                  <FileDown size={18} /> 匯出區間報表
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div className="space-y-1">
                  <p className="text-slate-500 text-xs font-medium">區間總營收</p>
                  <span className="text-3xl font-black text-green-600 font-mono">${totalFilteredRevenue}</span>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-500 text-xs font-medium">區間總單數</p>
                  <p className="text-3xl font-black text-slate-900 font-mono">{filteredHistoryOrders.length} <span className="text-sm font-normal text-slate-400">張</span></p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2"><History size={18} className="text-slate-400" /> 區間歷史明細</h3>
                  <span className="text-xs text-slate-400">共 {filteredHistoryOrders.length} 筆資料</span>
               </div>
               <div className="divide-y divide-slate-100 max-h-[50vh] overflow-y-auto">
                  {filteredHistoryOrders.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">此區間內尚無成交紀錄</div>
                  ) : filteredHistoryOrders.map(order => (
                    <div key={order.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 font-black text-sm shrink-0">{order.tableNumber}</div>
                          <div className="space-y-0.5 overflow-hidden">
                             <div className="flex items-center gap-2">
                               <p className="font-black text-slate-900">${order.totalPrice}</p>
                               <span className="text-[10px] text-slate-300">#{order.id.slice(-4)}</span>
                             </div>
                             <p className="text-xs text-slate-500 truncate max-w-[180px] sm:max-w-md">
                                {order.items.map(i => `${i.name}x${i.quantity}`).join(', ')}
                             </p>
                             <p className="text-[10px] text-slate-400">{order.createdAt.toLocaleDateString()} {order.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                       </div>
                       <button onClick={() => setSelectedOrder(order)} className="text-slate-300 group-hover:text-slate-900 p-2 transition-colors shrink-0">
                          <AlertCircle size={20} />
                       </button>
                    </div>
                  ))}
               </div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-[10px] text-slate-400">匯出的 CSV 檔案包含詳細稅務資訊，可直接提供給會計師或自行報稅使用。</p>
              <div className="flex items-center justify-center gap-4 text-[10px] text-slate-300 font-bold">
                <span>月營收: 篩選當月 1 號至月底</span>
                <span>•</span>
                <span>年營收: 篩選當年 1/1 至 12/31</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default OwnerDashboard;
