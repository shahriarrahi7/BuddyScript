const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const Post = require('./models/Post');
const Notification = require('./models/Notification');

async function checkNotifications() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');
        const count = await Notification.countDocuments();
        console.log('Total notifications:', count);
        if (count > 0) {
            const all = await Notification.find().populate('sender', 'firstName').populate('recipient', 'firstName').limit(5);
            console.log('Notifications:', JSON.stringify(all, null, 2));
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkNotifications();
