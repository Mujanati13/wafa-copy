const AUTH_TOKEN_KEY = "token";

export const getStoredAuthToken = () => (
  localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY)
);

export const storeAuthToken = (token, rememberMe) => {
  if (!token) return;

  if (rememberMe) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    return;
  }

  sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

export const clearStoredAuthToken = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
};
