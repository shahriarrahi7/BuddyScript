const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// ─── Validation Rules ─────────────────────────────────────────────────────────
const registerRules = [
    body('firstName')
        .trim()
        .notEmpty().withMessage('First name is required')
        .isLength({ min: 1, max: 50 }).withMessage('First name must be 1–50 characters')
        .matches(/^[a-zA-Z\s'-]+$/).withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),
    body('lastName')
        .trim()
        .notEmpty().withMessage('Last name is required')
        .isLength({ min: 1, max: 50 }).withMessage('Last name must be 1–50 characters')
        .matches(/^[a-zA-Z\s'-]+$/).withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),
    body('email')
        .trim()
        .isEmail().withMessage('Please enter a valid email address')
        .normalizeEmail()
        .isLength({ max: 255 }).withMessage('Email must be 255 characters or less'),
    body('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/\d/).withMessage('Password must contain at least one number')
];

const loginRules = [
    body('email')
        .trim()
        .isEmail().withMessage('Please enter a valid email address')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Password is required')
];

// Helper: format validation errors into a single message
const validate = (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ message: errors.array()[0].msg });
        return false;
    }
    return true;
};

// ─── Register ─────────────────────────────────────────────────────────────────
router.post('/register', registerRules, async (req, res) => {
    if (!validate(req, res)) return;

    try {
        const { firstName, lastName, email, password } = req.body;

        const existing = await User.findOne({ email }).select('_id').lean();
        if (existing) {
            return res.status(409).json({ message: 'An account with this email already exists' });
        }

        const user = await User.create({ firstName, lastName, email, password });

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d', algorithm: 'HS256' }
        );

        const isProd = process.env.NODE_ENV === 'production';
        res.cookie('token', token, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.status(201).json({
            user: { id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email }
        });
    } catch (error) {
        // Duplicate key (race condition — two simultaneous registers)
        if (error.code === 11000) {
            return res.status(409).json({ message: 'An account with this email already exists' });
        }
        console.error('[Register]', error.message);
        res.status(500).json({ message: 'Registration failed, please try again' });
    }
});

// ─── Login ────────────────────────────────────────────────────────────────────
router.post('/login', loginRules, async (req, res) => {
    if (!validate(req, res)) return;

    try {
        const { email, password } = req.body;

        // Use +password to include the normally-excluded field
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            // Constant-time-ish: don't reveal whether the email exists
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d', algorithm: 'HS256' }
        );

        const isDev = process.env.NODE_ENV !== 'production';
        res.cookie('token', token, {
            httpOnly: true,
            secure: !isDev,
            sameSite: isDev ? 'lax' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({
            user: { id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email }
        });
    } catch (error) {
        console.error('[Login]', error.message);
        res.status(500).json({ message: 'Login failed, please try again' });
    }
});

// ─── Get Current User ─────────────────────────────────────────────────────────
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password').lean();
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        console.error('[Me]', error.message);
        res.status(500).json({ message: 'Could not fetch user profile' });
    }
});

// ─── Logout ───────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
});

module.exports = router;
