require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const checkCount = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to:', process.env.MONGODB_URI.split('@')[1]); // Log host part only
        const count = await User.countDocuments();
        console.log('Total users in database:', count);
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkCount();
