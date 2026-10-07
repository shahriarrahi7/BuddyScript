import React, { useState, useCallback, useEffect, useRef } from 'react';
import api from '../api';
import { toast } from './Toast';
import ReactionPicker from './ReactionPicker';
import LikesModal from './LikesModal';
import './SocialUI.css';

// ─── Shared reactions map ─────────────────────────────────────────────────────
const reactions = {
    like:  { emoji: '👍', label: 'Like',  color: '#1877f2' },
    love:  { emoji: '❤️', label: 'Love',  color: '#f33e58' },
    haha:  { emoji: '😆', label: 'Haha',  color: '#f7b125' },
    care:  { emoji: '🥰', label: 'Care',  color: '#f7b125' },
    angry: { emoji: '😡', label: 'Angry', color: '#e9710f' },
};

// ─── Mini reaction badge icons ────────────────────────────────────────────────
const ThumbIconMini = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
        fill="#1877f2" style={{ borderRadius: '50%', border: '1px solid #fff' }}>
        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
);

const HeartIconMini = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
        fill="#f33e58" style={{ borderRadius: '50%', border: '1px solid #fff', marginLeft: '-3px' }}>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
);

// ─── MicIcon / ImageIcon ──────────────────────────────────────────────────────
const MicIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
);

const ImageIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
    </svg>
);

// ─── Reaction action label (Like) with hover picker ──────────────────────────
const ReactionLabel = ({ isReacted, reactionType: initType, onReact, size = 'comment' }) => {
    const [showPicker, setShowPicker] = useState(false);
    const timeout = useRef(null);

    const enter = () => { clearTimeout(timeout.current); setShowPicker(true); };
    const leave = () => { timeout.current = setTimeout(() => setShowPicker(false), 400); };

    const activeColor = isReacted ? (reactions[initType]?.color || '#1877f2') : '#65676b';
    const label = isReacted ? (reactions[initType]?.label || 'Like') : 'Like';

    return (
        <div style={{ position: 'relative', display: 'inline-block' }}
            onMouseEnter={enter} onMouseLeave={leave}>
            {showPicker && (
                <div className="_comment_reaction_picker_wrapper">
                    <div className="_reaction_picker_container">
                        {Object.entries(reactions).map(([type, r]) => (
                            <div key={type} className="_reaction_item"
                                onClick={() => { onReact(type); setShowPicker(false); }}>
                                <span className="_reaction_emoji_large">{r.emoji}</span>
                                <div className="_reaction_label_text">{r.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <span
                className="_comment_label_bold"
                style={{ color: activeColor }}
                onClick={() => onReact(initType || 'like')}>
                {label}
            </span>
        </div>
    );
};

// ─── ReplyItem ────────────────────────────────────────────────────────────────
const ReplyItem = ({ reply: initReply, postId, commentId, currentUserId, onReplyDeleted }) => {
    const [isReacted, setIsReacted]   = useState(initReply.isLiked || false);
    const [reactionType, setReaction] = useState(initReply.reactionType || null);
    const [likeCount, setLikeCount]   = useState(initReply.likeCount || 0);
    const [reactionCounts, setReactionCounts] = useState(initReply.reactionCounts || {});
    const [likesModal, setLikesModal] = useState(false);
    const [deleting, setDeleting]     = useState(false);
    const [showMenu, setShowMenu]     = useState(false);
    const [isEditing, setIsEditing]   = useState(false);
    const [editContent, setEditContent] = useState(initReply.text || '');
    const [saving, setSaving]         = useState(false);
    const menuRef = useRef(null);

    // Close menu on outside click
    useEffect(() => {
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
        };
        if (showMenu) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showMenu]);

    const isAuthor = currentUserId && (initReply.user?._id === currentUserId || initReply.user?.toString() === currentUserId);

    const handleReact = async (type) => {
        const prev = { isReacted, reactionType, likeCount, reactionCounts };
        // Optimistic update
        if (reactionType === type) {
            setIsReacted(false); setReaction(null);
            setLikeCount(c => Math.max(0, c - 1));
            setReactionCounts(rc => ({ ...rc, [type]: Math.max(0, (rc[type] || 0) - 1) }));
        } else {
            setIsReacted(true); setReaction(type);
            if (!isReacted) setLikeCount(c => c + 1);
            setReactionCounts(rc => {
                const n = { ...rc };
                if (reactionType) n[reactionType] = Math.max(0, (n[reactionType] || 0) - 1);
                n[type] = (n[type] || 0) + 1;
                return n;
            });
        }
        try {
            const res = await api.put(`/posts/${postId}/comments/${commentId}/replies/${initReply._id}/like`, { type });
            setIsReacted(res.data.isLiked);
            setReaction(res.data.type);
            setLikeCount(res.data.likeCount);
            setReactionCounts(res.data.reactionCounts || {});
        } catch {
            setIsReacted(prev.isReacted); setReaction(prev.reactionType);
            setLikeCount(prev.likeCount); setReactionCounts(prev.reactionCounts);
            toast.error('Failed to update reaction');
        }
    };

    const handleEdit = async () => {
        const trimmed = editContent.trim();
        if (!trimmed) return toast.error('Reply cannot be empty');
        setSaving(true);
        try {
            await api.put(`/posts/${postId}/comments/${commentId}/replies/${initReply._id}`, { text: trimmed });
            initReply.text = trimmed;
            setIsEditing(false);
            toast.success('Reply updated');
        } catch {
            toast.error('Failed to update reply');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await api.delete(`/posts/${postId}/comments/${commentId}/replies/${initReply._id}`);
            if (onReplyDeleted) onReplyDeleted(initReply._id);
            toast.success('Reply deleted');
        } catch {
            toast.error('Failed to delete reply');
        } finally {
            setDeleting(false);
        }
    };

    const topReactions = Object.entries(reactionCounts || {})
        .filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]).slice(0, 2);

    return (
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px', paddingLeft: '8px' }}>
            <img src={initReply.user?.avatarUrl || 'https://ui-avatars.com/api/?name=U'} alt=""
                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start' }}>
                    <div className="_comment_bubble" style={{ flex: 1 }}>
                        <h5 className="_comment_author_name">{initReply.user?.firstName} {initReply.user?.lastName}</h5>
                        {isEditing ? (
                            <div style={{ marginTop: '4px' }}>
                                <textarea 
                                    className="_comment_input_field" 
                                    value={editContent} 
                                    onChange={e => setEditContent(e.target.value)}
                                    rows={2}
                                    style={{ width: '100%', padding: '8px', borderRadius: '8px' }}
                                />
                                <div style={{ display: 'flex', gap: '8px', marginTop: '4px', justifyContent: 'flex-end' }}>
                                    <button onClick={() => setIsEditing(false)} style={{ fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#65676b' }}>Cancel</button>
                                    <button onClick={handleEdit} disabled={saving || !editContent.trim()} style={{ fontSize: '12px', background: '#1877f2', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}>
                                        {saving ? 'Saving...' : 'Save'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="_comment_text_p">{initReply.text}</p>
                        )}
                        {likeCount > 0 && (
                            <div className="_comment_reaction_badge" style={{ cursor: 'pointer' }} onClick={() => setLikesModal(true)}>
                                <div style={{ display: 'flex' }}>
                                    {topReactions.map(([t]) =>
                                        t === 'love' ? <HeartIconMini key={t} /> : <ThumbIconMini key={t} />
                                    )}
                                </div>
                                <span>{likeCount}</span>
                            </div>
                        )}
                    </div>

                    {/* Action Menu (⋯) */}
                    <div ref={menuRef} style={{ marginLeft: '4px' }}>
                        <button 
                            className="_post_mini_menu_btn" 
                            onClick={() => setShowMenu(v => !v)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676b', padding: '2px 4px', borderRadius: '4px' }}
                        >
                            ⋯
                        </button>
                        {showMenu && (
                            <div className="_post_dropdown_menu _comment_dropdown">
                                {isAuthor ? (
                                    <>
                                        <button className="_post_dropdown_item" onClick={() => { setIsEditing(true); setEditContent(initReply.text); setShowMenu(false); }}>
                                            Edit Reply
                                        </button>
                                        <button className="_post_dropdown_item _post_dropdown_delete" onClick={() => { handleDelete(); setShowMenu(false); }}>
                                            Delete Reply
                                        </button>
                                    </>
                                ) : (
                                    <button className="_post_dropdown_item" style={{color: '#e0245e'}} onClick={() => { 
                                        setShowMenu(false); 
                                        const reason = window.prompt("Why are you reporting this reply?");
                                        if (reason) {
                                            api.post('/reports', { targetId: initReply._id, targetType: 'Reply', reason })
                                               .then(() => toast.success('Report submitted'))
                                               .catch((err) => toast.error(err.response?.data?.message || 'Failed to submit report'));
                                        }
                                    }}>
                                        Report Reply
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="_comment_actions_below">
                    <ReactionLabel isReacted={isReacted} reactionType={reactionType} onReact={handleReact} />
                    <span className="_comment_label_regular">
                        &nbsp;·&nbsp;{new Date(initReply.createdAt).toLocaleDateString()}
                    </span>
                </div>
            </div>
            <LikesModal isOpen={likesModal} onClose={() => setLikesModal(false)} title="Reply Reactions" targetId={initReply._id} targetType="Reply" />
        </div>
    );
};

// ─── CommentItem ──────────────────────────────────────────────────────────────
const CommentItem = ({ comment: initComment, postId, currentUserId, onCommentDeleted }) => {
    const [isReacted, setIsReacted]   = useState(initComment.isLiked || false);
    const [reactionType, setReaction] = useState(initComment.reactionType || null);
    const [likeCount, setLikeCount]   = useState(initComment.likeCount || 0);
    const [reactionCounts, setReactionCounts] = useState(initComment.reactionCounts || {});
    const [showReplyInput, setShowReplyInput] = useState(false);
    const [replyText, setReplyText]   = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [replies, setReplies]       = useState([]);
    const [showReplies, setShowReplies] = useState(false);
    const [loadingReplies, setLoadingReplies] = useState(false);
    const [likesModal, setLikesModal] = useState(false);
    const [deleting, setDeleting]     = useState(false);
    const [showMenu, setShowMenu]     = useState(false);
    const [isEditing, setIsEditing]   = useState(false);
    const [editContent, setEditContent] = useState(initComment.text || '');
    const [saving, setSaving]         = useState(false);
    const menuRef = useRef(null);

    // Close menu on outside click
    useEffect(() => {
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
        };
        if (showMenu) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showMenu]);

    const isAuthor = currentUserId && (initComment.user?._id === currentUserId || initComment.user?.toString() === currentUserId);

    const fetchReplies = useCallback(async () => {
        setLoadingReplies(true);
        try {
            const res = await api.get(`/posts/comments/${initComment._id}/replies`, { params: { limit: 20 } });
            setReplies(res.data.replies || []);
            setShowReplies(true);
        } catch { toast.error('Failed to load replies'); }
        finally { setLoadingReplies(false); }
    }, [initComment._id]);

    const handleReact = async (type) => {
        const prev = { isReacted, reactionType, likeCount, reactionCounts };
        if (reactionType === type) {
            setIsReacted(false); setReaction(null);
            setLikeCount(c => Math.max(0, c - 1));
            setReactionCounts(rc => ({ ...rc, [type]: Math.max(0, (rc[type] || 0) - 1) }));
        } else {
            setIsReacted(true); setReaction(type);
            if (!isReacted) setLikeCount(c => c + 1);
            setReactionCounts(rc => {
                const n = { ...rc };
                if (reactionType) n[reactionType] = Math.max(0, (n[reactionType] || 0) - 1);
                n[type] = (n[type] || 0) + 1;
                return n;
            });
        }
        try {
            const res = await api.put(`/posts/${postId}/comments/${initComment._id}/like`, { type });
            setIsReacted(res.data.isLiked);
            setReaction(res.data.type);
            setLikeCount(res.data.likeCount);
            setReactionCounts(res.data.reactionCounts || {});
        } catch {
            setIsReacted(prev.isReacted); setReaction(prev.reactionType);
            setLikeCount(prev.likeCount); setReactionCounts(prev.reactionCounts);
            toast.error('Failed to update reaction');
        }
    };

    const handleEdit = async () => {
        const trimmed = editContent.trim();
        if (!trimmed) return toast.error('Comment cannot be empty');
        setSaving(true);
        try {
            await api.put(`/posts/${postId}/comments/${initComment._id}`, { text: trimmed });
            initComment.text = trimmed;
            setIsEditing(false);
            toast.success('Comment updated');
        } catch {
            toast.error('Failed to update comment');
        } finally {
            setSaving(false);
        }
    };

    const handleReplySubmit = async () => {
        const trimmed = replyText.trim();
        if (!trimmed) return;
        setSubmitting(true);
        try {
            const res = await api.post(`/posts/${postId}/comments/${initComment._id}/replies`, { text: trimmed });
            setReplies(prev => [...prev, res.data.reply]);
            setReplyText('');
            setShowReplies(true);
            toast.success('Reply posted');
        } catch { toast.error('Failed to post reply'); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await api.delete(`/posts/${postId}/comments/${initComment._id}`);
            if (onCommentDeleted) onCommentDeleted(initComment._id);
            toast.success('Comment deleted');
        } catch {
            toast.error('Failed to delete comment');
        } finally {
            setDeleting(false);
        }
    };

    const handleReplyDeleted = (replyId) => {
        setReplies(prev => prev.filter(r => r._id !== replyId));
    };

    const topReactions = Object.entries(reactionCounts || {})
        .filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]).slice(0, 2);

    const replyCount = initComment.replyCount || 0;

    return (
        <div style={{ marginBottom: '14px' }}>
            {/* Comment bubble */}
            <div className="_comment_bubble_wrap">
                <img src={initComment.user?.avatarUrl || 'https://ui-avatars.com/api/?name=U'} alt=""
                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start' }}>
                        <div className="_comment_bubble" style={{ flex: 1 }}>
                            <h5 className="_comment_author_name">
                                {initComment.user?.firstName} {initComment.user?.lastName}
                            </h5>
                            {isEditing ? (
                                <div style={{ marginTop: '4px' }}>
                                    <textarea 
                                        className="_comment_input_field" 
                                        value={editContent} 
                                        onChange={e => setEditContent(e.target.value)}
                                        rows={2}
                                        style={{ width: '100%', padding: '8px', borderRadius: '8px' }}
                                    />
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px', justifyContent: 'flex-end' }}>
                                        <button onClick={() => setIsEditing(false)} style={{ fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#65676b' }}>Cancel</button>
                                        <button onClick={handleEdit} disabled={saving || !editContent.trim()} style={{ fontSize: '12px', background: '#1877f2', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}>
                                            {saving ? 'Saving...' : 'Save'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <p className="_comment_text_p">{initComment.text}</p>
                            )}
                            {likeCount > 0 && (
                                <div className="_comment_reaction_badge" style={{ cursor: 'pointer' }} onClick={() => setLikesModal(true)}>
                                    <div style={{ display: 'flex' }}>
                                        {topReactions.map(([t]) =>
                                            t === 'love' ? <HeartIconMini key={t} /> : <ThumbIconMini key={t} />
                                        )}
                                    </div>
                                    <span>{likeCount}</span>
                                </div>
                            )}
                        </div>

                        {/* Action Menu (⋯) */}
                        <div ref={menuRef} style={{ marginLeft: '4px' }}>
                            <button 
                                className="_post_mini_menu_btn" 
                                onClick={() => setShowMenu(v => !v)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676b', padding: '2px 4px', borderRadius: '4px' }}
                            >
                                ⋯
                            </button>
                            {showMenu && (
                                <div className="_post_dropdown_menu _comment_dropdown">
                                    {isAuthor ? (
                                        <>
                                            <button className="_post_dropdown_item" onClick={() => { setIsEditing(true); setEditContent(initComment.text); setShowMenu(false); }}>
                                                Edit Comment
                                            </button>
                                            <button className="_post_dropdown_item _post_dropdown_delete" onClick={() => { handleDelete(); setShowMenu(false); }}>
                                                Delete Comment
                                            </button>
                                        </>
                                    ) : (
                                        <button className="_post_dropdown_item" style={{color: '#e0245e'}} onClick={() => { 
                                            setShowMenu(false); 
                                            const reason = window.prompt("Why are you reporting this comment?");
                                            if (reason) {
                                                api.post('/reports', { targetId: initComment._id, targetType: 'Comment', reason })
                                                   .then(() => toast.success('Report submitted'))
                                                   .catch((err) => toast.error(err.response?.data?.message || 'Failed to submit report'));
                                            }
                                        }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                                            Report Comment
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action labels: Like · Reply · time */}
                    <div className="_comment_actions_below">
                        <ReactionLabel isReacted={isReacted} reactionType={reactionType} onReact={handleReact} />
                        <span className="_comment_label_regular">&nbsp;·&nbsp;</span>
                        <span className="_comment_label_bold"
                            onClick={() => { setShowReplyInput(v => !v); }}>
                            Reply
                        </span>
                        <span className="_comment_label_regular">
                            &nbsp;·&nbsp;{new Date(initComment.createdAt).toLocaleDateString()}
                        </span>
                    </div>

                    {/* View replies link */}
                    {replyCount > 0 && !showReplies && (
                        <div style={{ marginLeft: '0', marginTop: '4px' }}>
                            <span className="_comment_label_bold" style={{ color: '#65676b', fontSize: '13px', cursor: 'pointer' }}
                                onClick={fetchReplies}>
                                {loadingReplies ? 'Loading...' : `View ${replyCount} repl${replyCount === 1 ? 'y' : 'ies'}`}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Replies + Reply input — indented */}
            <div style={{ marginLeft: '48px' }}>
                {showReplies && replies.map(r => (
                    <ReplyItem key={r._id} reply={r} postId={postId} commentId={initComment._id} currentUserId={currentUserId} onReplyDeleted={handleReplyDeleted} />
                ))}

                {showReplyInput && (
                    <div className="_comment_input_container" style={{ marginTop: '10px' }}>
                        <img
                            src={'https://ui-avatars.com/api/?name=U'}
                            alt=""
                            style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                        />
                        <div className="_comment_input_field_wrap">
                            <input
                                className="_comment_input_field"
                                type="text"
                                placeholder="Write a reply…"
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleReplySubmit()}
                                autoFocus
                            />
                            <div className="_comment_input_icons">
                                <MicIcon /><ImageIcon />
                            </div>
                        </div>
                        {replyText.trim() && (
                            <button className="_blue_comment_btn" onClick={handleReplySubmit} disabled={submitting}>
                                Reply
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Likes Modal for this Comment */}
            <LikesModal isOpen={likesModal} onClose={() => setLikesModal(false)} title="Comment Reactions" targetId={initComment._id} targetType="Comment" />
        </div>
    );
};

export default CommentItem;
