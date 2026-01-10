import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import routes from './routes';
import { errorHandler } from './middleware/error-handler';
import { connectDatabase } from './config/database';

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Middleware
app.use(cookieParser());
app.use(
  cors({
    origin: [FRONTEND_URL, 'http://127.0.0.1:3000'],
    credentials: true,
  })
);
app.use(express.json({ limit: '50mb' }));

// Static file serving for reaction library videos/images
app.use('/reactions-library', express.static(path.join(__dirname, '..', 'reactions-library')));

// Routes
app.use('/api', routes);

// Error handler
app.use(errorHandler);

// Connect to database and start server
connectDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
});

