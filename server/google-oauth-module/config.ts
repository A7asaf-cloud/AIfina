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
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REDIRECT_URI,
  );
}

export function loadGoogleAuthConfig(): GoogleAuthConfig {
  // Session ids are high-entropy server-side values. The optional secret remains
  // available for a future signed/session-store implementation, but must not
  // disable Google sign-in in an existing AI Studio deployment.
  const sessionSecret = process.env.SESSION_SECRET || process.env.JWT_SECRET || '';
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
