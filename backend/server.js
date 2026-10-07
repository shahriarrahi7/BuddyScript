require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const Redis = require('ioredis');
const RedisMock = require('ioredis-mock');
const cookieParser = require('cookie-parser');
const { createAdapter } = require('@socket.io/redis-adapter');

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const notificationRoutes = require('./routes/notifications');
const reportRoutes = require('./routes/reports');

const app = express();
const server = http.createServer(app);

// ─── Trust Proxy (Critical for Secure Cookies behind Vercel/Render) ───────────
app.set('trust proxy', 1);

// ─── Socket.io Initialization ──────────────────────────────────────────────
const io = socketIo(server, {
    cors: {
        origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',').map(o => o.trim()) : 'http://localhost:5173',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
    }
});

// Attach io to app for use in routes
app.set('io', io);

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    socket.on('join_post', (postId) => {
        socket.join('post:' + postId);
    });

    socket.on('leave_post', (postId) => {
        socket.leave('post:' + postId);
    });

    socket.on('join_user', (userId) => {
        socket.join('user:' + userId);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// ─── Redis Setup (Configurable/Mock) ────────────────────────────────────────
let redis;
let pubClient, subClient;

if (process.env.REDIS_URL && process.env.REDIS_URL !== 'mock') {
    redis = new Redis(process.env.REDIS_URL, {
        retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
        }
    });
    redis.on('error', (err) => console.error('Redis error:', err.message));
    redis.on('connect', () => console.log('Connected to Redis'));
    
    pubClient = redis;
    subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
} else {
    console.log('Using Redis Mock for development/local');
    redis = new RedisMock();
    pubClient = redis;
    subClient = redis.createConnectedClient ? redis.createConnectedClient() : redis.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
}
app.set('redis', redis);

// ─── CORS (Must be at the very top for pre-flight requests) ──────────────────
app.use(cors({
    origin: (origin, callback) => {
        // In development, allow everything
        if (!origin || process.env.NODE_ENV !== 'production') return callback(null, true);
        
        const rawOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',');
        const allowedOrigins = rawOrigins.map(o => o.trim().replace(/\/$/, ''));
        const normalizedOrigin = origin.trim().replace(/\/$/, '');
        
        if (allowedOrigins.includes(normalizedOrigin)) {
            return callback(null, true);
        }
        
        // Debug log for Render console
        console.warn(`[CORS REJECTED] Origin: "${origin}". Allowed: ${allowedOrigins.join(', ')}`);
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true
}));

// ─── Security Headers ───────────────────────────────────────────────────────
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false
}));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Serve uploads folder as static
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── NoSQL Injection Protection ───────────────────────────────────────────────
app.use((req, res, next) => {
    ['body', 'params', 'headers'].forEach((key) => {
        if (req[key]) {
            req[key] = mongoSanitize.sanitize(req[key]);
        }
    });
    if (req.query) { // Sanitize query in-place because req.query setter is removed in Express 5
        mongoSanitize.sanitize(req.query, { replaceWith: '_' });
    }
    next();
});

// ─── Rate Limiter ─────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again later.' }
});
app.use(globalLimiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many authentication attempts.' }
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);

app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'BuddyScript API (Hardened)', socket: io.engine.clientsCount });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    if (err.message && err.message.startsWith('CORS:')) return res.status(403).json({ message: err.message });
    console.error('[Error]', err.message);
    res.status(err.status || 500).json({ message: 'An unexpected error occurred' });
});

// ─── Database ────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
    mongoose.connect(process.env.MONGODB_URI, { maxPoolSize: 10 })
        .then(() => console.log('Connected to MongoDB'))
        .catch(err => {
            console.error('MongoDB connection error:', err);
            process.exit(1);
        });

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
        console.log(`BuddyScript API running on port ${PORT}`);
    });
}

module.exports = { app, server, io };
