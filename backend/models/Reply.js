const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
    comment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
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
        maxlength: [500, 'Reply must be 500 characters or less']
    },
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
    }
}, { timestamps: true });

// Optimized index for fetching replies for a comment
replySchema.index({ comment: 1, createdAt: 1 });

module.exports = mongoose.model('Reply', replySchema);
