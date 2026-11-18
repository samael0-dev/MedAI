import { betterAuth } from 'better-auth';
import { emailOTP, bearer, jwt } from 'better-auth/plugins';
import Database from 'better-sqlite3';
import path from 'path';

// Path for Better Auth SQLite database
const dbPath = path.resolve(process.cwd(), 'medai_better_auth.db');
const db = new Database(dbPath);

// Ensure Better Auth tables exist in SQLite
db.exec(`
  CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    emailVerified INTEGER NOT NULL DEFAULT 0,
    image TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY,
    expiresAt TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    ipAddress TEXT,
    userAgent TEXT,
    userId TEXT NOT NULL REFERENCES user(id)
  );
  CREATE TABLE IF NOT EXISTS account (
    id TEXT PRIMARY KEY,
    accountId TEXT NOT NULL,
    providerId TEXT NOT NULL,
    userId TEXT NOT NULL REFERENCES user(id),
    accessToken TEXT,
    refreshToken TEXT,
    idToken TEXT,
    accessTokenExpiresAt TEXT,
    refreshTokenExpiresAt TEXT,
    scope TEXT,
    password TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS verification (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    createdAt TEXT,
    updatedAt TEXT
  );
  CREATE TABLE IF NOT EXISTS jwks (
    id TEXT PRIMARY KEY,
    publicKey TEXT NOT NULL,
    privateKey TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    expiresAt TEXT,
    alg TEXT,
    crv TEXT
  );
`);

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:5173',
  secret: process.env.BETTER_AUTH_SECRET || 'medai-super-secret-hipaa-compliant-key-change-in-production-2026',
  trustedOrigins: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://localhost:4000',
    'http://localhost:4321',
    'http://localhost:8000',
  ],
  database: db,
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || 'mock-google-client-id.apps.googleusercontent.com',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'mock-google-client-secret',
    },
  },
  plugins: [
    bearer(),
    jwt(),
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        console.log(`[Better Auth OTP] Code for ${email} (${type}): ${otp}`);
      },
    }),
  ],
});
