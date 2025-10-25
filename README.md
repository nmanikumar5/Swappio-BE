# Swappio Backend

Backend API for Swappio - An OLX-style online exchange platform for buying, selling, and chatting about pre-owned items.

## 🚀 Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT with bcrypt
- **Image Upload**: Cloudinary
- **Real-time Chat**: Socket.io
- **Validation**: Zod
- **Security**: Helmet, CORS, Rate Limiting

## 📁 Project Structure

```
src/
├── models/          # Mongoose schemas
├── routes/          # Express routes
├── controllers/     # Route handlers
├── middleware/      # Custom middleware
├── services/        # Business logic
├── utils/           # Helper functions
├── config/          # Configuration files
└── app.ts          # Main entry point
```

## 🛠️ Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Swappio-BE
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/swappio
JWT_SECRET=your_secret_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CORS_ORIGIN=http://localhost:3000
```

5. Build the project:
```bash
npm run build
```

6. Start the server:

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1234567890",
  "location": "New York"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Get Profile
```http
GET /api/auth/profile
Authorization: Bearer <token>
```

#### Update Profile
```http
PUT /api/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Updated",
  "phone": "+1234567890",
  "location": "San Francisco",
  "photo": "https://cloudinary.com/photo.jpg"
}
```

### Listings

#### Create Listing
```http
POST /api/listings
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "iPhone 12 Pro",
  "description": "Excellent condition, barely used",
  "price": 699,
  "category": "Electronics",
  "location": "New York",
  "images": ["url1", "url2"]
}
```

#### Get All Listings (with filters)
```http
GET /api/listings?category=Electronics&minPrice=100&maxPrice=1000&location=New York&keyword=phone&page=1&limit=20
```

#### Get Single Listing
```http
GET /api/listings/:id
```

#### Update Listing
```http
PUT /api/listings/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "price": 650
}
```

#### Delete Listing
```http
DELETE /api/listings/:id
Authorization: Bearer <token>
```

#### Get My Listings
```http
GET /api/listings/my
Authorization: Bearer <token>
```

### Favorites

#### Add to Favorites
```http
POST /api/favorites
Authorization: Bearer <token>
Content-Type: application/json

{
  "listingId": "listing_id_here"
}
```

#### Get Favorites
```http
GET /api/favorites
Authorization: Bearer <token>
```

#### Remove from Favorites
```http
DELETE /api/favorites/:listingId
Authorization: Bearer <token>
```

### Reports

#### Report Listing
```http
POST /api/reports
Authorization: Bearer <token>
Content-Type: application/json

{
  "listingId": "listing_id_here",
  "reason": "Inappropriate content or spam"
}
```

#### Get All Reports (Admin)
```http
GET /api/reports?status=pending&page=1&limit=20
Authorization: Bearer <admin_token>
```

#### Update Report (Admin)
```http
PUT /api/reports/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "resolved",
  "reviewNote": "Action taken"
}
```

### Messages

#### Send Message
```http
POST /api/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "receiverId": "user_id_here",
  "text": "Hello, is this still available?",
  "listingId": "optional_listing_id"
}
```

#### Get Conversations
```http
GET /api/messages/conversations
Authorization: Bearer <token>
```

#### Get Messages with User
```http
GET /api/messages/:userId?page=1&limit=50
Authorization: Bearer <token>
```

#### Get Unread Count
```http
GET /api/messages/unread/count
Authorization: Bearer <token>
```

### Image Upload

#### Upload Single Image
```http
POST /api/upload/image
Authorization: Bearer <token>
Content-Type: application/json

{
  "image": "base64_image_data_or_url"
}
```

#### Upload Multiple Images
```http
POST /api/upload/images
Authorization: Bearer <token>
Content-Type: application/json

{
  "images": ["image1_data", "image2_data"]
}
```

### Admin Routes

All admin routes require `Authorization: Bearer <admin_token>`

#### Get All Users
```http
GET /api/admin/users?page=1&limit=20&search=john&role=user
```

#### Suspend/Unsuspend User
```http
PUT /api/admin/users/:id/suspend
```

#### Delete User
```http
DELETE /api/admin/users/:id
```

#### Get All Listings
```http
GET /api/admin/listings?status=active&page=1&limit=20
```

#### Approve/Disapprove Listing
```http
PUT /api/admin/listings/:id/approve
```

#### Delete Listing
```http
DELETE /api/admin/listings/:id
```

#### Get Dashboard Analytics
```http
GET /api/admin/dashboard
```

## 🔌 Socket.io Events

### Client to Server

#### Connect
```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

#### Send Message
```javascript
socket.emit('send_message', {
  receiverId: 'user_id',
  text: 'Hello!',
  listingId: 'optional_listing_id'
});
```

#### Typing Indicator
```javascript
socket.emit('typing', { receiverId: 'user_id' });
socket.emit('stop_typing', { receiverId: 'user_id' });
```

#### Mark as Read
```javascript
socket.emit('mark_read', { senderId: 'user_id' });
```

### Server to Client

#### Receive Message
```javascript
socket.on('receive_message', (message) => {
  console.log('New message:', message);
});
```

#### Message Sent Confirmation
```javascript
socket.on('message_sent', (message) => {
  console.log('Message delivered:', message);
});
```

#### User Typing
```javascript
socket.on('user_typing', (data) => {
  console.log('User is typing:', data.userId);
});
```

#### Messages Read
```javascript
socket.on('messages_read', (data) => {
  console.log('Messages read by:', data.readBy);
});
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt for password security
- **CORS**: Configured for frontend integration
- **Helmet**: Security headers
- **Rate Limiting**: Prevent abuse
- **Input Validation**: Zod schemas for request validation
- **Error Handling**: Centralized error management

## 🗄️ Database Indexes

Optimized indexes for fast queries:
- User: email, role
- Listing: ownerId, category, location, price, status, createdAt
- Message: senderId-receiverId, createdAt
- Favorite: userId-listingId (unique compound)
- Report: listingId, reportedBy, status, createdAt

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| PORT | Server port | No (default: 5000) |
| NODE_ENV | Environment (development/production) | No |
| MONGODB_URI | MongoDB connection string | Yes |
| JWT_SECRET | Secret for JWT tokens | Yes |
| JWT_EXPIRES_IN | Token expiration time | No (default: 7d) |
| CLOUDINARY_CLOUD_NAME | Cloudinary cloud name | Yes |
| CLOUDINARY_API_KEY | Cloudinary API key | Yes |
| CLOUDINARY_API_SECRET | Cloudinary API secret | Yes |
| CORS_ORIGIN | Frontend URL | No (default: http://localhost:3000) |

## 🧪 Testing

Currently, no tests are implemented. To add tests:

```bash
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest
```

## 📦 Build

```bash
npm run build
```

Output will be in the `dist/` directory.

## 🚢 Deployment

1. Ensure all environment variables are set
2. Build the project: `npm run build`
3. Start with: `npm start`

For production deployment, consider using:
- PM2 for process management
- MongoDB Atlas for database
- Cloudinary for image hosting
- Heroku/AWS/DigitalOcean for hosting

## 🔗 Frontend Integration

This backend is designed to work with a Next.js frontend. Key integration points:

1. **Base URL**: Configure in frontend env as `NEXT_PUBLIC_API_URL`
2. **Socket.io**: Use socket.io-client with JWT auth
3. **Image Upload**: Send base64 or upload to Cloudinary first
4. **Authentication**: Store JWT in localStorage/cookies
5. **Error Handling**: All responses follow consistent format:

Success:
```json
{
  "success": true,
  "data": {},
  "message": "Optional message"
}
```

Error:
```json
{
  "success": false,
  "message": "Error description"
}
```

## 📄 License

ISC

## 👥 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📧 Support

For issues or questions, please create an issue in the repository.