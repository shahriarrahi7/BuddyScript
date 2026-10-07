const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        minlength: [1, 'First name must be at least 1 character'],
        maxlength: [50, 'First name must be 50 characters or less'],
        match: [/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        minlength: [1, 'Last name must be at least 1 character'],
        maxlength: [50, 'Last name must be 50 characters or less'],
        match: [/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        maxlength: [255, 'Email must be 255 characters or less'],
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters']
    },
    bio: {
        type: String,
        default: '',
        maxlength: [300, 'Bio must be 300 characters or less'],
        trim: true
    },
    avatarUrl: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// ─── Hash Password ────────────────────────────────────────────────────────────
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    // Cost factor 12: ~300ms on modern hardware — good for password hashing
    this.password = await bcrypt.hash(this.password, 12);
});

// ─── Compare Password ─────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// ─── Safe User Object ─────────────────────────────────────────────────────────
// Never accidentally expose the password hash
userSchema.methods.toSafeObject = function () {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

module.exports = mongoose.model('User', userSchema);
