# API Usage Examples

This document provides practical examples for using the Swappio Backend API.

## Setup

1. Start the server:
```bash
npm run dev
```

2. The server will run on `http://localhost:5000`

## Authentication Flow

### 1. Register a New User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "phone": "+1234567890",
    "location": "New York"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "65abc123...",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "location": "New York",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "User registered successfully"
}
```

### 2. Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

Save the token from the response for subsequent requests.

### 3. Get Profile (Protected Route)

```bash
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Listing Management

### 1. Create a Listing

```bash
curl -X POST http://localhost:5000/api/listings \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "iPhone 12 Pro Max",
    "description": "128GB, Pacific Blue, excellent condition with original box and accessories",
    "price": 699,
    "category": "Electronics",
    "location": "New York, NY",
    "images": [
      "https://res.cloudinary.com/sample/image1.jpg",
      "https://res.cloudinary.com/sample/image2.jpg"
    ]
  }'
```

### 2. Search Listings with Filters

```bash
# Search by category
curl "http://localhost:5000/api/listings?category=Electronics&page=1&limit=10"

# Search by price range
curl "http://localhost:5000/api/listings?minPrice=500&maxPrice=1000"

# Search by keyword
curl "http://localhost:5000/api/listings?keyword=iphone"

# Search by location
curl "http://localhost:5000/api/listings?location=New York"

# Combined filters
curl "http://localhost:5000/api/listings?category=Electronics&minPrice=500&maxPrice=1000&location=New York&keyword=phone&page=1&limit=20"
```

### 3. Get Single Listing

```bash
curl http://localhost:5000/api/listings/LISTING_ID
```

### 4. Update Listing

```bash
curl -X PUT http://localhost:5000/api/listings/LISTING_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 650,
    "description": "Updated description - price reduced!"
  }'
```

### 5. Get My Listings

```bash
curl -X GET http://localhost:5000/api/listings/my \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Favorites

### 1. Add to Favorites

```bash
curl -X POST http://localhost:5000/api/favorites \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "listingId": "LISTING_ID"
  }'
```

### 2. Get All Favorites

```bash
curl -X GET http://localhost:5000/api/favorites \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3. Remove from Favorites

```bash
curl -X DELETE http://localhost:5000/api/favorites/LISTING_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Messaging

### 1. Send a Message

```bash
curl -X POST http://localhost:5000/api/messages \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "receiverId": "USER_ID",
    "text": "Hi, is this still available?",
    "listingId": "LISTING_ID"
  }'
```

### 2. Get Conversations

```bash
curl -X GET http://localhost:5000/api/messages/conversations \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3. Get Messages with a User

```bash
curl -X GET http://localhost:5000/api/messages/USER_ID?page=1&limit=50 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Get Unread Message Count

```bash
curl -X GET http://localhost:5000/api/messages/unread/count \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Reports

### 1. Report a Listing

```bash
curl -X POST http://localhost:5000/api/reports \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "listingId": "LISTING_ID",
    "reason": "This listing contains inappropriate content"
  }'
```

## Image Upload

### 1. Upload Single Image

```bash
curl -X POST http://localhost:5000/api/upload/image \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/swappio/listings/abc123.jpg"
  },
  "message": "Image uploaded successfully"
}
```

### 2. Upload Multiple Images

```bash
curl -X POST http://localhost:5000/api/upload/images \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "images": [
      "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
      "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    ]
  }'
```

## Admin Endpoints

### 1. Get Dashboard Analytics

```bash
curl -X GET http://localhost:5000/api/admin/dashboard \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### 2. Get All Users

```bash
curl -X GET "http://localhost:5000/api/admin/users?page=1&limit=20&search=john" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### 3. Suspend User

```bash
curl -X PUT http://localhost:5000/api/admin/users/USER_ID/suspend \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### 4. Get All Listings (Admin)

```bash
curl -X GET "http://localhost:5000/api/admin/listings?status=active&page=1&limit=20" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### 5. Approve/Disapprove Listing

```bash
curl -X PUT http://localhost:5000/api/admin/listings/LISTING_ID/approve \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

## Socket.io Chat Example

### JavaScript/TypeScript Client

```javascript
import io from 'socket.io-client';

// Connect with JWT token
const socket = io('http://localhost:5000', {
  auth: {
    token: 'YOUR_JWT_TOKEN'
  }
});

// Connection events
socket.on('connect', () => {
  console.log('Connected to chat server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from chat server');
});

// Send a message
socket.emit('send_message', {
  receiverId: 'user_id_here',
  text: 'Hello!',
  listingId: 'optional_listing_id'
});

// Receive messages
socket.on('receive_message', (message) => {
  console.log('New message:', message);
});

// Message sent confirmation
socket.on('message_sent', (message) => {
  console.log('Message delivered:', message);
});

// Typing indicators
socket.emit('typing', { receiverId: 'user_id' });
socket.emit('stop_typing', { receiverId: 'user_id' });

socket.on('user_typing', (data) => {
  console.log('User is typing:', data.userId);
});

socket.on('user_stop_typing', (data) => {
  console.log('User stopped typing:', data.userId);
});

// Mark messages as read
socket.emit('mark_read', { senderId: 'user_id' });

socket.on('messages_read', (data) => {
  console.log('Messages read by:', data.readBy);
});
```

## Error Handling

All endpoints return errors in a consistent format:

```json
{
  "success": false,
  "message": "Error description here"
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (missing or invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

## Rate Limiting

The API implements rate limiting:
- Window: 15 minutes (900,000 ms)
- Max requests: 100 per window
- Applies to all `/api/*` routes

When rate limit is exceeded:
```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later."
}
```

## Pagination

Paginated endpoints accept:
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20, max: 100)

Response format:
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

## Testing Tips

1. Use Postman Collection: Import `postman_collection.json` for quick testing
2. Environment Variables: Set up `base_url` and `token` variables
3. Health Check: `GET /health` to verify server is running
4. MongoDB: Ensure MongoDB is running locally or update `MONGODB_URI` in `.env`
5. Cloudinary: Add your Cloudinary credentials to `.env` for image uploads

## Next.js Frontend Integration

### Environment Variables (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### API Helper (lib/api.ts)
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const api = {
  async get(endpoint: string, token?: string) {
    const res = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    return res.json();
  },
  
  async post(endpoint: string, data: any, token?: string) {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },
};
```

### Usage in Components
```typescript
// Get listings
const { data } = await api.get('/listings?category=Electronics');

// Create listing (authenticated)
const token = localStorage.getItem('token');
const result = await api.post('/listings', listingData, token);
```
