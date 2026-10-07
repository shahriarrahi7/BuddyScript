import React, { useState, useCallback, useEffect, useRef } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import postImg from '../assets/images/post_img.png';
import react1 from '../assets/images/react_img1.png';
import react2 from '../assets/images/react_img2.png';
import react3 from '../assets/images/react_img3.png';
import LikesModal from './LikesModal';
import CommentItem from './CommentItem';
import ReactionPicker from './ReactionPicker';
import { toast } from './Toast';
import './SocialUI.css';

const reactions = {
    like: { emoji: '👍', label: 'Like', color: '#1877f2' },
    love: { emoji: '❤️', label: 'Love', color: '#f33e58' },
    haha: { emoji: '😆', label: 'Haha', color: '#f7b125' },
    care: { emoji: '🥰', label: 'Care', color: '#f7b125' },
    angry: { emoji: '😡', label: 'Angry', color: '#e9710f' }
};

const PostItem = ({ post, onPostUpdate }) => {
    const { user: authUser } = useAuth();
    const currentUserId = authUser?.id || authUser?._id;
    const isAuthor = currentUserId && (post.user?._id === currentUserId || post.user?.toString() === currentUserId);

    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);
    const [likesModal, setLikesModal] = useState(false);
    
    // ─── Author Menu (Edit / Delete) ──────────────────────────────────────────
    const [showMenu, setShowMenu] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(post.content || '');
    const [savingEdit, setSavingEdit] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const menuRef = useRef(null);

    // Close menu on outside click
    useEffect(() => {
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
        };
        if (showMenu) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showMenu]);

    const handleEdit = async () => {
        const trimmed = editContent.trim();
        if (!trimmed) return toast.error('Post content cannot be empty');
        setSavingEdit(true);
        try {
            await api.put(`/posts/${post._id}`, { content: trimmed });
            if (onPostUpdate) onPostUpdate({ ...post, content: trimmed });
            setIsEditing(false);
            toast.success('Post updated');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update post');
        } finally {
            setSavingEdit(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await api.delete(`/posts/${post._id}`);
            if (onPostUpdate) onPostUpdate({ ...post, _deleted: true });
            toast.success('Post deleted');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete post');
        } finally {
            setDeleting(false);
            setConfirmDelete(false);
        }
    };

    // ─── Share Logic ──────────────────────────────────────────────────────────
    const [sharing, setSharing] = useState(false);

    const handleShare = async () => {
        if (post.visibility === 'private') {
            return toast.error('Private posts cannot be shared');
        }
        setSharing(true);
        try {
            await api.post(`/posts/${post._id}/share`, { content: '' });
            if (onPostUpdate) onPostUpdate({ ...post, shareCount: (post.shareCount || 0) + 1 });
            toast.success('Post shared to your feed!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to share post');
        } finally {
            setSharing(false);
        }
    };

    // ─── Reaction Logic ────────────────────────────────────────────────────────
    const [showPicker, setShowPicker] = useState(false);
    const [reactionType, setReactionType] = useState(post.reactionType || null);
    const [isLiked, setIsLiked] = useState(post.isLiked || false);
    const [likeCount, setLikeCount] = useState(post.likeCount || 0);
    const [reactionCounts, setReactionCounts] = useState(post.reactionCounts || {});
    const pickerTimeout = useRef(null);

    const handleMouseEnter = () => {
        if (pickerTimeout.current) clearTimeout(pickerTimeout.current);
        setShowPicker(true);
    };

    const handleMouseLeave = () => {
        pickerTimeout.current = setTimeout(() => setShowPicker(false), 500);
    };

    const handleReaction = async (type) => {
        const prevLiked = isLiked;
        const prevType = reactionType;
        const prevCounts = { ...reactionCounts };
        const prevTotal = likeCount;

        if (prevType === type) {
            setIsLiked(false);
            setReactionType(null);
            setLikeCount(Math.max(0, prevTotal - 1));
            setReactionCounts(prev => ({ ...prev, [type]: Math.max(0, (prev[type] || 0) - 1) }));
        } else {
            setIsLiked(true);
            setReactionType(type);
            if (!prevLiked) setLikeCount(prevTotal + 1);
            setReactionCounts(prev => {
                const newCounts = { ...prev };
                if (prevType) newCounts[prevType] = Math.max(0, (newCounts[prevType] || 0) - 1);
                newCounts[type] = (newCounts[type] || 0) + 1;
                return newCounts;
            });
        }
        setShowPicker(false);

        try {
            const res = await api.put(`/posts/${post._id}/like`, { type });
            setIsLiked(res.data.isLiked);
            setReactionType(res.data.type);
            setLikeCount(res.data.likeCount);
            setReactionCounts(res.data.reactionCounts);
        } catch (err) {
            setIsLiked(prevLiked);
            setReactionType(prevType);
            setLikeCount(prevTotal);
            setReactionCounts(prevCounts);
            toast.error('Failed to update reaction');
        }
    };

    const [comments, setComments] = useState([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [hasMoreComments, setHasMoreComments] = useState(false);
    const [commentsCursor, setCommentsCursor] = useState(null);

    const fetchComments = useCallback(async (cursor = null, append = false) => {
        setLoadingComments(true);
        try {
            const res = await api.get(`/posts/${post._id}/comments`, { params: { cursor, limit: 5 } });
            const { comments: newComments, pagination } = res.data;
            setComments(prev => append ? [...prev, ...newComments] : newComments);
            setHasMoreComments(pagination.hasMore);
            setCommentsCursor(pagination.nextCursor);
        } catch (err) {
            toast.error('Failed to load comments');
        } finally {
            setLoadingComments(false);
        }
    }, [post._id]);

    useEffect(() => {
        if (showComments && comments.length === 0) fetchComments(null, false);
    }, [showComments, comments.length, fetchComments]);

    const handleCommentSubmit = async () => {
        const trimmed = commentText.trim();
        if (!trimmed) return;
        setSubmittingComment(true);
        try {
            const res = await api.post(`/posts/${post._id}/comments`, { text: trimmed });
            setComments(prev => [res.data.comment, ...prev]);
            setCommentText('');
            if (onPostUpdate) onPostUpdate({ ...post, commentCount: (post.commentCount || 0) + 1 });
        } catch (err) {
            toast.error('Failed to post comment');
        } finally {
            setSubmittingComment(false);
        }
    };

    // ─── Comment deleted callback ──────────────────────────────────────────────
    const handleCommentDeleted = (commentId) => {
        setComments(prev => prev.filter(c => c._id !== commentId));
        if (onPostUpdate) onPostUpdate({ ...post, commentCount: Math.max(0, (post.commentCount || 0) - 1) });
    };

    const sortedReactions = Object.entries(reactionCounts || {})
        .filter(([_, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    const formatRelativeTime = (date) => {
        const diff = Date.now() - new Date(date).getTime();
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 30) return 'Just now';
        if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
        return new Date(date).toLocaleDateString();
    };

    const author = `${post.user?.firstName || ''} ${post.user?.lastName || ''}`.trim();

    return (
        <div className="_feed_inner_timeline_post_area _mar_b16" style={{ background: '#fff', border: '1px solid #ced0d4', borderRadius: '8px', padding: '16px' }}>
            <div className="_feed_inner_timeline_content">
                <div className="_feed_inner_timeline_post_top" style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div className="_feed_inner_timeline_post_box">
                        <img src={post.user?.avatarUrl || postImg} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                        <div className="_feed_inner_timeline_post_box_txt">
                            <h5 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#050505' }}>{author}</h5>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                                <span style={{ fontSize: '13px', color: '#65676b' }}>{formatRelativeTime(post.createdAt)}</span>
                                <span style={{ fontSize: '13px', color: '#65676b', fontWeight: 800 }}> . </span>
                                <span style={{ fontSize: '13px', color: '#65676b' }}>
                                    {post.visibility === 'private' ? 'Private' : 'Public'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Action Menu (⋯) */}
                    {(
                        <div ref={menuRef} style={{ position: 'relative' }}>
                            <button
                                className="_post_menu_btn"
                                onClick={() => setShowMenu(v => !v)}
                                title="Post options"
                            >
                                ⋯
                            </button>
                            {showMenu && (
                                <div className="_post_dropdown_menu">
                                    {isAuthor ? (
                                        <>
                                            <button className="_post_dropdown_item" onClick={() => { setIsEditing(true); setEditContent(post.content || ''); setShowMenu(false); }}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                                Edit Post
                                            </button>
                                            <button className="_post_dropdown_item _post_dropdown_delete" onClick={() => { setConfirmDelete(true); setShowMenu(false); }}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                                Delete Post
                                            </button>
                                        </>
                                    ) : (
                                        <button className="_post_dropdown_item" style={{color: '#e0245e'}} onClick={() => { 
                                            setShowMenu(false); 
                                            const reason = window.prompt("Why are you reporting this post?");
                                            if (reason) {
                                                api.post('/reports', { targetId: post._id, targetType: 'Post', reason })
                                                   .then(() => toast.success('Report submitted'))
                                                   .catch((err) => toast.error(err.response?.data?.message || 'Failed to submit report'));
                                            }
                                        }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                                            Report Post
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Edit mode or normal content */}
                {isEditing ? (
                    <div style={{ marginBottom: '12px' }}>
                        <textarea
                            className="_post_edit_textarea"
                            value={editContent}
                            onChange={e => setEditContent(e.target.value)}
                            rows={3}
                            maxLength={5000}
                        />
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                            <button className="_post_edit_cancel_btn" onClick={() => setIsEditing(false)} disabled={savingEdit}>Cancel</button>
                            <button className="_post_edit_save_btn" onClick={handleEdit} disabled={savingEdit || !editContent.trim()}>
                                {savingEdit ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <p style={{ fontSize: '15px', color: '#050505', marginBottom: '12px' }}>{post.content}</p>
                )}

                {/* Shared post embed */}
                {post.sharedFrom && (
                    <div className="_shared_post_embed">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <img src={post.sharedFrom?.user?.avatarUrl || postImg} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                            <div>
                                <span style={{ fontWeight: 700, fontSize: '13px' }}>{post.sharedFrom?.user?.firstName} {post.sharedFrom?.user?.lastName}</span>
                            </div>
                        </div>
                        <p style={{ fontSize: '14px', color: '#050505', margin: 0 }}>{post.sharedFrom?.content}</p>
                        {post.sharedFrom?.mediaUrl && (
                            <div style={{ borderRadius: '6px', overflow: 'hidden', marginTop: '8px' }}>
                                {post.sharedFrom.mediaType === 'video' ? <video src={post.sharedFrom.mediaUrl} controls style={{ width: '100%' }} /> : <img src={post.sharedFrom.mediaUrl} alt="" style={{ width: '100%' }} />}
                            </div>
                        )}
                    </div>
                )}

                {post.mediaUrl && (
                    <div style={{ borderRadius: '8px', overflow: 'hidden', marginBottom: '12px' }}>
                        {post.mediaType === 'video' ? <video src={post.mediaUrl} controls style={{ width: '100%' }} /> : <img src={post.mediaUrl} alt="" style={{ width: '100%' }} />}
                    </div>
                )}
            </div>

            {/* Delete confirmation */}
            {confirmDelete && (
                <div className="_confirm_delete_bar">
                    <span>Are you sure you want to delete this post?</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="_post_edit_cancel_btn" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancel</button>
                        <button className="_post_delete_confirm_btn" onClick={handleDelete} disabled={deleting}>
                            {deleting ? 'Deleting…' : 'Delete'}
                        </button>
                    </div>
                </div>
            )}

            {/* Engagement Summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => setLikesModal(true)}>
                    <div className="_avatar_stack">
                        {sortedReactions.map(([type]) => (
                            <div key={type} className="_avatar_stack_item" title={type}>
                                {reactions[type]?.emoji}
                            </div>
                        ))}
                    </div>
                    {likeCount > 0 && <span style={{ fontSize: '14px', color: '#65676b', marginLeft: '6px', fontWeight: 600 }}>{likeCount}</span>}
                </div>
                <div className="_engagement_labels">
                    <span onClick={() => setShowComments(!showComments)} style={{ cursor: 'pointer', marginRight: '20px' }}>{post.commentCount || 0} Comment</span>
                    <span>{post.shareCount || 0} Share</span>
                </div>
            </div>

            {/* Post Actions Grid */}
            <div className="_post_actions_grid">
                <div className="_post_action_btn_container" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                    {showPicker && <ReactionPicker onSelect={handleReaction} />}
                    <button 
                        className={`_post_action_btn ${isLiked ? 'active' : ''}`}
                        onClick={() => handleReaction(reactionType || 'like')}
                        style={{ 
                            color: isLiked ? (reactions[reactionType || 'like']?.color || '#1877f2') : '#65676b'
                        }}
                    >
                        <span style={{ fontSize: '18px' }}>{isLiked ? (reactions[reactionType]?.emoji || '👍') : '👍'}</span>
                        <span style={{ fontWeight: 600 }}>{isLiked ? ((reactionType || 'like').charAt(0).toUpperCase() + (reactionType || 'like').slice(1)) : 'Like'}</span>
                    </button>
                </div>
                <div className="_post_action_btn_container">
                    <button className="_post_action_btn" onClick={() => setShowComments(!showComments)}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                            <line x1="9" y1="10" x2="15" y2="10"/>
                            <line x1="9" y1="14" x2="13" y2="14"/>
                        </svg>
                        <span style={{ fontWeight: 600 }}>Comment</span>
                    </button>
                </div>
                <div className="_post_action_btn_container">
                    <button
                        className="_post_action_btn"
                        onClick={handleShare}
                        disabled={sharing}
                        style={{ opacity: sharing ? 0.6 : 1 }}
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 10 20 15 15 20"/>
                            <path d="M4 4v7a4 4 0 0 0 4 4h12"/>
                        </svg>
                        <span style={{ fontWeight: 600 }}>{sharing ? 'Sharing…' : 'Share'}</span>
                    </button>
                </div>
            </div>

            {/* Comments Area */}
            {showComments && (
                <div className="comments_area">
                    {/* Top level Write a Comment input */}
                    <div className="_comment_input_container">
                        <img src={authUser?.avatarUrl || postImg} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                        <div className="_comment_input_field_wrap">
                            <input
                                className="_comment_input_field"
                                type="text"
                                placeholder="Write a comment"
                                value={commentText}
                                onChange={e => setCommentText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCommentSubmit()}
                            />
                            <div className="_comment_input_icons">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                            </div>
                        </div>
                        {commentText.trim() && (
                            <button
                                className="_blue_comment_btn"
                                onClick={handleCommentSubmit}
                                disabled={submittingComment}
                            >
                                Comment
                            </button>
                        )}
                    </div>

                    {/* View previous comments link */}
                    {hasMoreComments && (
                        <div className="_view_previous_comments_link" onClick={() => fetchComments(commentsCursor, true)}>
                            View earlier comments
                        </div>
                    )}

                    <div className="comments_list">
                        {comments.map(c => <CommentItem key={c._id} comment={c} postId={post._id} currentUserId={currentUserId} onCommentDeleted={handleCommentDeleted} />)}
                    </div>
                </div>
            )}
            <LikesModal isOpen={likesModal} onClose={() => setLikesModal(false)} title="Post Reactions" targetId={post._id} targetType="Post" />
        </div>
    );
};

export default PostItem;
