import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDQqibnIIy5AYX7OCVO8lvXRKOD9Vv11sQ",
  authDomain: "school-management-eabe0.firebaseapp.com",
  projectId: "school-management-eabe0",
  storageBucket: "school-management-eabe0.firebasestorage.app",
  messagingSenderId: "752496537755",
  appId: "1:752496537755:web:b2e993a2bb50836b18d63e",
  measurementId: "G-X91J95M7P6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

export default app;
