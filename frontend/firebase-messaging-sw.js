importScripts(
  "https://www.gstatic.com/firebasejs/12.0.0/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyAnbnylFKvHCP0gDnB-CCzuVTzeNMvTgaA",
  authDomain: "kolo-music-c8afd.firebaseapp.com",
  projectId: "kolo-music-c8afd",
  storageBucket: "kolo-music-c8afd.firebasestorage.app",
  messagingSenderId: "733415195057",
  appId: "1:733415195057:web:4912c625f02ea726cf3d90"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Background message:",
    payload
  );

  const notificationTitle =
    payload.notification?.title || "KOLO MUSIC";

  const notificationOptions = {
    body:
      payload.notification?.body ||
      "You have a new KOLO MUSIC request.",
    icon: "/asserts/logo/logo.png",
    badge: "/asserts/logo/logo.png",
    data: payload.data || {}
  };

  self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});
