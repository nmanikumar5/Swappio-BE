# Deployment Guide

This guide covers deploying the Swappio Backend to various platforms.

## Prerequisites

- MongoDB database (MongoDB Atlas recommended for production)
- Cloudinary account for image hosting
- Node.js 18+ runtime environment

## Environment Variables

Ensure these are set in your deployment environment:

```env
PORT=5000
NODE_ENV=production
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_secret_key
JWT_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CORS_ORIGIN=https://your-frontend-domain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Deployment Options

### 1. Heroku

1. Install Heroku CLI and login:
```bash
heroku login
```

2. Create a new Heroku app:
```bash
heroku create swappio-backend
```

3. Add MongoDB addon (or use MongoDB Atlas):
```bash
heroku addons:create mongolab:sandbox
```

4. Set environment variables:
```bash
heroku config:set JWT_SECRET=your_secret_here
heroku config:set CLOUDINARY_CLOUD_NAME=your_cloud_name
heroku config:set CLOUDINARY_API_KEY=your_api_key
heroku config:set CLOUDINARY_API_SECRET=your_api_secret
heroku config:set CORS_ORIGIN=https://your-frontend.com
```

5. Deploy:
```bash
git push heroku main
```

6. Scale the dyno:
```bash
heroku ps:scale web=1
```

### 2. DigitalOcean App Platform

1. Connect your GitHub repository

2. Configure the app:
   - **Environment**: Node.js
   - **Build Command**: `npm run build`
   - **Run Command**: `npm start`
   - **HTTP Port**: 5000

3. Add environment variables in the dashboard

4. Deploy from the dashboard

### 3. AWS EC2

1. Launch an EC2 instance (Ubuntu 22.04 LTS recommended)

2. SSH into the instance:
```bash
ssh -i your-key.pem ubuntu@your-instance-ip
```

3. Install Node.js and npm:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

4. Install PM2 for process management:
```bash
sudo npm install -g pm2
```

5. Clone your repository:
```bash
git clone https://github.com/yourusername/swappio-be.git
cd swappio-be
```

6. Install dependencies and build:
```bash
npm install
npm run build
```

7. Create `.env` file with production variables

8. Start with PM2:
```bash
pm2 start dist/app.js --name swappio-backend
pm2 startup
pm2 save
```

9. Set up Nginx as reverse proxy:
```bash
sudo apt install nginx
```

Create Nginx config (`/etc/nginx/sites-available/swappio`):
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/swappio /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

10. Set up SSL with Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 4. Railway

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login:
```bash
railway login
```

3. Initialize project:
```bash
railway init
```

4. Add MongoDB plugin:
```bash
railway add -p mongodb
```

5. Set environment variables:
```bash
railway variables set JWT_SECRET=your_secret
railway variables set CLOUDINARY_CLOUD_NAME=your_cloud_name
# ... add other variables
```

6. Deploy:
```bash
railway up
```

### 5. Render

1. Connect your GitHub repository to Render

2. Create a new Web Service

3. Configure:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node

4. Add environment variables in the dashboard

5. Deploy

## MongoDB Setup (MongoDB Atlas)

1. Create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)

2. Create a database user

3. Whitelist IP addresses (0.0.0.0/0 for all IPs, or specific IPs)

4. Get connection string and add to environment variables:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/swappio?retryWrites=true&w=majority
```

## Cloudinary Setup

1. Sign up at [cloudinary.com](https://cloudinary.com)

2. Get your credentials from the dashboard:
   - Cloud Name
   - API Key
   - API Secret

3. Add to environment variables

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `JWT_SECRET` (generate with: `openssl rand -base64 32`)
- [ ] Configure CORS origin to your frontend domain
- [ ] Set up MongoDB with proper authentication
- [ ] Enable MongoDB Atlas IP whitelist
- [ ] Set up SSL/HTTPS (Let's Encrypt)
- [ ] Configure rate limiting appropriately
- [ ] Set up monitoring (PM2, New Relic, DataDog, etc.)
- [ ] Configure logging (Morgan, Winston)
- [ ] Set up backup strategy for database
- [ ] Configure error tracking (Sentry)
- [ ] Enable security headers (already using Helmet)
- [ ] Test all API endpoints
- [ ] Document API changes
- [ ] Set up CI/CD pipeline

## Monitoring

### PM2 Monitoring (if using PM2)

```bash
# Monitor processes
pm2 monit

# View logs
pm2 logs swappio-backend

# Restart
pm2 restart swappio-backend

# Stop
pm2 stop swappio-backend
```

### Health Checks

Set up health check endpoints:
- Endpoint: `GET /health`
- Expected: `200 OK`

Configure your platform to ping this endpoint regularly.

## Scaling

### Horizontal Scaling

For high traffic, deploy multiple instances behind a load balancer:

1. Set up load balancer (AWS ALB, DigitalOcean Load Balancer, etc.)
2. Deploy multiple instances
3. Configure sticky sessions for Socket.io
4. Use Redis for session storage (if needed)

### Redis for Socket.io (Optional)

For multiple instances with Socket.io:

```bash
npm install redis @socket.io/redis-adapter
```

Update `src/config/socket.ts`:
```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Check MONGODB_URI format
   - Verify IP whitelist in MongoDB Atlas
   - Check database user credentials

2. **CORS Errors**
   - Verify CORS_ORIGIN matches your frontend domain
   - Include protocol (https://)

3. **Socket.io Not Connecting**
   - Check firewall rules
   - Verify WebSocket support
   - Check CORS configuration

4. **Out of Memory**
   - Increase dyno/instance memory
   - Check for memory leaks
   - Optimize database queries

5. **Rate Limit Issues**
   - Adjust RATE_LIMIT_MAX_REQUESTS
   - Implement per-user rate limiting
   - Use Redis for distributed rate limiting

## Security Best Practices

1. Never commit `.env` files
2. Rotate JWT secrets regularly
3. Use HTTPS in production
4. Keep dependencies updated
5. Implement proper input validation
6. Use parameterized queries (already using Mongoose)
7. Set up Web Application Firewall (WAF)
8. Enable DDoS protection
9. Monitor for suspicious activity
10. Regular security audits

## Backup Strategy

### Database Backups

**MongoDB Atlas** (Recommended):
- Automatic backups enabled by default
- Point-in-time recovery
- Configure backup schedule in Atlas dashboard

**Manual Backups**:
```bash
mongodump --uri="mongodb+srv://username:password@cluster.mongodb.net/swappio"
```

### Code Backups

- Use Git for version control
- Tag releases: `git tag -a v1.0.0 -m "Release v1.0.0"`
- Regular commits to remote repository

## Performance Optimization

1. Enable gzip compression (already configured)
2. Use CDN for static assets
3. Implement caching with Redis
4. Optimize database queries
5. Use database indexes (already configured)
6. Monitor and optimize slow queries
7. Implement API response caching
8. Use connection pooling for MongoDB

## Logging

Add logging middleware:

```bash
npm install morgan winston
```

Update `src/app.ts`:
```typescript
import morgan from 'morgan';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (config.nodeEnv !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));
```

## Support

For issues or questions:
- Create an issue on GitHub
- Check documentation
- Review API examples
