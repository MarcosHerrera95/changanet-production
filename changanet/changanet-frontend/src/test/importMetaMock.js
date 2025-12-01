// Mock para import.meta.env en Jest
globalThis.import = {
  meta: {
    env: {
      VITE_API_URL: 'http://localhost:3003',
      VITE_FIREBASE_API_KEY: 'test-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'test-project',
      VITE_FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
      VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789',
      VITE_FIREBASE_APP_ID: '1:123456789:web:abcdef123456',
      VITE_SENTRY_DSN: 'https://test@test.ingest.sentry.io/test',
      DEV: true,
      PROD: false
    }
  }
};
