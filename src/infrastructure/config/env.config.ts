import dotenv from 'dotenv';

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Variable de entorno requerida: ${key}`);
  return value;
}

export const envConfig = {
  app: {
    port: parseInt(process.env.PORT ?? '3000'),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    frontendUrl: requireEnv('FRONTEND_URL'),
  },

  database: {
    host: requireEnv('DB_HOST'),
    port: parseInt(process.env.DB_PORT ?? '5432'),
    user: requireEnv('DB_USER'),
    password: requireEnv('DB_PASSWORD'),
    name: requireEnv('DB_NAME'),
  },

  accessToken: {
    secret: requireEnv('ACCESS_TOKEN_SECRET'),
    expiry: process.env.ACCESS_TOKEN_EXPIRY ?? '15m',
  },

  refreshToken: {
    secret: requireEnv('JWT_REFRESH_SECRET'),
    expiry: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },

  temporaryToken: {
    secret: requireEnv('TEMPORARY_TOKEN_SECRET'),
    expiration: parseInt(process.env.TEMPORARY_TOKEN_EXPIRATION ?? '600'),
  },

  otp: {
    secret: requireEnv('OTP_SECRET'),
  },

  cloudinary: {
    cloudName: requireEnv('CLOUDINARY_CLOUD_NAME'),
    apiKey: requireEnv('CLOUDINARY_API_KEY'),
    apiSecret: requireEnv('CLOUDINARY_API_SECRET'),
  },

  mailer: {
    service: requireEnv('MAILER_SERVICE'),
    email: requireEnv('MAILER_EMAIL'),
    port: parseInt(process.env.MAILER_PORT ?? '2525'),
    user: requireEnv('MAILER_USER'),
    password: requireEnv('MAILER_PASSWORD'),
  },
};
