import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres@localhost:5433/newtonite_ops?schema=public',
  jwtSecret: process.env.JWT_SECRET || 'super-secret-jwt-key-newtonite-operations-under-pressure-2026',
  nodeEnv: process.env.NODE_ENV || 'development',
};
