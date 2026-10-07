const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
    try {
        const { targetId, targetType, reason } = req.body;
        
        if (!targetId || !targetType || !reason) {
            return res.status(400).json({ message: 'Missing report fields' });
        }

        const report = new Report({
            reporter: req.user.id,
            targetId,
            targetType,
            reason: reason.trim()
        });

        await report.save();
        res.status(201).json({ message: 'Report submitted successfully' });
    } catch (err) {
        console.error('[Create Report]', err.message);
        res.status(500).json({ message: 'Failed to submit report' });
    }
});

module.exports = router;
