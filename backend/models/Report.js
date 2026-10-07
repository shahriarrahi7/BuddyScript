const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    reporter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    targetType: {
        type: String,
        enum: ['Post', 'Comment', 'Reply'],
        required: true
    },
    reason: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    status: {
        type: String,
        enum: ['Pending', 'Reviewed', 'Resolved', 'Dismissed'],
        default: 'Pending'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Report', reportSchema);
