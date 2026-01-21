export type Category = '主食' | '小菜' | '湯品' | '飲料';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: Category;
  description: string;
  image: string;
  available: boolean;
  // [新增] 更新時間欄位 (Firestore Timestamp 或 Date)
  updatedAt?: any;
}

// ... 其他 interface (OrderItem, Order, TableTotal) 維持不變 ...
export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export type OrderStatus = 'pending' | 'preparing' | 'completed' | 'cancelled' | 'paid';

export interface Order {
  id: string;
  tableNumber: string;
  items: OrderItem[];
  totalPrice: number;
  status: OrderStatus;
  createdAt: Date;
}

export interface TableTotal {
  tableNumber: string;
  totalAmount: number;
  orderIds: string[];
}