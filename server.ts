/**
 * Custom Server Entry Point
 * Integrates Socket.IO with Remix/Express server
 */

import { createRequestHandler } from '@remix-run/node';
import { type ServerBuild } from '@remix-run/node';
import { createServer } from 'http';
import express from 'express';
import { socketService } from './app/services/socket.server';

const MODE = process.env.NODE_ENV || 'development';
const IS_DEV = MODE === 'development';
const PORT = process.env.PORT || 3000;

async function start() {
  // Create Express app
  const app = express();

  // Trust proxy for secure cookies
  app.set('trust proxy', 1);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Socket.IO status endpoint
  app.get('/socket/status', (req, res) => {
    res.json({
      status: 'running',
      activeConnections: socketService.getActiveConnections(),
      activeSessions: socketService.getActiveSessions().length,
    });
  });

  // Load Remix build
  let build: ServerBuild;
  
  if (IS_DEV) {
    // In development, reload build on every request
    app.use(async (req, res, next) => {
      try {
        const vite = await import('vite');
        const viteDevServer = await vite.createServer({
          server: { middlewareMode: true },
        });

        app.use(viteDevServer.middlewares);

        return createRequestHandler({
          build: async () => {
            return viteDevServer.ssrLoadModule('virtual:remix/server-build') as Promise<ServerBuild>;
          },
          mode: MODE,
        })(req, res, next);
      } catch (error) {
        console.error('Development server error:', error);
        next(error);
      }
    });
  } else {
    // In production, load build once
    build = await import('./build/server/index.js');
    
    // Serve static assets
    app.use('/assets', express.static('build/client/assets', {
      immutable: true,
      maxAge: '1y',
    }));
    
    app.use(express.static('build/client', {
      maxAge: '1h',
    }));

    // Handle all routes with Remix
    app.all('*', createRequestHandler({
      build,
      mode: MODE,
    }));
  }

  // Create HTTP server
  const httpServer = createServer(app);

  // Initialize Socket.IO
  socketService.initialize(httpServer);

  // Start server
  httpServer.listen(PORT, () => {
    console.log('\n🚀 Server started successfully!');
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`🔌 Socket.IO: Enabled`);
    console.log(`🌍 Environment: ${MODE}`);
    console.log(`⏰ Started at: ${new Date().toISOString()}\n`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    httpServer.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    httpServer.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
