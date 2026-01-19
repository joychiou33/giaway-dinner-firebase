
import React, { useState, useMemo, useEffect } from 'react';
import { MenuItem, OrderItem, Category } from '../types';
import { INITIAL_MENU, TABLES } from '../constants';
import { ShoppingCart, Plus, Minus, ArrowLeft, Send, CheckCircle, MapPin, Loader2, ChevronLeft } from 'lucide-react';

interface CustomerViewProps {
  onAddOrder: (tableNumber: string, items: OrderItem[]) => Promise<void>;
  onBack?: () => void; // 新增：提供給 Staff 模式返回桌號選擇用
  initialTable?: string;
  isStaffMode?: boolean;
  lockTable?: boolean;
}

const CustomerView: React.FC<CustomerViewProps> = ({
  onAddOrder,
  onBack,
  initialTable = '',
  isStaffMode = false,
  lockTable = false
}) => {
  const [selectedTable, setSelectedTable] = useState(initialTable);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [activeCategory, setActiveCategory] = useState<Category>('主食');
  const [showCart, setShowCart] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOrdered, setIsOrdered] = useState(false);

  useEffect(() => {
    if (initialTable) setSelectedTable(initialTable);
  }, [initialTable]);

  const categories: Category[] = ['主食', '小菜', '湯品', '飲料'];

  const addToCart = (id: string) => {
    setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[id] > 1) {
        newCart[id]--;
      } else {
        delete newCart[id];
      }
      return newCart;
    });
  };

  const cartItemsCount = useMemo(() => (Object.values(cart) as number[]).reduce((a, b) => a + b, 0), [cart]);

  const totalPrice = useMemo(() => {
    return (Object.entries(cart) as [string, number][]).reduce((total, [id, qty]) => {
      const item = INITIAL_MENU.find(m => m.id === id);
      return total + (item?.price || 0) * qty;
    }, 0);
  }, [cart]);

  const handleSubmitOrder = async () => {
    if (!selectedTable) {
      alert('請先選擇桌號！');
      return;
    }
    if (cartItemsCount === 0) {
      alert('購物車是空的！');
      return;
    }

    setIsSubmitting(true);
    const orderItems: OrderItem[] = (Object.entries(cart) as [string, number][]).map(([id, qty]) => {
      const item = INITIAL_MENU.find(m => m.id === id)!;
      return {
        menuItemId: id,
        name: item.name,
        price: item.price,
        quantity: qty
      };
    });

    try {
      await onAddOrder(selectedTable, orderItems);
      // Staff 模式下不顯示成功畫面，直接由父組件處理
      if (!isStaffMode) {
        setIsOrdered(true);
        setCart({});
        setShowCart(false);
        setTimeout(() => setIsOrdered(false), 3000);
      }
    } catch (err) {
      console.error(err);
      alert('下單失敗，請檢查操作');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 顧客模式的成功畫面
  if (isOrdered && !isStaffMode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-white p-6 animate-in fade-in duration-500">
        <CheckCircle className="w-20 h-20 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">下單成功！</h2>
        <p className="text-slate-500 mb-8">餐點製作中，請稍候。</p>
        <button
          onClick={() => setIsOrdered(false)}
          className="bg-orange-500 text-white px-8 py-3 rounded-full font-bold shadow-lg active:scale-95 transition-transform"
        >
          繼續點餐
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col bg-slate-50 ${isStaffMode ? 'h-full' : 'min-h-screen pb-32'}`}>
      {/* Header - 修正：Staff 模式也要顯示，但樣式不同 */}
      <header className={`sticky top-0 z-20 p-4 shadow-md no-print transition-colors ${isStaffMode ? 'bg-slate-800 text-white' : 'bg-orange-500 text-white'}`}>
        <div className="flex justify-between items-center max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            {isStaffMode && onBack && (
              <button onClick={onBack} className="p-1 -ml-1 hover:bg-slate-700 rounded-lg transition-colors">
                <ChevronLeft size={24} />
              </button>
            )}
            <h1 className="text-lg font-bold flex items-center gap-2">
              {isStaffMode ? '現場代點模式' : '美味小吃點餐'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium opacity-80"><MapPin size={12} className="inline mr-1" />桌號:</span>
            {lockTable ? (
              <span className={`px-3 py-1 rounded font-black ${isStaffMode ? 'bg-orange-500' : 'bg-orange-700'}`}>{selectedTable}</span>
            ) : (
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="bg-white/20 text-white border-none rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-white"
              >
                <option value="" className="text-slate-800">選擇</option>
                {TABLES.map(t => <option key={t} value={t} className="text-slate-800">{t}</option>)}
              </select>
            )}
          </div>
        </div>
      </header>

      {/* Category Tabs */}
      <div className="sticky top-[60px] z-10 bg-white border-b overflow-x-auto hide-scrollbar no-print">
        <div className="flex px-4 max-w-lg mx-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-1 py-4 text-sm font-bold transition-colors whitespace-nowrap px-6 border-b-2 ${activeCategory === cat ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu List */}
      <main className="flex-1 max-w-lg mx-auto w-full p-4 space-y-4 no-print pb-40">
        {INITIAL_MENU.filter(m => m.category === activeCategory).map(item => (
          <div key={item.id} className="bg-white rounded-xl shadow-sm overflow-hidden flex h-28 sm:h-32 border border-slate-100">
            <img src={item.image} alt={item.name} className="w-24 sm:w-32 h-full object-cover" />
            <div className="flex-1 p-3 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">{item.name}</h3>
                <p className="text-[10px] sm:text-xs text-slate-500 line-clamp-1">{item.description}</p>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-orange-600 font-bold font-mono text-base sm:text-lg">${item.price}</span>
                <div className="flex items-center gap-2 sm:gap-3">
                  {cart[item.id] > 0 && (
                    <>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-orange-200 flex items-center justify-center text-orange-500 active:bg-orange-50"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="font-bold min-w-[0.5rem] text-center text-sm sm:text-base">{cart[item.id]}</span>
                    </>
                  )}
                  <button
                    onClick={() => addToCart(item.id)}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-sm active:scale-90 transition-transform"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </main>

      {/* Cart Summary */}
      {cartItemsCount > 0 && (
        <div className="fixed bottom-20 left-0 right-0 p-4 z-30 max-w-lg mx-auto no-print">
          <div className="bg-slate-900 text-white rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
            {showCart && (
              <div className="p-4 border-b border-slate-700 max-h-[30vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold flex items-center gap-2 text-orange-400">
                    <ShoppingCart size={18} /> {isStaffMode ? '代點明細' : '我的購物車'} ({selectedTable}桌)
                  </h4>
                  <button onClick={() => setShowCart(false)} className="text-slate-400 hover:text-white"><ArrowLeft size={18} /></button>
                </div>
                <div className="space-y-4">
                  {(Object.entries(cart) as [string, number][]).map(([id, qty]) => {
                    const item = INITIAL_MENU.find(m => m.id === id)!;
                    return (
                      <div key={id} className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-slate-400">${item.price} x {qty}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => removeFromCart(id)} className="text-slate-400 p-1"><Minus size={16} /></button>
                          <span className="font-bold">{qty}</span>
                          <button onClick={() => addToCart(id)} className="text-orange-400 p-1"><Plus size={16} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="p-4 flex items-center justify-between">
              <div onClick={() => setShowCart(!showCart)} className="cursor-pointer flex items-center gap-3">
                <div className="relative">
                  <ShoppingCart className="w-6 h-6 text-orange-400" />
                  <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {cartItemsCount}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">總金額</p>
                  <p className="text-lg font-black text-white">${totalPrice}</p>
                </div>
              </div>
              <button
                onClick={handleSubmitOrder}
                disabled={isSubmitting}
                className="bg-orange-500 hover:bg-orange-600 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                {isStaffMode ? '完成代點' : '確認下單'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerView;