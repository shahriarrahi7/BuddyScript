import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import StorySection from '../components/StorySection';
import CreatePost from '../components/CreatePost';
import PostList from '../components/PostList';
import RightSidebar from '../components/RightSidebar';
import ToastContainer, { toast } from '../components/Toast';

import api, { SOCKET_URL } from '../api';
const PAGE_SIZE = 10;

const Feed = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [nextCursor, setNextCursor] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [socket, setSocket] = useState(null);

    const fetchPosts = useCallback(async (cursor = null, append = false) => {
        try {
            const res = await api.get('/posts', {
                params: { cursor, limit: PAGE_SIZE }
            });

            const { posts: newPosts, pagination } = res.data;

            setPosts(prev => append ? [...prev, ...newPosts] : newPosts);
            setHasMore(pagination.hasMore);
            setNextCursor(pagination.nextCursor);
        } catch (err) {
            const msg = err.response?.data?.message;
            if (err.response?.status === 401) {
                toast.error('Your session expired. Please log in again.');
            } else {
                toast.error(msg || 'Failed to load posts');
            }
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    // ─── Socket.io Handlers ──────────────────────────────────────────────────
    useEffect(() => {
        const newSocket = io(SOCKET_URL, {
            withCredentials: true,
            transports: ['websocket']
        });
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('[Socket] Connected to server');
            if (user?.id) {
                newSocket.emit('join_user', user.id);
            }
        });

        // Real-time: New post appears
        newSocket.on('post_created', (newPost) => {
            setPosts(prev => {
                // Avoid duplicates
                if (prev.some(p => p._id === newPost._id)) return prev;
                return [newPost, ...prev];
            });
        });

        // Real-time: Likes/Shares updates
        newSocket.on('post_engagement', ({ type, targetId, count, reactionCounts }) => {
            setPosts(prev => prev.map(p => {
                if (p._id !== targetId) return p;
                if (type === 'reaction') return { ...p, likeCount: count, reactionCounts };
                if (type === 'share') return { ...p, shareCount: count };
                if (type === 'comment') return { ...p, commentCount: count };
                return p;
            }));
        });

        // Real-time: Post deletion
        newSocket.on('post_deleted', (postId) => {
            setPosts(prev => prev.filter(p => p._id !== postId));
        });

        return () => newSocket.disconnect();
    }, []);

    useEffect(() => {
        if (!socket) return;
        posts.forEach(p => socket.emit('join_post', p._id));
    }, [posts, socket]);

    useEffect(() => {
        fetchPosts(null, false);
    }, [fetchPosts]);

    const handleLoadMore = () => {
        if (!nextCursor || loadingMore) return;
        setLoadingMore(true);
        fetchPosts(nextCursor, true);
    };

    // Called by CreatePost after a new post is published manually
    const handlePostCreated = () => {
        // Socket listener already handles this, but we can reset filter if needed
        // For now, let the socket handle it for a seamless flow.
    };

    // Called by PostItem when UI interactions occur
    const handlePostUpdate = (updatedPost) => {
        if (updatedPost._deleted) {
            setPosts(prev => prev.filter(p => p._id !== updatedPost._id));
            return;
        }
        setPosts(prev => prev.map(p => p._id === updatedPost._id ? { ...p, ...updatedPost } : p));
    };

    return (
        <div className={`_layout _layout_main_wrapper ${isDarkMode ? '_dark_wrapper' : ''}`}>
            <div className="_main_layout">
                <Navbar 
                    isDarkMode={isDarkMode} 
                    toggleDarkMode={() => setIsDarkMode(v => !v)} 
                    socket={socket}
                />

                <div className="container _custom_container">
                    <div className="_layout_inner_wrap">
                        <div className="row">
                            <div className="col-xl-3 col-lg-3 col-md-12 col-sm-12">
                                <Sidebar />
                            </div>

                            <div className="col-xl-6 col-lg-6 col-md-12 col-sm-12">
                                <div className="_layout_middle_wrap">
                                    <div className="_layout_middle_inner">
                                        <StorySection />
                                        <CreatePost onPostCreated={handlePostCreated} />
                                        <PostList
                                            posts={posts}
                                            loading={loading}
                                            onPostUpdate={handlePostUpdate}
                                            hasMore={hasMore}
                                            onLoadMore={handleLoadMore}
                                            loadingMore={loadingMore}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="col-xl-3 col-lg-3 col-md-12 col-sm-12">
                                <RightSidebar />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ToastContainer />
        </div>
    );
};

export default Feed;
