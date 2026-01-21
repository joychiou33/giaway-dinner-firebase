
export type Category = '主食' | '小菜' | '湯品' | '飲料';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: Category;
  description: string;
  image: string;
  available?: boolean; // 供應狀態：true=供應中, false=售完
}

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
