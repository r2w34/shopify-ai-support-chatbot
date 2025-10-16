# 📟 CLI Commands Reference - AI Support Chatbot

Complete reference for all development, deployment, and maintenance commands.

---

## 🚀 Development Commands

### Start Development Server
```bash
# Start the app with Shopify CLI (includes tunneling)
npm run dev

# Alternative: Direct Remix dev server
npm run dev:server

# Start with specific port
PORT=3000 npm run dev
```

### Build Application
```bash
# Production build
npm run build

# Build and start production server
npm run build && npm start
```

### Code Quality
```bash
# Run ESLint
npm run lint

# Fix auto-fixable lint issues
npm run lint -- --fix

# Run Prettier
npx prettier --write "**/*.{ts,tsx,js,jsx,json,md}"
```

---

## 🗄️ Database Commands

### Prisma Commands
```bash
# Initialize Prisma
npx prisma init

# Generate Prisma Client
npx prisma generate

# Push schema changes to database (dev)
npm run db:push

# Create migration
npm run db:migrate
# OR
npx prisma migrate dev --name your_migration_name

# Run migrations (production)
npm run setup
# OR
npx prisma migrate deploy

# Open Prisma Studio (database GUI)
npx prisma studio

# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# Seed database
npx prisma db seed
```

### Database Management
```bash
# Backup database
cp prisma/dev.sqlite prisma/backup-$(date +%Y%m%d).sqlite

# Restore database
cp prisma/backup-20251016.sqlite prisma/dev.sqlite

# View database schema
npx prisma db pull
```

---

## 🔧 Shopify CLI Commands

### App Management
```bash
# Link local code to existing app
npm run config:link

# Use specific app configuration
npm run config:use

# View current environment
npm run env

# Generate new extension
npm run generate
```

### Extension Generation
```bash
# Generate theme extension
shopify app generate extension --type theme-app-extension --name chat-widget

# Generate checkout UI extension
shopify app generate extension --type checkout-ui --name checkout-upsell

# Generate function
shopify app generate extension --type function --name discount-function

# Generate web pixel
shopify app generate extension --type web-pixel --name analytics-pixel
```

### Deployment
```bash
# Deploy app and all extensions
npm run deploy

# Deploy specific version
shopify app deploy --version=1.0.0

# Deploy without confirmation
shopify app deploy --force

# Deploy to specific environment
shopify app deploy --environment=production
```

### Webhook Management
```bash
# Trigger webhook for testing
shopify app webhook trigger --topic=orders/create

# Available webhook topics
shopify app webhook trigger --help

# Test compliance webhooks
shopify app webhook trigger --topic=customers/data_request
shopify app webhook trigger --topic=customers/redact
shopify app webhook trigger --topic=shop/redact
```

### App Information
```bash
# View app information
shopify app info

# View app versions
shopify app versions

# View app configuration
cat shopify.app.toml
```

---

## 🧪 Testing Commands

### Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- path/to/test.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="AI Service"
```

### Integration Tests
```bash
# Test Shopify API integration
npm run test:integration

# Test webhooks
npm run test:webhooks

# Test billing
npm run test:billing
```

### Load Testing
```bash
# Using Artillery (install: npm i -g artillery)
artillery quick --count 100 --num 10 http://localhost:3000

# Custom load test
artillery run load-test.yml
```

---

## 📦 Package Management

### Install Dependencies
```bash
# Install all dependencies
npm install

# Install specific package
npm install package-name

# Install dev dependency
npm install -D package-name

# Install specific version
npm install package-name@1.2.3

# Update dependencies
npm update

# Check for outdated packages
npm outdated

# Audit security vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

### Clean Installation
```bash
# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear npm cache
npm cache clean --force
```

---

## 🚢 Deployment Commands

### Heroku Deployment
```bash
# Login to Heroku
heroku login

# Create Heroku app
heroku create your-app-name

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set SHOPIFY_API_KEY=your_key
heroku config:set SHOPIFY_API_SECRET=your_secret
heroku config:set OPENAI_API_KEY=your_openai_key

# Deploy
git push heroku main

# Run migrations
heroku run npm run setup

# View logs
heroku logs --tail

# Open app
heroku open
```

### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod

# View logs
vercel logs

# Set environment variables
vercel env add SHOPIFY_API_KEY
```

### Docker Deployment
```bash
# Build Docker image
docker build -t ai-support-chatbot .

# Run container
docker run -p 3000:3000 ai-support-chatbot

# Run with environment file
docker run --env-file .env -p 3000:3000 ai-support-chatbot

# Docker Compose
docker-compose up

# Stop containers
docker-compose down
```

---

## 🔍 Debugging Commands

### View Logs
```bash
# View application logs
npm run dev 2>&1 | tee logs/app.log

# View specific log file
tail -f logs/app.log

# Follow logs in real-time
tail -f logs/app.log | grep ERROR

# Search logs
grep "ERROR" logs/app.log
```

### Inspect Application
```bash
# Node.js inspector
node --inspect ./build/server/index.js

# Debug with breakpoints
node --inspect-brk ./build/server/index.js

# Memory profiling
node --inspect --max-old-space-size=4096 ./build/server/index.js
```

### Database Debugging
```bash
# Open SQLite database
sqlite3 prisma/dev.sqlite

# Query database
sqlite3 prisma/dev.sqlite "SELECT * FROM Store LIMIT 10;"

# Check database size
du -h prisma/dev.sqlite
```

---

## 📊 Analytics & Monitoring

### Performance Monitoring
```bash
# Analyze bundle size
npx vite-bundle-visualizer

# Check build performance
npm run build -- --profile

# Memory usage
node --trace-gc ./build/server/index.js
```

### API Testing
```bash
# Test API endpoint with curl
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello", "sessionId":"test"}'

# Test with authentication
curl -X GET http://localhost:3000/api/orders/12345 \
  -H "Authorization: Bearer your_token"

# Test webhooks locally
curl -X POST http://localhost:3000/webhooks/orders/create \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Topic: orders/create" \
  -H "X-Shopify-Shop-Domain: your-store.myshopify.com" \
  -d @test/fixtures/order-payload.json
```

---

## 🔐 Security Commands

### Generate Secrets
```bash
# Generate random secret
openssl rand -base64 32

# Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate ENCRYPTION_KEY
openssl rand -hex 32
```

### SSL/TLS
```bash
# Generate self-signed certificate (development)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Check SSL certificate
openssl s_client -connect yourdomain.com:443
```

### Security Audits
```bash
# npm audit
npm audit

# Snyk security scan
npx snyk test

# OWASP dependency check
npx audit-ci --moderate
```

---

## 🧹 Maintenance Commands

### Clean Up
```bash
# Clean build artifacts
rm -rf build/ .cache/ public/build/

# Clean dependencies
rm -rf node_modules/

# Clean all (nuclear option)
npm run clean:all
# OR
rm -rf node_modules build .cache public/build prisma/dev.sqlite
```

### Backup & Restore
```bash
# Backup database
npm run db:backup

# Backup environment
cp .env .env.backup

# Create deployment snapshot
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

---

## 📚 Documentation Commands

### Generate Documentation
```bash
# TypeDoc (API documentation)
npx typedoc --out docs/api src/

# GraphQL schema documentation
npx graphql-markdown-doc --schema=schema.graphql --output=docs/api.md
```

### View Documentation
```bash
# Serve docs locally
npx http-server docs/ -p 8080
```

---

## 🔄 Git Commands

### Version Control
```bash
# Initialize git (if not already)
git init

# Add all files
git add .

# Commit changes
git commit -m "feat: add AI chat service"

# Push to remote
git push origin main

# Create feature branch
git checkout -b feature/new-feature

# Merge branch
git checkout main
git merge feature/new-feature

# Tag release
git tag -a v1.0.0 -m "Version 1.0.0"
git push --tags
```

### Conventional Commits
```bash
# Feature
git commit -m "feat: add product recommendations"

# Bug fix
git commit -m "fix: resolve order tracking issue"

# Documentation
git commit -m "docs: update README"

# Refactor
git commit -m "refactor: improve AI service performance"

# Test
git commit -m "test: add billing service tests"
```

---

## 💡 Helpful Shortcuts

### Create Aliases
Add to your `.bashrc` or `.zshrc`:

```bash
# Development
alias dev="npm run dev"
alias build="npm run build"

# Database
alias dbpush="npm run db:push"
alias dbstudio="npx prisma studio"

# Testing
alias test="npm test"
alias lint="npm run lint"

# Deployment
alias deploy="npm run deploy"
alias logs="heroku logs --tail"

# Shortcuts
alias gs="git status"
alias gp="git push"
alias gc="git commit -m"
```

---

## 🆘 Common Issues & Solutions

### Issue: Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

### Issue: Database Lock
```bash
# Reset database connections
pkill -f prisma

# Or restart SQLite
rm prisma/dev.sqlite-journal
```

### Issue: Out of Memory
```bash
# Increase Node memory
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### Issue: Module Not Found
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json .cache
npm install
```

---

## 📞 Getting Help

### Documentation
```bash
# Shopify CLI help
shopify help

# npm script help
npm run

# Prisma help
npx prisma --help

# Node.js version
node --version

# npm version
npm --version
```

### Check Versions
```bash
# All versions
node --version && npm --version && shopify version

# Package versions
npm list --depth=0
```

---

**Last Updated**: 2025-10-16  
**Version**: 1.0.0
