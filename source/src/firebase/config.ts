import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD2YGTqzuZUAhijS-N-XBmx8H3dGPIfRb8",
  authDomain: "wasi-app-1.firebaseapp.com",
  databaseURL: "https://wasi-app-1.firebaseio.com",
  projectId: "wasi-app-1",
  storageBucket: "wasi-app-1.firebasestorage.app",
  messagingSenderId: "629671315196",
  appId: "1:629671315196:web:8966f89b887bb83c0db979",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Enable emulators in development
if (import.meta.env.DEV) {
  // Uncomment below to use local emulators
  // connectAuthEmulator(auth, "http://localhost:9099");
  // connectFirestoreEmulator(db, "localhost", 8080);
  // connectStorageEmulator(storage, "localhost", 9199);
}

export { app };
