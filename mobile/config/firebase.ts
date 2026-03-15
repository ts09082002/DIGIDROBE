import { initializeApp, getApps, getApp } from 'firebase/app';
// @ts-ignore
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyBXylgSGdg_fqrsvAp6KLywu0zogxMavmg",
  authDomain: "digidrobe-backend.firebaseapp.com",
  projectId: "digidrobe-backend",
  storageBucket: "digidrobe-backend.firebasestorage.app",
  messagingSenderId: "838322575800",
  appId: "1:838322575800:web:0aca005dd067ac2f9cd74d"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// initializeAuth throws if called twice (e.g. during hot-reload).
// Fall back to getAuth which returns the already-initialised instance.
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

const storage = getStorage(app);

export { app, auth, storage };
