import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
    credentials: true,
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Import routes
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import teacherRoutes from './routes/teachers';
import roomRoutes from './routes/rooms';
import serviceDistributionRoutes from './routes/service-distributions';

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', teacherRoutes);
app.use('/api', roomRoutes);
app.use('/api', serviceDistributionRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(port, () => {
    console.log(`⚡️ Server is running on port ${port}`);
    console.log(`🔗 Health check: http://localhost:${port}/health`);
});

export default app;
