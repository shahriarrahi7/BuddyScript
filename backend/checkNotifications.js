const mongoose = require('mongoose');
require('dotenv').config();
const Notification = require('./models/Notification');

async function checkNotifications() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');
        const count = await Notification.countDocuments();
        console.log('Total notifications:', count);
        const last = await Notification.findOne().sort({ createdAt: -1 }).populate('sender', 'firstName').populate('recipient', 'firstName');
        console.log('Last notification:', last);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkNotifications();
