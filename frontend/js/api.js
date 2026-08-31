/* ==========================================
   KOLO MUSIC API CONNECTION
========================================== */

const API_URL =
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "localhost"
    ? "http://127.0.0.1:8000/api"
    : "/api";


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

    console.error(
      "Invalid KOLO user session:",
      error
    );

    localStorage.removeItem("koloUser");

    return null;
  }
}


/* ==========================================
   GET ACCESS TOKEN
========================================== */

function getKoloAccessToken() {

  /*
     Login stores the Supabase access token here.
  */

  const token =
    localStorage.getItem("koloAccessToken");

  if (token) {
    return token;
  }

  /*
     Compatibility fallback in case an older
     session stored the token differently.
  */

  const user = getKoloUser();

  if (user && user.access_token) {
    return user.access_token;
  }

  return null;
}


/* ==========================================
   GET AUTH HEADERS
========================================== */

function getAuthHeaders() {

  const user = getKoloUser();

  const accessToken =
    getKoloAccessToken();

  const headers = {
    "Content-Type": "application/json"
  };

  /*
     REAL AUTHENTICATION

     The backend security layer verifies
     this token with Supabase.
  */

  if (accessToken) {

    headers["Authorization"] =
      `Bearer ${accessToken}`;

  }

  /*
     Keep user-id temporarily for compatibility
     with older routes.

     IMPORTANT:
     Backend authorization must NOT trust this
     header for identity.
  */

  if (user && user.id) {

    headers["user-id"] =
      user.id;

  }

  return headers;
}


/* ==========================================
   HANDLE AUTH FAILURE
========================================== */

function handleAuthenticationFailure(
  status
) {

  if (status === 401) {

    console.warn(
      "KOLO authentication expired."
    );

    /*
       Do not immediately delete the whole
       session here. Other pages may still
       need the stored user information.
    */

  }

}


/* ==========================================
   GET REQUEST
========================================== */

async function apiGet(endpoint) {

  try {

    const response = await fetch(
      `${API_URL}${endpoint}`,
      {
        method: "GET",
        headers: getAuthHeaders()
      }
    );

    if (!response.ok) {

      handleAuthenticationFailure(
        response.status
      );

      let message =
        `GET ${endpoint} failed: ${response.status}`;

      try {

        const errorData =
          await response.json();

        if (errorData.detail) {

          if (
            Array.isArray(
              errorData.detail
            )
          ) {

            message =
              errorData.detail
                .map(
                  error =>
                    error.msg ||
                    JSON.stringify(error)
                )
                .join(", ");

          } else {

            message =
              errorData.detail;

          }
        }

      } catch (error) {

        console.error(
          "Unable to read GET error response:",
          error
        );

      }

      throw new Error(message);
    }

    return await response.json();

  } catch (error) {

    console.error(
      "API GET ERROR:",
      error
    );

    throw error;
  }
}


/* ==========================================
   POST REQUEST
========================================== */

async function apiPost(
  endpoint,
  data = {}
) {

  try {

    const response = await fetch(
      `${API_URL}${endpoint}`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      }
    );

    if (!response.ok) {

      handleAuthenticationFailure(
        response.status
      );

      let message =
        `POST ${endpoint} failed: ${response.status}`;

      try {

        const errorData =
          await response.json();

        if (errorData.detail) {

          if (
            Array.isArray(
              errorData.detail
            )
          ) {

            message =
              errorData.detail
                .map(
                  error =>
                    error.msg ||
                    JSON.stringify(error)
                )
                .join(", ");

          } else {

            message =
              errorData.detail;

          }
        }

      } catch (error) {

        console.error(
          "Unable to read POST error response:",
          error
        );

      }

      throw new Error(message);
    }

    return await response.json();

  } catch (error) {

    console.error(
      "API POST ERROR:",
      error
    );

    throw error;
  }
}


/* ==========================================
   PUT REQUEST
========================================== */

async function apiPut(
  endpoint,
  data = {}
) {

  try {

    const response = await fetch(
      `${API_URL}${endpoint}`,
      {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      }
    );

    if (!response.ok) {

      handleAuthenticationFailure(
        response.status
      );

      let message =
        `PUT ${endpoint} failed: ${response.status}`;

      try {

        const errorData =
          await response.json();

        if (errorData.detail) {

          if (
            Array.isArray(
              errorData.detail
            )
          ) {

            message =
              errorData.detail
                .map(
                  error =>
                    error.msg ||
                    JSON.stringify(error)
                )
                .join(", ");

          } else {

            message =
              errorData.detail;

          }
        }

      } catch (error) {

        console.error(
          "Unable to read PUT error response:",
          error
        );

      }

      throw new Error(message);
    }

    return await response.json();

  } catch (error) {

    console.error(
      "API PUT ERROR:",
      error
    );

    throw error;
  }
}


/* ==========================================
   GLOBAL KOLO API OBJECT
========================================== */

window.KOLO_API = {

  get: apiGet,

  post: apiPost,

  put: apiPut,

  url: API_URL,

  baseURL: API_URL

};


/* ==========================================
   CONNECTION MESSAGE
========================================== */

console.log(
  "KOLO API CONNECTED:",
  API_URL
);

console.log(
  "KOLO AUTH TOKEN:",
  getKoloAccessToken()
    ? "AVAILABLE"
    : "NOT FOUND"
);
