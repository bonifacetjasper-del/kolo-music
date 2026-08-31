import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getMessaging } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyAnbnylFKvHCP0gDnB-CCzuVTzeNMvTgaA",
  authDomain: "kolo-music-c8afd.firebaseapp.com",
  projectId: "kolo-music-c8afd",
  storageBucket: "kolo-music-c8afd.firebasestorage.app",
  messagingSenderId: "733415195057",
  appId: "1:733415195057:web:4912c625f02ea726cf3d90",
  measurementId: "G-VYLDKZ2LC8"
};

const app = initializeApp(firebaseConfig);

const messaging = getMessaging(app);

export { app, messaging, firebaseConfig };
