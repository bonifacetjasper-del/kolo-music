import { messaging } from "./firebase-config.js";

import {
  getToken,
  onMessage
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging.js";

const VAPID_KEY =
  "BMpXf5POCGC2Sf708OHfWZaFsJ2YsNsBVUIQoXMPEcgDUATyfzp-NcIFbkLU8TbjjPBWzN0JsWyi20fTBbZu4x8";

async function initializeKoloNotifications() {
  try {

    console.log("KOLO: Starting notification setup...");

    if (!("Notification" in window)) {
      console.warn("KOLO: Browser notifications are not supported.");
      return;
    }

    let permission = Notification.permission;

    if (permission === "default") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      console.warn("KOLO: Notification permission was not granted.");
      return;
    }

    console.log("KOLO: Notification permission granted.");

    const registration =
      await navigator.serviceWorker.register(
        "/frontend/firebase-messaging-sw.js"
      );

    console.log(
      "KOLO: Service worker registered:",
      registration.scope
    );

    await navigator.serviceWorker.ready;

    console.log(
      "KOLO: Service worker is active:",
      registration.active?.scriptURL
    );

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (!token) {
      console.warn("KOLO: Firebase notification token was not created.");
      return;
    }

    console.log(
      "KOLO FIREBASE NOTIFICATION TOKEN:",
      token
    );

    localStorage.setItem("koloNotificationToken", token);

    const koloUser =
      JSON.parse(
        localStorage.getItem("koloUser") || "null"
      );

    if (!koloUser?.id) {
      console.warn(
        "KOLO: No logged-in user found for notification token."
      );
      return;
    }

    let tokenResult = null;
    let tokenSaved = false;

    for (let attempt = 1; attempt <= 3; attempt++) {

      try {

        console.log(
          `KOLO: Saving notification token (attempt ${attempt}/3)...`
        );

        tokenResult = await window.KOLO_API.post(
          "/admin/notification-token",
          {
            user_id: koloUser.id,
            token: token,
            platform: "web"
          }
        );

        tokenSaved = true;

        console.log(
          "KOLO: Notification token saved:",
          tokenResult
        );

        break;

      } catch (error) {

        console.warn(
          `KOLO: Notification token save attempt ${attempt} failed:`,
          error
        );

        if (attempt < 3) {
          await new Promise(
            resolve => setTimeout(resolve, 1000)
          );
        }
      }
    }

    if (!tokenSaved) {
      throw new Error(
        "Unable to save notification token after 3 attempts."
      );
    }

    console.log(
      "KOLO: Notification token saved:",
      tokenResult
    );

    onMessage(messaging, (payload) => {

      console.log(
        "KOLO FOREGROUND NOTIFICATION:",
        payload
      );

      if (payload.notification) {
        new Notification(
          payload.notification.title || "KOLO MUSIC",
          {
            body:
              payload.notification.body ||
              "You have a new KOLO MUSIC request."
          }
        );
      }

    });

  } catch (error) {

    console.error(
      "KOLO notification setup failed:",
      error
    );

  }
}

window.initializeKoloNotifications =
  initializeKoloNotifications;

initializeKoloNotifications();


