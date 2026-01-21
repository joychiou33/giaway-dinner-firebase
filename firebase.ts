import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from "firebase/analytics";

// 使用使用者提供的 Firebase JS SDK 配置
const firebaseConfig = {
    apiKey: "AIzaSyBAYJ7XNkCKAvJU_rbvQ8XxJnl85mRxWEc",
    authDomain: "giaway-dinner-firebase.firebaseapp.com",
    projectId: "giaway-dinner-firebase",
    storageBucket: "giaway-dinner-firebase.firebasestorage.app",
    messagingSenderId: "121358558031",
    appId: "1:121358558031:web:756d48346913177f791b3a",
    measurementId: "G-SS3W38QLPZ"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
// Analytics 僅在瀏覽器環境下初始化
if (typeof window !== 'undefined') {
    getAnalytics(app);
}
