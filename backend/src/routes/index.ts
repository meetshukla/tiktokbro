import { Router } from 'express';
import planRoutes from './plan.routes';
import imageRoutes from './image.routes';

const router = Router();

router.use('/generate-plan', planRoutes);
router.use('/generate-image', imageRoutes);

// Health check
router.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
