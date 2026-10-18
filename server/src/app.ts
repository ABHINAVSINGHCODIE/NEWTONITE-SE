import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/authRoutes';
import { itemRouter } from './routes/itemRoutes';
import { errorHandler } from './middleware/errorHandler';

export const app = express();

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount API routes
app.use('/api/auth', authRouter);
app.use('/api/items', itemRouter);

// Global Error Handler
app.use(errorHandler);

export default app;
