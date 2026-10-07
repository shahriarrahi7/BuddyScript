const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: [5000, 'Post content must be 5000 characters or less']
    },
    mediaUrl: {
        type: String,
        default: ''
    },
    mediaType: {
        type: String,
        enum: ['image', 'video', ''],
        default: ''
    },
    visibility: {
        type: String,
        enum: ['public', 'private'],
        default: 'public',
        index: true
    },
    sharedFrom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        index: true
    },
    // Denormalized counts for scale (millions of engagegments)
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
    commentCount: {
        type: Number,
        default: 0
    },
    shareCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Primary feed query: public posts sorted by newest (cursor-ready)
postSchema.index({ visibility: 1, createdAt: -1 });

// Author's own posts (profile page, private posts filter)
postSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);
