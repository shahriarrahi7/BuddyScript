const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: true,
        index: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    text: {
        type: String,
        required: true,
        trim: true,
        maxlength: [1000, 'Comment must be 1000 characters or less']
    },
    // Denormalized counts for scale
    likeCount: {
        type: Number,
        default: 0
    },
    reactionCounts: {
        like: { type: Number, default: 0 },
        love: { type: Number, default: 0 },
        haha: { type: Number, default: 0 },
        care: { type: Number, default: 0 },
        angry: { type: Number, default: 0 }
    },
    replyCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Optimized index for fetching comments for a post
commentSchema.index({ post: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', commentSchema);
