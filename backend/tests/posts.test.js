const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../server');
const Post = require('../models/Post');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

let mongoServer;
let token;
let userId;

beforeAll(async () => {
    // 1. Setup Memory Mongo
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.disconnect(); // Disconnect existing just in case
    await mongoose.connect(uri);

    // 2. Clear Database
    await User.deleteMany({});
    await Post.deleteMany({});

    // 3. Create dummy user & token
    const user = new User({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'password123'
    });
    await user.save();
    userId = user._id;
    token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Posts API Integration Tests (Hardened)', () => {
    
    it('should return empty feed for new user', async () => {
        const res = await request(app)
            .get('/api/posts')
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.status).toBe(200);
        expect(res.body.posts).toHaveLength(0);
        expect(res.body.pagination.hasMore).toBe(false);
    });

    it('should create a new post successfully', async () => {
        const res = await request(app)
            .post('/api/posts')
            .set('Authorization', `Bearer ${token}`)
            .send({ content: 'Integration test post' });

        expect(res.status).toBe(201);
        expect(res.body.content).toBe('Integration test post');
        expect(res.body.likeCount).toBe(0);
    });

    it('should like a post and increment likeCount', async () => {
        const post = await Post.findOne();
        const res = await request(app)
            .put(`/api/posts/${post._id}/like`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.likeCount).toBe(1);
        expect(res.body.isLiked).toBe(true);
    });

    it('should toggle like (unlike)', async () => {
        const post = await Post.findOne();
        const res = await request(app)
            .put(`/api/posts/${post._id}/like`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.likeCount).toBe(0);
        expect(res.body.isLiked).toBe(false);
    });

    it('should handle cursor-based pagination', async () => {
        // Create 15 more posts
        for (let i = 1; i <= 15; i++) {
            await new Post({ content: `Post ${i}`, user: userId }).save();
        }

        // Fetch first page (10)
        const res1 = await request(app)
            .get('/api/posts')
            .set('Authorization', `Bearer ${token}`)
            .query({ limit: 10 });

        expect(res1.body.posts).toHaveLength(10);
        expect(res1.body.pagination.hasMore).toBe(true);
        expect(res1.body.pagination.nextCursor).toBeDefined();

        // Fetch second page
        const res2 = await request(app)
            .get('/api/posts')
            .set('Authorization', `Bearer ${token}`)
            .query({ limit: 10, cursor: res1.body.pagination.nextCursor });

        expect(res2.body.posts.length).toBeGreaterThan(0);
    });
});
