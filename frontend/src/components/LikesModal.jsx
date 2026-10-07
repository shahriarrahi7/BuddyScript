import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api';
import { toast } from './Toast';

const reactionEmojis = {
    like: '👍',
    love: '❤️',
    haha: '😆',
    care: '🥰',
    angry: '😡'
};

const LikesModal = ({ isOpen, onClose, title, targetId, targetType }) => {
    const [likers, setLikers] = useState([]); // Array of { user, type }
    const [loading, setLoading] = useState(false);
    const [activeFilter, setActiveFilter] = useState('all');
    const [cursor, setCursor] = useState(null);
    const [hasMore, setHasMore] = useState(false);

    const fetchLikers = useCallback(async (newCursor = null, append = false) => {
        if (!targetId || !targetType) return;
        setLoading(true);
        try {
            const res = await api.get('/posts/likes', {
                params: { targetId, targetType, cursor: newCursor, limit: 30 }
            });
            const { likers: newLikers, pagination } = res.data;
            setLikers(prev => append ? [...prev, ...newLikers] : newLikers);
            setHasMore(pagination.hasMore);
            setCursor(pagination.nextCursor);
        } catch (err) {
            toast.error('Failed to load reactions');
        } finally {
            setLoading(false);
        }
    }, [targetId, targetType]);

    useEffect(() => {
        if (isOpen) {
            setLikers([]);
            fetchLikers(null, false);
        }
    }, [isOpen, fetchLikers]);

    const filteredLikers = useMemo(() => {
        if (activeFilter === 'all') return likers;
        return likers.filter(l => l.type === activeFilter);
    }, [likers, activeFilter]);

    // Aggregate counts for tabs
    const counts = useMemo(() => {
        const c = { all: likers.length };
        likers.forEach(l => {
            c[l.type] = (c[l.type] || 0) + 1;
        });
        return c;
    }, [likers]);

    if (!isOpen) return null;

    return (
        <div className="modal_overlay" style={overlayStyle} onClick={onClose}>
            <div className="modal_content" style={modalStyle} onClick={e => e.stopPropagation()}>
                <div style={headerStyle}>
                    <h4 style={{ margin: 0, fontWeight: 700 }}>{title || 'Reactions'}</h4>
                    <button onClick={onClose} style={closeBtnStyle}>×</button>
                </div>

                {/* Filter Tabs */}
                <div style={tabContainerStyle}>
                    <button 
                        onClick={() => setActiveFilter('all')} 
                        style={{ ...tabItemStyle, borderBottom: activeFilter === 'all' ? '3px solid #1877f2' : 'none' }}
                    >
                        All {counts.all > 0 && `(${counts.all})`}
                    </button>
                    {Object.entries(reactionEmojis).map(([type, emoji]) => (
                        counts[type] > 0 && (
                            <button 
                                key={type} 
                                onClick={() => setActiveFilter(type)} 
                                style={{ ...tabItemStyle, borderBottom: activeFilter === type ? '3px solid #1877f2' : 'none' }}
                            >
                                {emoji} {counts[type]}
                            </button>
                        )
                    ))}
                </div>

                <div style={listScrollStyle}>
                    {loading && likers.length === 0 ? <p style={{ textAlign: 'center' }}>Loading...</p> : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {filteredLikers.map((item, idx) => (
                                <li key={item.user?._id || idx} style={listItemStyle}>
                                    <div style={{ position: 'relative' }}>
                                        <img 
                                            src={item.user?.avatarUrl || 'https://via.placeholder.com/40'} 
                                            alt="" 
                                            style={avatarStyle} 
                                        />
                                        <div style={reactionBadgeStyle}>{reactionEmojis[item.type]}</div>
                                    </div>
                                    <span style={{ fontWeight: 600, fontSize: '15px' }}>
                                        {item.user?.firstName} {item.user?.lastName}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                    {hasMore && !loading && (
                        <button onClick={() => fetchLikers(cursor, true)} style={loadMoreStyle}>Show more</button>
                    )}
                </div>
            </div>
        </div>
    );
};

/* Styles */
const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 };
const modalStyle = { background: '#fff', borderRadius: '12px', width: '90%', maxWidth: '400px', display: 'flex', flexDirection: 'column', maxHeight: '80vh', boxShadow: '0 12px 40px rgba(0,0,0,0.3)' };
const headerStyle = { padding: '16px 20px', borderBottom: '1px solid #ced0d4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const closeBtnStyle = { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#65676b' };
const tabContainerStyle = { display: 'flex', borderBottom: '1px solid #ced0d4', padding: '0 10px', overflowX: 'auto' };
const tabItemStyle = { padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#65676b', whiteSpace: 'nowrap' };
const listScrollStyle = { flex: 1, overflowY: 'auto', padding: '10px 20px' };
const listItemStyle = { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0' };
const avatarStyle = { width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' };
const reactionBadgeStyle = { position: 'absolute', bottom: -2, right: -2, background: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' };
const loadMoreStyle = { width: '100%', padding: '10px', background: 'none', border: 'none', color: '#1877f2', fontWeight: 600, cursor: 'pointer' };

export default LikesModal;
