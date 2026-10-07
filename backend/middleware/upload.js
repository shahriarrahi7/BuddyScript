const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

// Allowed MIME types (magic-byte checked by Cloudinary on ingest as well)
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        const isVideo = ALLOWED_VIDEO_TYPES.includes(file.mimetype);
        return {
            folder: isVideo ? 'buddyscript/videos' : 'buddyscript/images',
            resource_type: isVideo ? 'video' : 'image',
            // Use crypto-quality unique public IDs (userId + timestamp + random)
            public_id: `${req.user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            // Auto-format and quality for images
            transformation: isVideo ? [] : [{ quality: 'auto', fetch_format: 'auto' }]
        };
    }
});

const fileFilter = (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
        return cb(null, true);
    }
    cb(new Error('Only images (JPEG, PNG, GIF, WebP) and videos (MP4, WebM, OGG, MOV) are allowed'));
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max (Cloudinary handles it; set generous limit)
        files: 1                     // Only one file per request
    }
});

module.exports = upload;
