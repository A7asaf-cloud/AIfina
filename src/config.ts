/**
 * FinanceIL - Application Configuration
 */
export const CONFIG = {
  // Replace this with your production server URL when deploying the backend (e.g. 'https://aifina-backend.onrender.com')
  // If empty, it defaults to the current domain (for local development or same-host deployment)
  API_SERVER_URL: '',

  // GitHub Serverless Database Configuration for Cross-Device Synchronization
  // The token is stored in localStorage for security (bypassing GitHub Push Protection)
  get GITHUB_TOKEN(): string {
    return localStorage.getItem('fil_github_token') || '';
  },
  GITHUB_REPO: 'A7asaf-cloud/AIfina',
};
