# 🔌 Socket.IO Server - Deployment Guide

Complete guide for deploying and testing the real-time chat functionality.

---

## 📋 Overview

The Socket.IO server enables real-time, bidirectional communication between the chat widget and the backend, providing:
- Instant message delivery
- Typing indicators
- Live product recommendations
- Order tracking updates
- Room-based session management

---

## 🏗️ Architecture

```
┌─────────────────┐
│  Chat Widget    │
│  (Storefront)   │
└────────┬────────┘
         │ WebSocket/Polling
         ↓
┌─────────────────┐
│  Socket.IO      │ ← server.ts
│  Server          │
└────────┬────────┘
         │
         ├→ AI Service (OpenAI)
         ├→ Product Recommendations
         ├→ Order Tracking
         └→ Database (Prisma)
```

---

## 🚀 Local Development

### 1. Prerequisites

```bash
# Ensure all dependencies are installed
npm install

# Set up database
npx prisma generate
npx prisma db push

# Configure environment variables
cp .env.example .env
```

### 2. Required Environment Variables

Add to `.env`:

```env
# Required
OPENAI_API_KEY=sk-your-openai-key
SHOPIFY_API_KEY=your-shopify-api-key
SHOPIFY_API_SECRET=your-shopify-api-secret

# Optional (defaults shown)
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# Database
DATABASE_URL=file:./dev.sqlite

# Security
SESSION_SECRET=your-random-secret-key
ENCRYPTION_KEY=your-encryption-key
```

### 3. Start the Server

#### Option A: With Shopify CLI (Recommended for Shopify development)
```bash
npm run dev
```

This starts:
- Remix development server
- Socket.IO server
- Shopify CLI tunnel

#### Option B: Standalone Server (For testing Socket.IO)
```bash
npm run dev:server
```

This starts:
- Custom server with Socket.IO
- Remix in development mode
- Available at http://localhost:3000

#### Option C: Production Mode
```bash
npm run build
npm start
```

---

## 🧪 Testing Socket.IO

### 1. Check Server Status

```bash
# Health check
curl http://localhost:3000/health

# Socket.IO status
curl http://localhost:3000/socket/status
```

**Expected Response:**
```json
{
  "status": "running",
  "activeConnections": 0,
  "activeSessions": 0
}
```

### 2. Monitor in Admin Dashboard

Navigate to:
```
http://localhost:3000/app/realtime
```

You'll see:
- Active connections count
- Server status
- Uptime
- Real-time feature status

### 3. Test Chat Widget

1. Open storefront (with chat widget installed)
2. Click chat button
3. Send a message
4. Check browser console for Socket.IO logs:
   ```
   🔌 Client connected
   Socket.IO transport: websocket
   ```

### 4. Test Real-Time Features

**Typing Indicator:**
- Start typing in chat input
- Should see "Typing..." indicator

**Message Broadcasting:**
- Open chat in 2 browser tabs
- Send message in one tab
- Should appear instantly in both

**Recommendations:**
- Type "show me products"
- Should see product cards appear

---

## 📊 Monitoring & Debugging

### Server Logs

```bash
# View logs in real-time
npm run dev:server | grep "Socket"

# Or with PM2
pm2 logs ai-chat-server
```

**Expected Logs:**
```
✅ Socket.IO server initialized
✅ Socket.IO event handlers configured
🔌 Client connected: abc123 (Session: xyz789)
💬 Message from abc123: Hello
```

### Debug Mode

Enable verbose logging:

```env
DEBUG=socket.io*
```

Then start server:
```bash
npm run dev:server
```

### Common Issues

#### 1. Socket.IO Not Connecting

**Symptoms:** Widget works but messages slow

**Check:**
```bash
# Test Socket.IO endpoint
curl -v http://localhost:3000/socket.io/
```

**Fix:**
- Ensure server.ts is running (not remix-serve)
- Check CORS configuration
- Verify firewall rules

#### 2. CORS Errors

**Symptoms:** Browser console shows CORS error

**Fix in server.ts:**
```typescript
cors: {
  origin: '*', // Or specific domain
  methods: ['GET', 'POST'],
  credentials: true,
}
```

#### 3. WebSocket Upgrade Failed

**Symptoms:** Falls back to polling

**Check:**
- Reverse proxy configuration (Nginx, etc.)
- Load balancer WebSocket support
- SSL certificate validity

---

## ☁️ Cloud Deployment

### Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create your-app-name

# Add Node.js buildpack
heroku buildpacks:set heroku/nodejs

# Set environment variables
heroku config:set OPENAI_API_KEY=sk-...
heroku config:set SHOPIFY_API_KEY=...
heroku config:set NODE_ENV=production

# Add PostgreSQL (recommended for production)
heroku addons:create heroku-postgresql:mini

# Deploy
git push heroku main

# Open app
heroku open

# View logs
heroku logs --tail
```

**Procfile:**
```
web: npm run start
release: npm run setup
```

### Vercel

**Note:** Vercel has limited WebSocket support. Use serverless functions with polling fallback.

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables
vercel env add OPENAI_API_KEY
```

**vercel.json:**
```json
{
  "builds": [
    { "src": "server.ts", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/socket.io/.*", "dest": "server.ts" },
    { "src": "/(.*)", "dest": "server.ts" }
  ]
}
```

### AWS (EC2 + Load Balancer)

```bash
# SSH into EC2 instance
ssh -i key.pem ubuntu@your-instance-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repository
git clone https://github.com/your-repo/ai-support-chatbot.git
cd ai-support-chatbot

# Install dependencies
npm install

# Set up environment
nano .env
# Add all environment variables

# Build
npm run build

# Install PM2 for process management
npm install -g pm2

# Start with PM2
pm2 start npm --name "ai-chat-server" -- start

# Save PM2 configuration
pm2 save
pm2 startup
```

**Load Balancer Configuration:**
- Enable sticky sessions
- Configure health check: `/health`
- Enable WebSocket support
- Set timeout: 60 seconds

### Docker

**Dockerfile:**
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "start"]
```

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@db:5432/chatbot
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=chatbot
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

**Run:**
```bash
docker-compose up -d
```

---

## 🔒 Production Configuration

### SSL/TLS

Socket.IO supports WSS (WebSocket Secure) automatically when using HTTPS.

```typescript
// server.ts - No changes needed if behind HTTPS proxy
// Socket.IO will use WSS automatically
```

### Nginx Reverse Proxy

```nginx
upstream socket_io {
    ip_hash;  # Sticky sessions
    server localhost:3000;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://socket_io;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Socket.IO specific
        proxy_read_timeout 86400;
        proxy_buffering off;
    }
}
```

### Environment Variables (Production)

```env
NODE_ENV=production
PORT=3000
APP_URL=https://your-domain.com

# Database (PostgreSQL recommended)
DATABASE_URL=postgresql://user:password@host:5432/database

# OpenAI
OPENAI_API_KEY=sk-your-production-key

# Shopify
SHOPIFY_API_KEY=your-key
SHOPIFY_API_SECRET=your-secret

# Security
SESSION_SECRET=long-random-string-production
ENCRYPTION_KEY=another-long-random-string

# Monitoring
SENTRY_DSN=your-sentry-dsn
```

---

## 📈 Performance Optimization

### 1. Redis Adapter (Multi-Server)

For horizontal scaling across multiple servers:

```bash
npm install @socket.io/redis-adapter redis
```

```typescript
// server.ts
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

### 2. Connection Limits

```typescript
// server.ts
const io = new SocketIOServer(httpServer, {
  maxHttpBufferSize: 1e6, // 1 MB
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
});
```

### 3. Rate Limiting

```typescript
// In socket.server.ts
private messageRateLimiter = new Map<string, number[]>();

private checkRateLimit(socketId: string): boolean {
  const now = Date.now();
  const messages = this.messageRateLimiter.get(socketId) || [];
  
  // Keep only messages from last minute
  const recentMessages = messages.filter(time => now - time < 60000);
  
  if (recentMessages.length >= 20) {
    return false; // Rate limited
  }
  
  recentMessages.push(now);
  this.messageRateLimiter.set(socketId, recentMessages);
  return true;
}
```

---

## 🐛 Troubleshooting

### Widget Not Connecting

1. Check server is running:
   ```bash
   curl http://localhost:3000/socket/status
   ```

2. Check browser console for errors

3. Verify CORS settings match your domain

4. Test Socket.IO endpoint directly:
   ```bash
   curl http://localhost:3000/socket.io/?transport=polling
   ```

### Messages Not Appearing

1. Check server logs for errors

2. Verify session ID is valid

3. Check database connection

4. Test AI service separately:
   ```bash
   curl -X POST http://localhost:3000/api/chat/message \
     -H "Content-Type: application/json" \
     -d '{"sessionId":"test","message":"hello"}'
   ```

### High Latency

1. Check network latency

2. Monitor database query performance

3. Check OpenAI API response times

4. Enable Redis adapter for multiple servers

---

## 📚 Additional Resources

- **Socket.IO Documentation**: https://socket.io/docs/
- **Shopify App Development**: https://shopify.dev/docs/apps
- **Remix Documentation**: https://remix.run/docs
- **OpenAI API**: https://platform.openai.com/docs

---

## ✅ Deployment Checklist

Before going live:

- [ ] Environment variables configured
- [ ] Database migrated (PostgreSQL for production)
- [ ] SSL/TLS enabled (HTTPS)
- [ ] CORS configured for your domain
- [ ] Health checks working
- [ ] Monitoring/logging set up
- [ ] Rate limiting enabled
- [ ] Load testing completed
- [ ] Backup strategy in place
- [ ] Error tracking configured (Sentry)
- [ ] Documentation updated

---

**Last Updated:** 2025-10-16  
**Version:** 1.0.0
