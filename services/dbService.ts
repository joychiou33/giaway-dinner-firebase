
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    onSnapshot,
    Timestamp,
    serverTimestamp,
    where
} from 'firebase/firestore';
import { db } from '../firebase';
import { MenuItem, Order, OrderStatus, OrderItem } from '../types';

const MENU_COLLECTION = 'menu';
const ORDERS_COLLECTION = 'orders';

export const dbService = {
    // 取得所有菜單
    async getMenu(): Promise<MenuItem[]> {
        try {
            const querySnapshot = await getDocs(collection(db, MENU_COLLECTION));
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
        } catch (error) {
            console.error("Error getting menu: ", error);
            return [];
        }
    },

    // 新增菜單項目
    async addMenuItem(item: Omit<MenuItem, 'id'>) {
        return await addDoc(collection(db, MENU_COLLECTION), item);
    },

    // 更新菜單狀態
    async updateMenuItem(id: string, updates: Partial<MenuItem>) {
        const docRef = doc(db, MENU_COLLECTION, id);
        return await updateDoc(docRef, updates);
    },

    // 刪除菜單
    async deleteMenuItem(id: string) {
        const docRef = doc(db, MENU_COLLECTION, id);
        return await deleteDoc(docRef);
    },

    // 建立訂單（新版，包含完整資訊）
    async createOrder(tableNumber: string, items: OrderItem[]) {
        const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const newOrder = {
            tableNumber,
            items,
            totalPrice,
            status: 'pending' as OrderStatus,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        return await addDoc(collection(db, ORDERS_COLLECTION), newOrder);
    },

    // 實時監聽訂單變動
    subscribeToOrders(callback: (orders: Order[]) => void) {
        const q = query(collection(db, ORDERS_COLLECTION), orderBy('createdAt', 'desc'));
        return onSnapshot(q, (snapshot) => {
            const orders = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date()
                } as Order;
            });
            callback(orders);
        }, (error) => {
            console.error("Order subscription error: ", error);
        });
    },

    // 更新訂單狀態
    async updateOrderStatus(orderId: string, status: OrderStatus) {
        const docRef = doc(db, ORDERS_COLLECTION, orderId);
        return await updateDoc(docRef, {
            status,
            updatedAt: serverTimestamp()
        });
    },

    // 刪除訂單
    async deleteOrder(orderId: string) {
        console.log('dbService.deleteOrder 被呼叫，訂單 ID:', orderId);
        try {
            const docRef = doc(db, ORDERS_COLLECTION, orderId);
            console.log('準備刪除文件:', docRef.path);
            await deleteDoc(docRef);
            console.log('Firestore 刪除成功:', orderId);
        } catch (error) {
            console.error('Firestore 刪除失敗:', error);
            throw error;
        }
    },

    // 結帳清桌（批次更新該桌所有訂單）
    async clearTable(tableNumber: string, orderIds: string[]) {
        const updatePromises = orderIds.map(orderId => {
            const docRef = doc(db, ORDERS_COLLECTION, orderId);
            return updateDoc(docRef, {
                status: 'paid' as OrderStatus,
                paidAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        });

        return await Promise.all(updatePromises);
    }
};
