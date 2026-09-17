export type GoogleAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  appOrigins: string[];
  sessionSecret: string;
  cookieSecure: boolean;
};

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.startsWith('replace-with-')) throw new Error('Missing required environment variable: ' + name);
  return value;
}

export function isGoogleAuthConfigured(): boolean {
  const secret = process.env.SESSION_SECRET;
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REDIRECT_URI &&
    secret &&
    secret.length >= 32,
  );
}

export function loadGoogleAuthConfig(): GoogleAuthConfig {
  const sessionSecret = required('SESSION_SECRET');
  if (sessionSecret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
  return {
    clientId: required('GOOGLE_CLIENT_ID'),
    clientSecret: required('GOOGLE_CLIENT_SECRET'),
    redirectUri: required('GOOGLE_REDIRECT_URI'),
    sessionSecret,
    appOrigins: (process.env.APP_ORIGINS ?? new URL(required('GOOGLE_REDIRECT_URI')).origin)
      .split(',')
      .map(value => value.trim())
      .filter(Boolean),
    cookieSecure: process.env.COOKIE_SECURE === 'true',
  };
}
