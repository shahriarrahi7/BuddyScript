import React from 'react';
import PostItem from './PostItem';

// ─── Skeleton Card ────────────────────────────────────────────────────────────
const SkeletonPost = () => (
    <div className="_feed_inner_timeline_post_area _b_radious6 _padd_b24 _padd_t24 _mar_b16"
        style={{ overflow: 'hidden' }}>
        <div className="_feed_inner_timeline_content _padd_r24 _padd_l24">
            <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', alignItems: 'center' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', ...shimmer }} />
                <div style={{ flex: 1 }}>
                    <div style={{ height: '14px', width: '40%', borderRadius: '6px', marginBottom: '8px', ...shimmer }} />
                    <div style={{ height: '11px', width: '25%', borderRadius: '6px', ...shimmer }} />
                </div>
            </div>
            <div style={{ height: '14px', width: '90%', borderRadius: '6px', marginBottom: '8px', ...shimmer }} />
            <div style={{ height: '14px', width: '75%', borderRadius: '6px', marginBottom: '8px', ...shimmer }} />
            <div style={{ height: '14px', width: '55%', borderRadius: '6px', ...shimmer }} />
        </div>
        <style>{`
            @keyframes _shimmer { 0%,100%{opacity:1} 50%{opacity:.4} }
        `}</style>
    </div>
);

const shimmer = {
    background: '#e8e8e8',
    animation: '_shimmer 1.4s ease-in-out infinite'
};

// ─── PostList ─────────────────────────────────────────────────────────────────
const PostList = ({ posts, loading, onPostUpdate, hasMore, onLoadMore, loadingMore }) => {
    if (loading) {
        return (
            <div className="_post_list_area">
                {[1, 2, 3].map(i => <SkeletonPost key={i} />)}
            </div>
        );
    }

    if (!loading && posts.length === 0) {
        return (
            <div className="_post_list_area" style={{ textAlign: 'center', padding: '40px 20px' }}>
                <p style={{ color: '#aaa', fontSize: '15px' }}>No posts yet. Be the first to post!</p>
            </div>
        );
    }

    return (
        <div className="_post_list_area">
            {posts.map(post => (
                <PostItem
                    key={post._id}
                    post={post}
                    onPostUpdate={onPostUpdate}
                />
            ))}

            {hasMore && (
                <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
                    <button
                        onClick={onLoadMore}
                        disabled={loadingMore}
                        style={{
                            background: 'linear-gradient(135deg, #aa3bff, #5b8df6)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '24px',
                            padding: '10px 32px',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: loadingMore ? 'not-allowed' : 'pointer',
                            opacity: loadingMore ? 0.7 : 1,
                            transition: 'opacity 0.2s'
                        }}
                        aria-busy={loadingMore}
                    >
                        {loadingMore ? 'Loading…' : 'Load More'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default PostList;
