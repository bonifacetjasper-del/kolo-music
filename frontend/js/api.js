/* ==========================================
   KOLO MUSIC API CONNECTION
========================================== */

/*
   This file creates the global KOLO_API
   object used by:

   - marketplace.js
   - auth.js
   - listener.js
   - admin.js
   - app.js
   - artist.js
   - other frontend files

   IMPORTANT:
   Never put Supabase service-role keys
   or other private secrets in this file.
*/

/* ==========================================
   KOLO BACKEND URL
========================================== */

/*
   LOCAL DEVELOPMENT

   Keep this while testing on your computer.

   Later, when the FastAPI backend is online,
   we will replace this with the public backend URL.

   Example:

   const API_URL = "https://your-kolo-backend.example.com";
*/

const API_URL = "/api";

/* ==========================================
   GET CURRENT KOLO USER
========================================== */

function getKoloUser() {
  const savedUser = localStorage.getItem("koloUser");

  if (!savedUser) {
    return null;
  }

  try {
    return JSON.parse(savedUser);
  } catch (error) {
    console.error("Invalid KOLO user session:", error);

    localStorage.removeItem("koloUser");

    return null;
  }
}

/* ==========================================
   GET AUTH HEADERS
========================================== */

function getAuthHeaders() {
  const user = getKoloUser();

  const headers = {
    "Content-Type": "application/json",
  };

  /*
       Our FastAPI security system expects:

       user-id: USER_ID
    */

  if (user && user.id) {
    headers["user-id"] = user.id;
  }

  return headers;
}

/* ==========================================
   GET REQUEST
========================================== */

async function apiGet(endpoint) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      let message = `GET ${endpoint} failed: ${response.status}`;

      try {
        const errorData = await response.json();

        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            message = errorData.detail
              .map((error) => error.msg || JSON.stringify(error))
              .join(", ");
          } else {
            message = errorData.detail;
          }
        }
      } catch (error) {
        console.error("Unable to read GET error response:", error);
      }

      throw new Error(message);
    }

    return await response.json();
  } catch (error) {
    console.error("API GET ERROR:", error);

    throw error;
  }
}

/* ==========================================
   POST REQUEST
========================================== */

async function apiPost(endpoint, data = {}) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let message = `POST ${endpoint} failed: ${response.status}`;

      try {
        const errorData = await response.json();

        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            message = errorData.detail
              .map((error) => error.msg || JSON.stringify(error))
              .join(", ");
          } else {
            message = errorData.detail;
          }
        }
      } catch (error) {
        console.error("Unable to read POST error response:", error);
      }

      throw new Error(message);
    }

    return await response.json();
  } catch (error) {
    console.error("API POST ERROR:", error);

    throw error;
  }
}

/* ==========================================
   GLOBAL KOLO API OBJECT
========================================== */

window.KOLO_API = {
  get: apiGet,

  post: apiPost,

  url: API_URL,

  baseURL: API_URL,
};

/* ==========================================
   CONNECTION MESSAGE
========================================== */

console.log("KOLO API CONNECTED:", API_URL);
