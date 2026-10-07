const express = require('express');
const router = express.Router();
const { body, validationResult, param } = require('express-validator');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Reply = require('../models/Reply');
const Like = require('../models/Like');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

// ─── Validation Helpers ───────────────────────────────────────────────────────
const validate = (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ message: errors.array()[0].msg });
        return false;
    }
    return true;
};

const isValidObjectId = (id) => /^[a-f\d]{24}$/i.test(id);

// ─── Population helper ────────────────────────────────────────────────────────
// Note: For scale, avoid running this helper on every mutation.
// Instead, mutations return minimal payloads (see below).
const populatePost = (query) => query
    .populate('user', 'firstName lastName avatarUrl')
    .populate({
        path: 'sharedFrom',
        populate: { path: 'user', select: 'firstName lastName avatarUrl' }
    });

// ─── POST /  —  Create Post ───────────────────────────────────────────────────
router.post('/', [
    auth,
    upload.single('media'),
    body('content')
        .trim()
        .isLength({ max: 5000 }).withMessage('Content must be 5000 characters or less')
], async (req, res) => {
    if (!validate(req, res)) return;

    try {
        const { content, visibility } = req.body;

        // Guard: either text or a file must be provided
        if ((!content || !content.trim()) && !req.file) {
            return res.status(400).json({ message: 'Post must have text or a media file' });
        }

        const postData = {
            content: content?.trim() || '',
            user: req.user.id,
            visibility: visibility === 'private' ? 'private' : 'public'
        };

        if (req.file) {
            // Cloudinary returns secure_url on the file object
            postData.mediaUrl  = req.file.path;          // Cloudinary CDN URL
            postData.mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
        }

        const newPost = new Post(postData);
        await newPost.save();

        const post = await populatePost(Post.findById(newPost._id).lean());
        
        // Emit socket event for real-time feed update
        const io = req.app.get('io');
        io.emit('post_created', post);

        res.status(201).json(post);
    } catch (err) {
        console.error('[Create Post]', err.message);
        res.status(500).json({ message: 'Failed to create post' });
    }
});

// ─── GET /  —  Paginated Feed ─────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
    try {
        const limit = Math.min(MAX_PAGE_SIZE, parseInt(req.query.limit) || DEFAULT_PAGE_SIZE);
        const { cursor } = req.query; // cursor should be an _id
        const redis = req.app.get('redis');

        // Logic for caching the first page of the public-only feed
        const cacheKey = `feed:public:limit:${limit}`;
        let cachedData = null;

        if (!cursor) {
            try {
                const data = await redis.get(cacheKey);
                if (data) cachedData = JSON.parse(data);
            } catch (err) {
                console.error('[Redis Cache GET]', err.message);
            }
        }

        let posts;
        if (cachedData) {
            posts = cachedData;
        } else {
            const filter = {
                $or: [{ visibility: 'public' }, { user: req.user.id }]
            };

            if (cursor && isValidObjectId(cursor)) {
                filter._id = { $lt: cursor };
            }

            posts = await populatePost(
                Post.find(filter)
                    .sort({ _id: -1 })
                    .limit(limit + 1)
                    .lean()
            );

            // Cache the first page if it's the general public feed
            if (!cursor && posts.length > 0) {
                try {
                    await redis.set(cacheKey, JSON.stringify(posts), 'EX', 30); // 30s TTL
                } catch (err) {
                    console.error('[Redis Cache SET]', err.message);
                }
            }
        }

        const hasMore = posts.length > limit;
        if (hasMore) posts.pop();

        const postIds = posts.map(p => p._id);
        
        // Fetch current user's likes for these posts (for optimistic-style UI)
        const userLikes = await Like.find({
            user: req.user.id,
            targetId: { $in: postIds },
            targetType: 'Post'
        }).select('targetId').lean();

        const likedMap = new Set(userLikes.map(l => l.targetId.toString()));

        // Fetch top comments count or snippets if needed? 
        // For now, let's keep it simple and just provide the counts (already in Post model).
        // Frontend will fetch comments separately or we can populate a few.

        const responsePosts = posts.map(p => {
            const userLike = userLikes.find(l => l.targetId.toString() === p._id.toString());
            return {
                ...p,
                isLiked: !!userLike,
                reactionType: userLike ? userLike.type : null
            };
        });

        res.json({
            posts: responsePosts,
            pagination: {
                limit,
                nextCursor: hasMore ? responsePosts[responsePosts.length - 1]._id : null,
                hasMore
            }
        });
    } catch (err) {
        console.error('[Get Posts]', err.message);
        res.status(500).json({ message: 'Failed to load posts' });
    }
});

// ─── PUT /:id  —  Edit Post (author only) ───────────────────────────────────
router.put('/:id', [
    auth,
    body('content').trim().isLength({ max: 5000 }).withMessage('Content must be 5000 characters or less')
], async (req, res) => {
    if (!validate(req, res)) return;
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid post ID' });

    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });
        if (post.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

        post.content = req.body.content || '';
        await post.save();

        res.json({ message: 'Post updated', content: post.content });
    } catch (err) {
        console.error('[Edit Post]', err.message);
        res.status(500).json({ message: 'Failed to update post' });
    }
});

// ─── PUT /:id/like  —  Toggle Post Reaction ──────────────────────────────────
router.put('/:id/like', auth, async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: 'Invalid post ID' });
    }

    try {
        const userId = req.user.id;
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const type = req.body.type || 'like';
        const validTypes = ['like', 'love', 'haha', 'care', 'angry'];
        if (!validTypes.includes(type)) return res.status(400).json({ message: 'Invalid reaction type' });

        const existingLike = await Like.findOne({ user: userId, targetId: post._id, targetType: 'Post' });
        
        let isLiked = false;
        let finalType = type;

        if (existingLike) {
            if (existingLike.type === type) {
                // Remove like
                await Like.deleteOne({ _id: existingLike._id });
                post.likeCount = Math.max(0, post.likeCount - 1);
                if (post.reactionCounts[type] > 0) post.reactionCounts[type] -= 1;
                isLiked = false;
                finalType = null;
            } else {
                // Change reaction type
                const oldType = existingLike.type;
                if (post.reactionCounts[oldType] > 0) post.reactionCounts[oldType] -= 1;
                post.reactionCounts[type] = (post.reactionCounts[type] || 0) + 1;
                existingLike.type = type;
                await existingLike.save();
                isLiked = true;
                // likeCount stays the same
            }
        } else {
            // New reaction
            await Like.create({ user: userId, targetId: post._id, targetType: 'Post', type });
            post.likeCount += 1;
            post.reactionCounts[type] = (post.reactionCounts[type] || 0) + 1;
            isLiked = true;

            if (post.user.toString() !== userId) {
                const notification = await Notification.create({
                    recipient: post.user,
                    sender: userId,
                    type: 'like',
                    post: post._id
                });
                req.app.get('io').to('user:' + post.user.toString()).emit('new_notification', notification);
            }
        }

        await post.save();

        const io = req.app.get('io');
        io.to('post:' + post._id.toString()).emit('post_engagement', { 
            type: 'reaction', 
            targetId: post._id, 
            count: post.likeCount,
            reactionCounts: post.reactionCounts
        });

        res.json({ 
            _id: post._id, 
            likeCount: post.likeCount, 
            reactionCounts: post.reactionCounts,
            isLiked, 
            type: finalType 
        });
    } catch (err) {
        console.error('[Like Post]', err.message);
        res.status(500).json({ message: 'Failed to update reaction' });
    }
});

// ─── POST /:id/share — Share Post ───────────────────────────────────────────
router.post('/:id/share', auth, async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: 'Invalid post ID' });
    }

    try {
        const originalPost = await Post.findById(req.params.id);
        if (!originalPost) return res.status(404).json({ message: 'Post not found' });
        
        if (originalPost.visibility !== 'public') {
            return res.status(403).json({ message: 'Private posts cannot be shared' });
        }

        const sharedPost = new Post({
            user: req.user.id,
            content: req.body.content || '',
            sharedFrom: originalPost._id,
            visibility: 'public'
        });

        await sharedPost.save();
        
        // Update share count on original
        originalPost.shareCount += 1;
        await originalPost.save();

        const post = await populatePost(Post.findById(sharedPost._id).lean());
        
        // Emit socket events
        const io = req.app.get('io');
        io.emit('post_created', post);
        io.to('post:' + originalPost._id.toString()).emit('post_engagement', { type: 'share', targetId: originalPost._id, count: originalPost.shareCount });

        // Create notification for original author
        if (originalPost.user.toString() !== req.user.id) {
            const notification = await Notification.create({
                recipient: originalPost.user,
                sender: req.user.id,
                type: 'share',
                post: originalPost._id
            });
            req.app.get('io').to('user:' + originalPost.user.toString()).emit('new_notification', notification);
        }

        res.status(201).json(post);
    } catch (err) {
        console.error('[Share Post]', err.message);
        res.status(500).json({ message: 'Failed to share post' });
    }
});

// ─── POST /:id/comments  —  Add Comment ───────────────────────────────────────
router.post('/:id/comments', [
    auth,
    body('text')
        .trim()
        .notEmpty().withMessage('Comment text is required')
        .isLength({ max: 1000 }).withMessage('Comment must be 1000 characters or less')
], async (req, res) => {
    if (!validate(req, res)) return;
    if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: 'Invalid post ID' });
    }

    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const commentData = { 
            post: post._id, 
            user: req.user.id, 
            text: req.body.text.trim() 
        };
        const comment = await Comment.create(commentData);
        
        // Populate user for the response
        const populatedComment = await Comment.findById(comment._id)
            .populate('user', 'firstName lastName avatarUrl')
            .lean();

        // Increment post comment count
        post.commentCount += 1;
        await post.save();

        // Emit socket events
        const io = req.app.get('io');
        io.to('post:' + post._id.toString()).emit('post_engagement', { type: 'comment', targetId: post._id, count: post.commentCount });
        io.to('post:' + post._id.toString()).emit('comment_added', { postId: post._id, comment: populatedComment });
        
        // Create notification for post author
        if (post.user.toString() !== req.user.id) {
            const notification = await Notification.create({
                recipient: post.user,
                sender: req.user.id,
                type: 'comment',
                post: post._id
            });
            req.app.get('io').to('user:' + post.user.toString()).emit('new_notification', notification);
        }

        res.status(201).json({ _id: post._id, comment: populatedComment });
    } catch (err) {
        console.error('[Add Comment]', err.message);
        res.status(500).json({ message: 'Failed to add comment' });
    }
});

// ─── PUT /:id/comments/:cid  —  Edit Comment (author only) ────────────────────
router.put('/:id/comments/:cid', [
    auth,
    body('text').trim().notEmpty().withMessage('Text is required').isLength({ max: 1000 }).withMessage('Max 1000 chars')
], async (req, res) => {
    if (!validate(req, res)) return;
    if (!isValidObjectId(req.params.id) || !isValidObjectId(req.params.cid)) return res.status(400).json({ message: 'Invalid ID' });

    try {
        const comment = await Comment.findById(req.params.cid);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });
        if (comment.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

        comment.text = req.body.text;
        await comment.save();

        res.json({ message: 'Comment updated', text: comment.text });
    } catch (err) {
        console.error('[Edit Comment]', err.message);
        res.status(500).json({ message: 'Failed to edit comment' });
    }
});

// ─── DELETE /:id/comments/:cid  —  Delete Comment (author only) ───────────────
router.delete('/:id/comments/:cid', auth, async (req, res) => {
    if (!isValidObjectId(req.params.id) || !isValidObjectId(req.params.cid)) return res.status(400).json({ message: 'Invalid ID' });

    try {
        const comment = await Comment.findById(req.params.cid);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });
        if (comment.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

        await Comment.findByIdAndDelete(req.params.cid);
        
        // Decrement post comment count
        await Post.findByIdAndUpdate(req.params.id, { $inc: { commentCount: -1 } });

        // Emit socket event
        const io = req.app.get('io');
        io.to('post:' + req.params.id).emit('comment_deleted', { postId: req.params.id, commentId: req.params.cid });

        res.json({ message: 'Comment deleted', commentId: req.params.cid });
    } catch (err) {
        console.error('[Delete Comment]', err.message);
        res.status(500).json({ message: 'Failed to delete comment' });
    }
});

// ─── PUT /:id/comments/:cid/like  —  Toggle/Change Comment Reaction ──────────
router.put('/:id/comments/:cid/like', auth, async (req, res) => {
    if (!isValidObjectId(req.params.id) || !isValidObjectId(req.params.cid)) {
        return res.status(400).json({ message: 'Invalid ID' });
    }

    const VALID_TYPES = ['like', 'love', 'haha', 'care', 'angry'];
    const { type = 'like' } = req.body;
    if (!VALID_TYPES.includes(type)) return res.status(400).json({ message: 'Invalid reaction type' });

    try {
        const userId = req.user.id;
        const comment = await Comment.findById(req.params.cid);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });

        const existingLike = await Like.findOne({ user: userId, targetId: comment._id, targetType: 'Comment' });
        let isLiked = false;
        let resolvedType = null;

        if (existingLike && existingLike.type === type) {
            // Same reaction — remove it
            await Like.deleteOne({ _id: existingLike._id });
            comment.likeCount = Math.max(0, comment.likeCount - 1);
            comment.reactionCounts[existingLike.type] = Math.max(0, (comment.reactionCounts[existingLike.type] || 0) - 1);
            isLiked = false;
        } else if (existingLike) {
            // Changing reaction type
            const oldType = existingLike.type;
            existingLike.type = type;
            await existingLike.save();
            comment.reactionCounts[oldType] = Math.max(0, (comment.reactionCounts[oldType] || 0) - 1);
            comment.reactionCounts[type] = (comment.reactionCounts[type] || 0) + 1;
            isLiked = true;
            resolvedType = type;
        } else {
            // New reaction
            await Like.create({ user: userId, targetId: comment._id, targetType: 'Comment', type });
            comment.likeCount += 1;
            comment.reactionCounts[type] = (comment.reactionCounts[type] || 0) + 1;
            isLiked = true;
            resolvedType = type;

            if (comment.user.toString() !== userId) {
                const notification = await Notification.create({
                    recipient: comment.user, sender: userId,
                    type: 'comment_like', post: req.params.id
                });
                req.app.get('io').to('user:' + comment.user.toString()).emit('new_notification', notification);
            }
        }

        await comment.save();

        const io = req.app.get('io');
        io.to('post:' + req.params.id).emit('comment_engagement', {
            type: resolvedType || 'unlike',
            postId: req.params.id, commentId: comment._id,
            likeCount: comment.likeCount, reactionCounts: comment.reactionCounts
        });

        res.json({ isLiked, type: resolvedType, likeCount: comment.likeCount, reactionCounts: comment.reactionCounts });
    } catch (err) {
        console.error('[Like Comment]', err.message);
        res.status(500).json({ message: 'Failed to update like' });
    }
});

// ─── POST /:id/comments/:cid/replies  —  Add Reply ───────────────────────────
router.post('/:id/comments/:cid/replies', [
    auth,
    body('text')
        .trim()
        .notEmpty().withMessage('Reply text is required')
        .isLength({ max: 500 }).withMessage('Reply must be 500 characters or less')
], async (req, res) => {
    if (!validate(req, res)) return;
    if (!isValidObjectId(req.params.id) || !isValidObjectId(req.params.cid)) {
        return res.status(400).json({ message: 'Invalid ID' });
    }

    try {
        const comment = await Comment.findById(req.params.cid);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });

        const reply = await Reply.create({
            comment: comment._id,
            user: req.user.id,
            text: req.body.text.trim()
        });

        const populatedReply = await Reply.findById(reply._id)
            .populate('user', 'firstName lastName avatarUrl')
            .lean();

        // Increment comment reply count
        comment.replyCount += 1;
        await comment.save();

        // Emit socket events
        const io = req.app.get('io');
        io.to('post:' + req.params.id).emit('comment_engagement', { type: 'reply', postId: req.params.id, commentId: comment._id, count: comment.replyCount });
        io.to('post:' + req.params.id).emit('reply_added', { postId: req.params.id, commentId: comment._id, reply: populatedReply });

        // Create notification for comment author
        if (comment.user.toString() !== req.user.id) {
            const notification = await Notification.create({
                recipient: comment.user,
                sender: req.user.id,
                type: 'reply',
                post: req.params.id,
                comment: comment._id
            });
            req.app.get('io').to('user:' + comment.user.toString()).emit('new_notification', notification);
        }

        res.status(201).json({ _id: req.params.id, commentId: comment._id, reply: populatedReply });
    } catch (err) {
        console.error('[Add Reply]', err.message);
        res.status(500).json({ message: 'Failed to add reply' });
    }
});

// ─── PUT /:id/comments/:cid/replies/:rid/like  —  Toggle/Change Reply Reaction ─
router.put('/:id/comments/:cid/replies/:rid/like', auth, async (req, res) => {
    const { id, cid, rid } = req.params;
    if (!isValidObjectId(id) || !isValidObjectId(cid) || !isValidObjectId(rid)) {
        return res.status(400).json({ message: 'Invalid ID' });
    }

    const VALID_TYPES = ['like', 'love', 'haha', 'care', 'angry'];
    const { type = 'like' } = req.body;
    if (!VALID_TYPES.includes(type)) return res.status(400).json({ message: 'Invalid reaction type' });

    try {
        const userId = req.user.id;
        const reply = await Reply.findById(rid);
        if (!reply) return res.status(404).json({ message: 'Reply not found' });

        const existingLike = await Like.findOne({ user: userId, targetId: reply._id, targetType: 'Reply' });
        let isLiked = false;
        let resolvedType = null;

        if (existingLike && existingLike.type === type) {
            // Same reaction — remove it
            await Like.deleteOne({ _id: existingLike._id });
            reply.likeCount = Math.max(0, reply.likeCount - 1);
            reply.reactionCounts[existingLike.type] = Math.max(0, (reply.reactionCounts[existingLike.type] || 0) - 1);
            isLiked = false;
        } else if (existingLike) {
            // Changing reaction type
            const oldType = existingLike.type;
            existingLike.type = type;
            await existingLike.save();
            reply.reactionCounts[oldType] = Math.max(0, (reply.reactionCounts[oldType] || 0) - 1);
            reply.reactionCounts[type] = (reply.reactionCounts[type] || 0) + 1;
            isLiked = true;
            resolvedType = type;
        } else {
            // New reaction
            await Like.create({ user: userId, targetId: reply._id, targetType: 'Reply', type });
            reply.likeCount += 1;
            reply.reactionCounts[type] = (reply.reactionCounts[type] || 0) + 1;
            isLiked = true;
            resolvedType = type;
        }

        await reply.save();

        const io = req.app.get('io');
        io.to('post:' + id).emit('reply_engagement', {
            type: resolvedType || 'unlike',
            postId: id, commentId: cid, replyId: rid,
            likeCount: reply.likeCount, reactionCounts: reply.reactionCounts
        });

        res.json({ isLiked, type: resolvedType, likeCount: reply.likeCount, reactionCounts: reply.reactionCounts });
    } catch (err) {
        console.error('[Like Reply]', err.message);
        res.status(500).json({ message: 'Failed to update like' });
    }
});

// ─── PUT /:id/comments/:cid/replies/:rid  —  Edit Reply (author only) ────────
router.put('/:id/comments/:cid/replies/:rid', [
    auth,
    body('text').trim().notEmpty().withMessage('Text is required').isLength({ max: 500 }).withMessage('Max 500 chars')
], async (req, res) => {
    if (!validate(req, res)) return;
    const { id, cid, rid } = req.params;
    if (!isValidObjectId(id) || !isValidObjectId(cid) || !isValidObjectId(rid)) return res.status(400).json({ message: 'Invalid ID' });

    try {
        const reply = await Reply.findById(rid);
        if (!reply) return res.status(404).json({ message: 'Reply not found' });
        if (reply.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

        reply.text = req.body.text;
        await reply.save();

        res.json({ message: 'Reply updated', text: reply.text });
    } catch (err) {
        console.error('[Edit Reply]', err.message);
        res.status(500).json({ message: 'Failed to edit reply' });
    }
});

// ─── DELETE /:id/comments/:cid/replies/:rid  —  Delete Reply (author only) ────
router.delete('/:id/comments/:cid/replies/:rid', auth, async (req, res) => {
    const { id, cid, rid } = req.params;
    if (!isValidObjectId(id) || !isValidObjectId(cid) || !isValidObjectId(rid)) {
        return res.status(400).json({ message: 'Invalid ID' });
    }

    try {
        const reply = await Reply.findById(rid);
        if (!reply) return res.status(404).json({ message: 'Reply not found' });
        if (reply.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

        await Reply.findByIdAndDelete(rid);

        // Decrement comment reply count
        await Comment.findByIdAndUpdate(cid, { $inc: { replyCount: -1 } });

        // Clean up likes on this reply
        await Like.deleteMany({ targetId: rid, targetType: 'Reply' });

        // Emit socket event
        const io = req.app.get('io');
        io.to('post:' + id).emit('reply_deleted', { postId: id, commentId: cid, replyId: rid });

        res.json({ message: 'Reply deleted', replyId: rid });
    } catch (err) {
        console.error('[Delete Reply]', err.message);
        res.status(500).json({ message: 'Failed to delete reply' });
    }
});

// ─── DELETE /:id  —  Delete Post (author only) ────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: 'Invalid post ID' });
    }

    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        if (post.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to delete this post' });
        }

        await Post.findByIdAndDelete(req.params.id);
        
        // Background: Clean up associated engagement (optional O(N) cleanup)
        // For scale, we might let these dangle or use a worker. 
        // For this project, we'll do a quick cleanup.
        await Comment.deleteMany({ post: post._id });
        await Like.deleteMany({ targetId: post._id, targetType: 'Post' });

        // Emit socket event
        const io = req.app.get('io');
        io.emit('post_deleted', post._id);
        io.to('post:' + post._id.toString()).emit('post_deleted', post._id);

        res.json({ message: 'Post deleted', _id: req.params.id });
    } catch (err) {
        console.error('[Delete Post]', err.message);
        res.status(500).json({ message: 'Failed to delete post' });
    }
});

// ─── GET /:id/comments — Fetch Paginated Comments ─────────────────────────────
router.get('/:id/comments', auth, async (req, res) => {
    try {
        const limit = Math.min(50, parseInt(req.query.limit) || 10);
        const { cursor } = req.query;

        const filter = { post: req.params.id };
        if (cursor && isValidObjectId(cursor)) {
            filter._id = { $lt: cursor };
        }

        const comments = await Comment.find(filter)
            .sort({ _id: -1 })
            .limit(limit + 1)
            .populate('user', 'firstName lastName avatarUrl')
            .lean();

        const hasMore = comments.length > limit;
        if (hasMore) comments.pop();

        // Check likes for current user
        const commentIds = comments.map(c => c._id);
        const userLikes = await Like.find({
            user: req.user.id,
            targetId: { $in: commentIds },
            targetType: 'Comment'
        }).select('targetId').lean();

        const likedSet = new Set(userLikes.map(l => l.targetId.toString()));

        const responseComments = comments.map(c => ({
            ...c,
            isLiked: likedSet.has(c._id.toString())
        }));

        res.json({
            comments: responseComments,
            pagination: {
                limit,
                nextCursor: hasMore ? responseComments[responseComments.length - 1]._id : null,
                hasMore
            }
        });
    } catch (err) {
        console.error('[Get Comments]', err.message);
        res.status(500).json({ message: 'Failed to load comments' });
    }
});

// ─── GET /comments/:cid/replies — Fetch Paginated Replies ─────────────────────
router.get('/comments/:cid/replies', auth, async (req, res) => {
    try {
        const limit = Math.min(50, parseInt(req.query.limit) || 10);
        const { cursor } = req.query;

        const filter = { comment: req.params.cid };
        if (cursor && isValidObjectId(cursor)) {
            filter._id = { $gt: cursor }; // Replies usually sorted ASC (oldest first)
        }

        const replies = await Reply.find(filter)
            .sort({ _id: 1 })
            .limit(limit + 1)
            .populate('user', 'firstName lastName avatarUrl')
            .lean();

        const hasMore = replies.length > limit;
        if (hasMore) replies.pop();

        // Check likes
        const replyIds = replies.map(r => r._id);
        const userLikes = await Like.find({
            user: req.user.id,
            targetId: { $in: replyIds },
            targetType: 'Reply'
        }).select('targetId').lean();

        const likedSet = new Set(userLikes.map(l => l.targetId.toString()));

        const responseReplies = replies.map(r => ({
            ...r,
            isLiked: likedSet.has(r._id.toString())
        }));

        res.json({
            replies: responseReplies,
            pagination: {
                limit,
                nextCursor: hasMore ? responseReplies[responseReplies.length - 1]._id : null,
                hasMore
            }
        });
    } catch (err) {
        console.error('[Get Replies]', err.message);
        res.status(500).json({ message: 'Failed to load replies' });
    }
});

// ─── GET /likes — Fetch users who liked a target ─────────────────────────────
router.get('/likes', auth, async (req, res) => {
    try {
        const { targetId, targetType, limit = 20, cursor } = req.query;
        if (!targetId || !targetType) return res.status(400).json({ message: 'Missing targetId or targetType' });

        const filter = { targetId, targetType };
        if (cursor && isValidObjectId(cursor)) {
            filter._id = { $lt: cursor };
        }

        const likes = await Like.find(filter)
            .sort({ _id: -1 })
            .limit(parseInt(limit) + 1)
            .populate('user', 'firstName lastName avatarUrl')
            .lean();

        const hasMore = likes.length > parseInt(limit);
        if (hasMore) likes.pop();

        res.json({
            likers: likes.map(l => ({
                user: l.user,
                type: l.type
            })),
            pagination: {
                nextCursor: hasMore ? likes[likes.length - 1]._id : null,
                hasMore
            }
        });
    } catch (err) {
        console.error('[Get Likers]', err.message);
        res.status(500).json({ message: 'Failed to load likers' });
    }
});

module.exports = router;
