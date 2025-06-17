// Function to save session after successful login
export const setSession = (session: { walletFileName: string; auth: { token: string; refresh_token: string } }) => {
  sessionStorage.setItem('joinmarket', JSON.stringify(session))
}

// Function to get current session
export const getSession = () => {
  const session = sessionStorage.getItem('joinmarket')
  return session ? JSON.parse(session) : null
}

// Function to clear session on logout
export const clearSession = () => {
  sessionStorage.removeItem('joinmarket')
}
