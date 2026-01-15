
import React, { useState, useMemo } from 'react';
import { MenuItem, OrderItem, Category } from '../types';
import { INITIAL_MENU, TABLES } from '../constants';
import { ShoppingCart, Plus, Minus, Trash2, ArrowLeft, Send, CheckCircle } from 'lucide-react';

interface CustomerViewProps {
  onAddOrder: (tableNumber: string, items: OrderItem[]) => void;
  initialTable?: string;
  isStaffMode?: boolean;
}

const CustomerView: React.FC<CustomerViewProps> = ({ onAddOrder, initialTable = '', isStaffMode = false }) => {
  const [selectedTable, setSelectedTable] = useState(initialTable);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [activeCategory, setActiveCategory] = useState<Category>('主食');
  const [showCart, setShowCart] = useState(false);
  const [isOrdered, setIsOrdered] = useState(false);

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

  const handleSubmitOrder = () => {
    if (!selectedTable) {
      alert('請先選擇桌號！');
      return;
    }
    if (cartItemsCount === 0) {
      alert('購物車是空的！');
      return;
    }

    const orderItems: OrderItem[] = (Object.entries(cart) as [string, number][]).map(([id, qty]) => {
      const item = INITIAL_MENU.find(m => m.id === id)!;
      return {
        menuItemId: id,
        name: item.name,
        price: item.price,
        quantity: qty
      };
    });

    onAddOrder(selectedTable, orderItems);
    setIsOrdered(true);
    setCart({});
    setTimeout(() => setIsOrdered(false), 3000);
    setShowCart(false);
  };

  if (isOrdered) {
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
    <div className="flex flex-col min-h-screen bg-slate-50 pb-32">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-orange-500 text-white p-4 shadow-md">
        <div className="flex justify-between items-center max-w-lg mx-auto">
          <h1 className="text-xl font-bold flex items-center gap-2">
            {isStaffMode ? '櫃檯人工點餐' : '美味小吃點餐'}
          </h1>
          <div className="flex items-center gap-2">
             <span className="text-sm font-medium">桌號:</span>
             <select 
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="bg-orange-600 text-white border-none rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-white"
             >
               <option value="">選擇</option>
               {TABLES.map(t => <option key={t} value={t}>{t}</option>)}
             </select>
          </div>
        </div>
      </header>

      {/* Category Tabs */}
      <div className="sticky top-[60px] z-10 bg-white border-b overflow-x-auto hide-scrollbar">
        <div className="flex px-4 max-w-lg mx-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-1 py-4 text-sm font-bold transition-colors whitespace-nowrap px-6 border-b-2 ${
                activeCategory === cat ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu List */}
      <main className="flex-1 max-w-lg mx-auto w-full p-4 space-y-4">
        {INITIAL_MENU.filter(m => m.category === activeCategory).map(item => (
          <div key={item.id} className="bg-white rounded-xl shadow-sm overflow-hidden flex h-32 border border-slate-100">
            <img src={item.image} alt={item.name} className="w-32 h-full object-cover" />
            <div className="flex-1 p-3 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-slate-800">{item.name}</h3>
                <p className="text-xs text-slate-500 line-clamp-1">{item.description}</p>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-orange-600 font-bold font-mono text-lg">${item.price}</span>
                <div className="flex items-center gap-3">
                  {cart[item.id] > 0 && (
                    <>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="w-8 h-8 rounded-full border border-orange-200 flex items-center justify-center text-orange-500 active:bg-orange-50"
                      >
                        <Minus size={18} />
                      </button>
                      <span className="font-bold min-w-[1rem] text-center">{cart[item.id]}</span>
                    </>
                  )}
                  <button 
                    onClick={() => addToCart(item.id)}
                    className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-sm active:scale-90 transition-transform"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </main>

      {/* Cart Summary (Floating above Nav) */}
      {cartItemsCount > 0 && (
        <div className="fixed bottom-20 left-0 right-0 p-4 z-30 max-w-lg mx-auto">
          <div className="bg-slate-900 text-white rounded-2xl shadow-2xl overflow-hidden">
            {showCart && (
              <div className="p-4 border-b border-slate-700 max-h-[40vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold flex items-center gap-2"><ShoppingCart size={18}/> 您的訂單</h4>
                  <button onClick={() => setShowCart(false)} className="text-slate-400 hover:text-white"><ArrowLeft size={18}/></button>
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
                           <button onClick={() => removeFromCart(id)} className="text-slate-400 p-1"><Minus size={16}/></button>
                           <span className="font-bold">{qty}</span>
                           <button onClick={() => addToCart(id)} className="text-orange-400 p-1"><Plus size={16}/></button>
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
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider uppercase">Total Price</p>
                  <p className="text-lg font-black text-white">${totalPrice}</p>
                </div>
              </div>
              <button 
                onClick={handleSubmitOrder}
                className="bg-orange-500 hover:bg-orange-600 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-transform active:scale-95 shadow-lg shadow-orange-500/20"
              >
                <Send size={18} /> 確認下單
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerView;
