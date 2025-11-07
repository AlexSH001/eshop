# Setup Guide for eshop

## 🚨 Critical Issues to Fix

### 1. Environment Configuration

Create these environment files:

**Frontend (.env.local):**
```bash
# Create file: frontend/.env.local
NEXT_PUBLIC_API_URL=https://fortunewhisper.com/backend/api
NEXT_PUBLIC_APP_NAME=eshop
NEXT_PUBLIC_APP_URL=https://fortunewhisper.com
```

**Backend (.env):**
```bash
# Create file: backend/.env
NODE_ENV=development
PORT=3001
FRONTEND_URL=https://fortunewhisper.com

# Database
DB_PATH=./data/store.db

# JWT Secrets (CHANGE THESE IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production

# JWT Expiration (in seconds)
JWT_EXPIRES_IN=3600
JWT_REFRESH_EXPIRES_IN=604800

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX_REQUESTS=5
```

### 2. Install Missing Dependencies

Run these commands in the respective directories:

**Frontend:**
```bash
cd frontend
npm install @types/node
```

**Backend:**
```bash
cd backend
npm install
```

### 3. Initialize Database

```bash
cd backend
npm run migrate
npm run seed
```

### 4. Start the Applications

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## 🔧 Additional Improvements Needed

### 1. API Service Layer
The frontend now has basic API integration, but you should create a proper service layer:

- Create `src/lib/api.ts` with centralized API functions
- Add proper error handling and retry logic
- Implement token refresh mechanism

### 2. Type Safety
- Add proper TypeScript interfaces for API responses
- Create shared types between frontend and backend
- Add runtime type validation with Zod

### 3. State Management
- Consider using React Query or SWR for server state
- Implement optimistic updates for better UX
- Add proper loading and error states

### 4. Security
- Implement proper CORS configuration
- Add CSRF protection
- Use environment variables for all secrets
- Add input sanitization

### 5. Performance
- Add caching strategies
- Implement pagination for large datasets
- Add image optimization
- Use React.memo for expensive components

### 6. Testing
- Add unit tests for components
- Add integration tests for API endpoints
- Add E2E tests for critical user flows

## 🎯 Next Steps

1. **Fix Environment Setup** - Create the .env files above
2. **Start Backend** - Run the database migrations and start the server
3. **Test API Integration** - Verify login/register works with real backend
4. **Add Error Handling** - Implement proper error boundaries and user feedback
5. **Improve UX** - Add loading states and better error messages
6. **Add Features** - Implement remaining functionality like checkout, payments, etc.

## 🐛 Common Issues

### CORS Errors
If you get CORS errors, make sure:
- Backend is running on port 3001
- Frontend is running on port 3000
- CORS configuration in backend matches frontend URL

### Database Errors
If database operations fail:
- Check if `data` directory exists in backend
- Verify DB_PATH in environment variables
- Run migration script again

### Authentication Issues
If login doesn't work:
- Check if backend is running
- Verify JWT secrets are set
- Check browser console for errors
- Ensure API endpoints are correct

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Express.js Documentation](https://expressjs.com/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [JWT.io](https://jwt.io/) for token debugging 