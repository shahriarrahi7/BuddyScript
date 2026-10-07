const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const Notification = require('./models/Notification');

async function checkLastNotification() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const last = await Notification.findOne().sort({ createdAt: -1 }).populate('sender', 'firstName').populate('recipient', 'firstName');
        console.log('Last notification Type:', last.type);
        console.log('Last notification Sender:', last.sender.firstName);
        console.log('Last notification Recipient:', last.recipient.firstName);
        console.log('ID:', last._id);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkLastNotification();
