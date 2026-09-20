/**
 * FinanceIL - Application Configuration
 */
export const CONFIG = {
  // Replace this with your production server URL when deploying the backend (e.g. 'https://aifina-backend.onrender.com')
  // If empty, it defaults to the current domain (for local development or same-host deployment)
  // This value is public by design: it only identifies the HTTPS AIfina API.
  // Native builds must set VITE_AIFINA_API_URL at build time; never add secrets
  // with a VITE_ prefix.
  API_SERVER_URL: import.meta.env.VITE_AIFINA_API_URL || '',
  // Set by the secure backend/provider deployment. Never put provider secrets in the browser.
  OPEN_BANKING_CONNECT_URL: import.meta.env.VITE_OPEN_BANKING_CONNECT_URL || '',
};
