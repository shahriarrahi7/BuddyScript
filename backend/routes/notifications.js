const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');
const User = require('../models/User'); // Register User model
const Post = require('../models/Post'); // Register Post model

// @route   GET /api/notifications
// @desc    Get all notifications for current user
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Unauthorized, user ID missing' });
        }
        
        // Use explicit model references in populate just in case models aren't auto-detected
        const notifications = await Notification.find({ recipient: req.user.id })
            .populate({ path: 'sender', select: 'firstName lastName avatarUrl', model: 'User' })
            .populate({ path: 'post', select: 'content', model: 'Post' })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
            
        res.json(notifications);
    } catch (err) {
        // Detailed error logging on the console
        console.error('--- NOTIFICATION FETCH ERROR ---');
        console.error('User ID:', req.user?.id);
        console.error('Stack:', err.stack);
        console.error('--------------------------------');
        res.status(500).json({ message: 'Server error fetching notifications', details: err.message });
    }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark a notification as read
// @access  Private
router.put('/:id/read', auth, async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (!notification) return res.status(404).json({ message: 'Notification not found' });
        
        if (notification.recipient.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        notification.isRead = true;
        await notification.save();
        res.json(notification);
    } catch (err) {
        console.error('[Mark Read]', err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all', auth, async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user.id, isRead: false },
            { $set: { isRead: true } }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        console.error('[Mark All Read]', err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
