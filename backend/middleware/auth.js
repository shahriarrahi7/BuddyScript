const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
    let token = req.cookies?.token;

    // Fallback for transition
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        // Distinguish expired tokens from tampered tokens for better UX
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Session expired, please log in again', code: 'TOKEN_EXPIRED' });
        }
        res.status(401).json({ message: 'Token is not valid', code: 'TOKEN_INVALID' });
    }
};
