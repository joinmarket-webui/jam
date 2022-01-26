const SESSION_KEY = "joinmarket";

export const setSession = (name, token) => sessionStorage.setItem(SESSION_KEY, JSON.stringify({ name, token }));

export const getSession = () => {
  const { name, token } = JSON.parse(sessionStorage.getItem(SESSION_KEY)) || {};
  if (name && token) {
    return { name, token };
  } else {
    clearSession();
  }
};

export const clearSession = () => sessionStorage.removeItem(SESSION_KEY);
