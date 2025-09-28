# BrokerConnect Backend

Backend API for BrokerConnect - Uganda's premier real estate platform.

## Features

- User authentication and authorization
- Property management
- Booking system
- Real-time messaging
- Review and rating system
- Admin panel functionality

## Tech Stack

- Node.js
- Express.js
- MySQL
- JWT Authentication
- Socket.io
- Multer for file uploads

## Environment Variables

Create a `.env` file with:

```
PORT=3001
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=brokerconnect
JWT_SECRET=your_jwt_secret
NODE_ENV=production
```

## Installation

```bash
npm install
```

## Database Setup

```bash
npm run init-db
npm run init-users
npm run init-properties
npm run init-bookings
npm run init-messages
npm run init-reviews
```

## Running

```bash
npm start
```

## API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/properties` - Get properties
- `POST /api/properties` - Create property
- `GET /api/bookings` - Get bookings
- `POST /api/bookings` - Create booking
- `GET /api/messages/:userId` - Get messages
- `POST /api/messages` - Send message
- `POST /api/reviews` - Submit review