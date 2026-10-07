const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    targetType: {
        type: String,
        required: true,
        enum: ['Post', 'Comment', 'Reply'],
        index: true
    },
    type: {
        type: String,
        enum: ['like', 'love', 'haha', 'care', 'angry'],
        default: 'like',
        index: true
    }
}, { timestamps: true });

// Ensure a user can only like a target once
likeSchema.index({ user: 1, targetId: 1, targetType: 1 }, { unique: true });

module.exports = mongoose.model('Like', likeSchema);
