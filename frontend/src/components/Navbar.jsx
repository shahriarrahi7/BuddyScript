import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/images/logo.svg';
import profileImg from '../assets/images/profile.png';

const Navbar = ({ isDarkMode, toggleDarkMode, socket }) => {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isNotifyOpen, setIsNotifyOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const { user, logout } = useAuth();
    
    const fetchNotifications = useCallback(async () => {
        try {
            console.log('[Navbar] Fetching notifications...');
            const res = await api.get('/notifications');
            console.log(`[Navbar] Fetched ${res.data.length} notifications`);
            setNotifications(res.data);
        } catch (err) {
            console.error('[Navbar] Error fetching notifications:', err.message);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
        
        if (socket) {
            socket.on('new_notification', (notification) => {
                console.log('[Navbar] Real-time notification received');
                setNotifications(prev => [notification, ...prev]);
            });
        }

        // Polling as safety fallback every 60 seconds
        const interval = setInterval(fetchNotifications, 60000);
        return () => {
            clearInterval(interval);
            if (socket) socket.off('new_notification');
        };
    }, [fetchNotifications, socket]);

    const markAsRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        } catch (err) {
            console.error('Error marking as read:', err.message);
        }
    };

    const markAllRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (err) {
            console.error('Error marking all as read:', err.message);
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;
    const displayName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Guest';

    return (
        <>
            {/* Switching Btn Start */}
            <div className="_layout_mode_swithing_btn">
                <button type="button" className="_layout_swithing_btn_link" onClick={toggleDarkMode}>
                    <div className={`_layout_swithing_btn ${isDarkMode ? '_dark_mode' : ''}`}>
                        <div className="_layout_swithing_btn_round"></div>
                    </div>
                    <div className="_layout_change_btn_ic1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="16" fill="none" viewBox="0 0 11 16">
                            <path fill="#fff" d="M2.727 14.977l.04-.498-.04.498zm-1.72-.49l.489-.11-.489.11zM3.232 1.212L3.514.8l-.282.413zM9.792 8a6.5 6.5 0 00-6.5-6.5v-1a7.5 7.5 0 017.5 7.5h-1zm-6.5 6.5a6.5 6.5 0 006.5-6.5h1a7.5 7.5 0 01-7.5 7.5v-1zm-.525-.02c.173.013.348.02.525.02v1c-.204 0-.405-.008-.605-.024l.08-.997zm-.261-1.83A6.498 6.498 0 005.792 7h1a7.498 7.498 0 01-3.791 6.52l-.495-.87zM5.792 7a6.493 6.493 0 00-2.841-5.374L3.514.8A7.493 7.493 0 016.792 7h-1zm-3.105 8.476c-.528-.042-.985-.077-1.314-.155-.316-.075-.746-.242-.854-.726l.977-.217c-.028-.124-.145-.09.106-.03.237.056.6.086 1.165.131l-.08.997zm.314-1.956c-.622.354-1.045.596-1.31.792a.967.967 0 00-.204.185c-.01.013.027-.038.009-.12l-.977.218a.836.836 0 01.144-.666c.112-.162.27-.3.433-.42.324-.24.814-.519 1.41-.858L3 13.52zM3.292 1.5a.391.391 0 00.374-.285A.382.382 0 003.514.8l-.563.826A.618.618 0 012.702.95a.609.609 0 01.59-.45v1z" />
                        </svg>
                    </div>
                    <div className="_layout_change_btn_ic2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="4.389" stroke="#fff" transform="rotate(-90 12 12)" />
                            <path stroke="#fff" strokeLinecap="round" d="M3.444 12H1M23 12h-2.444M5.95 5.95L4.222 4.22M19.778 19.779L18.05 18.05M12 3.444V1M12 23v-2.445M18.05 5.95l1.728-1.729M4.222 19.779L5.95 18.05" />
                        </svg>
                    </div>
                </button>
            </div>
            {/* Switching Btn End */}

            <nav className="navbar navbar-expand-lg navbar-light _header_nav _padd_t10">
                <div className="container _custom_container">
                    <div className="_logo_wrap">
                        <Link className="navbar-brand" to="/">
                            <img src={logo} alt="Image" className="_nav_logo" />
                        </Link>
                    </div>
                    <button className="navbar-toggler bg-light" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent">
                        <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="navbarSupportedContent">
                        <div className="_header_form ms-auto">
                            <form className="_header_form_grp">
                                <svg className="_header_form_svg" xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 17 17">
                                    <circle cx="7" cy="7" r="6" stroke="#666" />
                                    <path stroke="#666" strokeLinecap="round" d="M16 16l-3-3" />
                                </svg>
                                <input className="form-control me-2 _inpt1" type="search" placeholder="input search text" />
                            </form>
                        </div>
                        <ul className="navbar-nav mb-2 mb-lg-0 _header_nav_list ms-auto _mar_r8">
                            <li className="nav-item _header_nav_item">
                                <Link className="nav-link _header_nav_link_active _header_nav_link" to="/">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="21" fill="none" viewBox="0 0 18 21">
                                        <path className="_home_active" stroke="#000" strokeWidth="1.5" strokeOpacity=".6" d="M1 9.924c0-1.552 0-2.328.314-3.01.313-.682.902-1.187 2.08-2.196l1.143-.98C6.667 1.913 7.732 1 9 1c1.268 0 2.333.913 4.463 2.738l1.142.98c1.179 1.01 1.768 1.514 2.081 2.196.314.682.314 1.458.314 3.01v4.846c0 2.155 0 3.233-.67 3.902-.669.67-1.746.67-3.901.67H5.57c-2.155 0-3.232 0-3.902-.67C1 18.002 1 16.925 1 14.77V9.924z" />
                                        <path className="_home_active" stroke="#000" strokeOpacity=".6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11.857 19.341v-5.857a1 1 0 00-1-1H7.143a1 1 0 00-1 1v5.857" />
                                    </svg>
                                </Link>
                            </li>
                            <li className="nav-item _header_nav_item">
                                <Link className="nav-link _header_nav_link" to="/friend-request">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="20" fill="none" viewBox="0 0 26 20">
                                        <path fill="#000" fillOpacity=".6" fillRule="evenodd" d="M12.79 12.15h.429c2.268.015 7.45.243 7.45 3.732 0 3.466-5.002 3.692-7.415 3.707h-.894c-2.268-.015-7.452-.243-7.452-3.727 0-3.47 5.184-3.697 7.452-3.711l.297-.001h.132zm0 1.75c-2.792 0-6.12.34-6.12 1.962 0 1.585 3.13 1.955 5.864 1.976l.255.002c2.792 0 6.118-.34 6.118-1.958 0-1.638-3.326-1.982-6.118-1.982zm9.343-2.224c2.846.424 3.444 1.751 3.444 2.79 0 .636-.251 1.794-1.931 2.43a.882.882 0 01-1.137-.506.873.873 0 01.51-1.13c.796-.3.796-.633.796-.793 0-.511-.654-.868-1.944-1.06a.878.878 0 01-.741-.996.886.886 0 011.003-.735zm-17.685.735a.878.878 0 01-.742.997c-1.29.19-1.944.548-1.944 1.059 0 .16 0 .491.798.793a.873.873 0 01-.314 1.693.897.897 0 01-.313-.057C.25 16.259 0 15.1 0 14.466c0-1.037.598-2.366 3.446-2.79.485-.06.929.257 1.002.735zM12.789 0c2.96 0 5.368 2.392 5.368 5.33 0 2.94-2.407 5.331-5.368 5.331h-.031a5.329 5.329 0 01-3.782-1.57 5.253 5.253 0 01-1.553-3.764C7.423 2.392 9.83 0 12.789 0zm0 1.75c-1.987 0-3.604 1.607-3.604 3.58a3.526 3.526 0 001.04 2.527 3.58 3.58 0 002.535 1.054l.03.875v-.875c1.987 0 3.605-1.605 3.605-3.58S14.777 1.75 12.789 1.75zm7.27-.607a4.222 4.222 0 013.566 4.172c-.004 2.094-1.58 3.89-3.665 4.181a.88.88 0 01-.994-.745.875.875 0 01.75-.989 2.494 2.494 0 002.147-2.45 2.473 2.473 0 00-2.09-2.443.876.876 0 01-.726-1.005.881.881 0 011.013-.721zm-13.528.72a.876.876 0 01-.726 1.006 2.474 2.474 0 00-2.09 2.446A2.493 2.493 0 005.86 7.762a.875.875 0 11-.243 1.734c-2.085-.29-3.66-2.087-3.664-4.179 0-2.082 1.5-3.837 3.566-4.174a.876.876 0 011.012.72z" clipRule="evenodd" />
                                    </svg>
                                </Link>
                            </li>
                            <li className="nav-item _header_nav_item">
                                <span id="_notify_btn" className={`nav-link _header_nav_link _header_notify_btn`} onClick={() => setIsNotifyOpen(!isNotifyOpen)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="22" fill="none" viewBox="0 0 20 22">
                                        <path fill="#000" fillOpacity=".6" fillRule="evenodd" d="M7.547 19.55c.533.59 1.218.915 1.93.915.714 0 1.403-.324 1.938-.916a.777.777 0 011.09-.056c.318.284.344.77.058 1.084-.832.917-1.927 1.423-3.086 1.423h-.002c-1.155-.001-2.248-.506-3.077-1.424a.762.762 0 01.057-1.083.774.774 0 011.092.057zM9.527 0c4.58 0 7.657 3.543 7.657 6.85 0 1.702.436 2.424.899 3.19.457.754.976 1.612.976 3.233-.36 4.14-4.713 4.478-9.531 4.478-4.818 0-9.172-.337-9.528-4.413-.003-1.686.515-2.544.973-3.299l.161-.27c.398-.679.737-1.417.737-2.918C1.871 3.543 4.948 0 9.528 0zm0 1.535c-3.6 0-6.11 2.802-6.11 5.316 0 2.127-.595 3.11-1.12 3.978-.422.697-.755 1.247-.755 2.444.173 1.93 1.455 2.944 7.986 2.944 6.494 0 7.817-1.06 7.988-3.01-.003-1.13-.336-1.681-.757-2.378-.526-.868-1.12-1.851-1.12-3.978 0-2.514-2.51-5.316-6.111-5.316z" clipRule="evenodd" />
                                    </svg>
                                    {unreadCount > 0 && <span className="_counting">{unreadCount}</span>}
                                    <div id="_notify_drop" className={`_notification_dropdown ${isNotifyOpen ? 'show' : ''}`}>
                                        <div className="_notifications_content">
                                            <h4 className="_notifications_content_title">Notifications</h4>
                                            <div className="_notification_box_right">
                                                <button type="button" className="_notification_box_right_link">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="4" height="17" fill="none" viewBox="0 0 4 17">
                                                        <circle cx="2" cy="2" r="2" fill="#C4C4C4"></circle>
                                                        <circle cx="2" cy="8" r="2" fill="#C4C4C4"></circle>
                                                        <circle cx="2" cy="15" r="2" fill="#C4C4C4"></circle>
                                                    </svg>
                                                </button>
                                                <div className="_notifications_drop_right">
                                                    <ul className="_notification_list">
                                                        <li className="_notification_item" onClick={markAllRead} style={{ cursor: 'pointer' }}>
                                                            <span className="_notification_link">Mark all as read</span>
                                                        </li>
                                                        {/* Other options removed for simplicity */}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="_notifications_drop_box">
                                            <div className="_notifications_drop_btn_grp">
                                                <button className="_notifications_btn_link">All</button>
                                                <button className="_notifications_btn_link1">Unread</button>
                                            </div>
                                            <div className="_notifications_all">
                                                {notifications.length === 0 ? (
                                                    <div className="_notification_box">
                                                        <p style={{ padding: '10px', color: '#888' }}>No notifications yet.</p>
                                                    </div>
                                                ) : (
                                                    notifications.map(n => {
                                                        let message = '';
                                                        const senderName = n.sender ? `${n.sender.firstName} ${n.sender.lastName}` : 'Someone';
                                                        
                                                        if (n.type === 'like') message = <span><b>{senderName}</b> liked your post.</span>;
                                                        if (n.type === 'comment_like') message = <span><b>{senderName}</b> liked your comment.</span>;
                                                        if (n.type === 'comment') message = <span><b>{senderName}</b> commented on your post.</span>;
                                                        if (n.type === 'share') message = <span><b>{senderName}</b> shared your post.</span>;
                                                        if (n.type === 'reply') message = <span><b>{senderName}</b> replied to your comment.</span>;

                                                        return (
                                                            <div 
                                                                key={n._id} 
                                                                className={`_notification_box ${!n.isRead ? '_unread' : ''}`}
                                                                onClick={() => markAsRead(n._id)}
                                                                style={{ background: !n.isRead ? '#f0faff' : 'transparent', cursor: 'pointer', transition: 'background 0.2s', borderBottom: '1px solid #efefef' }}
                                                            >
                                                                <div className="_notification_image">
                                                                    <img src={n.sender?.avatarUrl || profileImg} alt="Image" className="_notify_img" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                                                                </div>
                                                                <div className="_notification_txt">
                                                                    <p className="_notification_para" style={{ marginBottom: '4px' }}>
                                                                        {message}
                                                                    </p>
                                                                    <div className="_nitification_time">
                                                                        <span>{new Date(n.createdAt).toLocaleString()}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </span>
                            </li>
                            <li className="nav-item _header_nav_item">
                                <Link className="nav-link _header_nav_link" to="/chat">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="23" height="22" fill="none" viewBox="0 0 23 22">
                                        <path fill="#000" fillOpacity=".6" fillRule="evenodd" d="M11.43 0c2.96 0 5.743 1.143 7.833 3.22 4.32 4.29 4.32 11.271 0 15.562C17.145 20.886 14.293 22 11.405 22c-1.575 0-3.16-.33-4.643-1.012-.437-.174-.847-.338-1.14-.338-.338.002-.793.158-1.232.308-.9.307-2.022.69-2.852-.131-.826-.822-.445-1.932-.138-2.826.152-.44.307-.895.307-1.239 0-.282-.137-.642-.347-1.161C-.57 11.46.322 6.47 3.596 3.22A11.04 11.04 0 0111.43 0zm0 1.535A9.5 9.5 0 004.69 4.307a9.463 9.463 0 00-1.91 10.686c.241.592.474 1.17.474 1.77 0 .598-.207 1.201-.39 1.733-.15.439-.378 1.1-.231 1.245.143.147.813-.085 1.255-.235.53-.18 1.133-.387 1.73-.391.597 0 1.161.225 1.758.463 3.655 1.679 7.98.915 10.796-1.881 3.716-3.693 3.716-9.7 0-13.391a9.5 9.5 0 00-6.74-2.77zm4.068 8.867c.57 0 1.03.458 1.03 1.024 0 .566-.46 1.023-1.03 1.023a1.023 1.023 0 11-.01-2.047h.01zm-4.131 0c.568 0 1.03.458 1.03 1.024 0 .566-.462 1.023-1.03 1.023a1.03 1.03 0 01-1.035-1.024c0-.566.455-1.023 1.025-1.023h.01zm-4.132 0c.568 0 1.03.458 1.03 1.024 0 .566-.462 1.023-1.03 1.023a1.022 1.022 0 11-.01-2.047h.01z" clipRule="evenodd" />
                                    </svg> <span className="_counting">2</span>
                                </Link>
                            </li>
                        </ul>
                        <div className="_header_nav_profile">
                            <div className="_header_nav_profile_image">
                                <img src={profileImg} alt="Image" className="_nav_profile_img" />
                            </div>
                            <div className="_header_nav_dropdown" onClick={() => setIsProfileOpen(!isProfileOpen)}>
                                <p className="_header_nav_para">{displayName}</p>
                                <button id="_profile_drop_show_btn" className="_header_nav_dropdown_btn _dropdown_toggle" type="button">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="6" fill="none" viewBox="0 0 10 6">
                                        <path fill="#112032" d="M5 5l.354.354L5 5.707l-.354-.353L5 5zm4.354-3.646l-4 4-.708-.708 4-4 .708.708zm-4.708 4l-4-4 .708-.708 4 4-.708.708z" />
                                    </svg>
                                </button>
                            </div>
                            {/* profile dropdown */}
                            <div id="_prfoile_drop" className={`_nav_profile_dropdown _profile_dropdown ${isProfileOpen ? 'show' : ''}`}>
                                <div className="_nav_profile_dropdown_info">
                                    <div className="_nav_profile_dropdown_image">
                                        <img src={profileImg} alt="Image" className="_nav_drop_img" />
                                    </div>
                                    <div className="_nav_profile_dropdown_info_txt">
                                        <h4 className="_nav_dropdown_title">{displayName}</h4>
                                        <Link to="/profile" className="_nav_drop_profile">View Profile</Link>
                                    </div>
                                </div>
                                <hr />
                                <ul className="_nav_dropdown_list">
                                    <li className="_nav_dropdown_list_item">
                                        <a href="#0" className="_nav_dropdown_link">
                                            <div className="_nav_drop_info">
                                                <span>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="19" fill="none" viewBox="0 0 18 19">
                                                        <path fill="#377DFF" d="M9.584 0c.671 0 1.315.267 1.783.74.468.473.721 1.112.7 1.709l.009.14a.985.985 0 00.136.395c.145.242.382.418.659.488.276.071.57.03.849-.13l.155-.078c1.165-.538 2.563-.11 3.21.991l.58.99a.695.695 0 01.04.081l.055.107c.519 1.089.15 2.385-.838 3.043l-.244.15a1.046 1.046 0 00-.313.339 1.042 1.042 0 00-.11.805c.074.272.255.504.53.66l.158.1c.478.328.823.812.973 1.367.17.626.08 1.292-.257 1.86l-.625 1.022-.094.144c-.735 1.038-2.16 1.355-3.248.738l-.129-.066a1.123 1.123 0 00-.412-.095 1.087 1.087 0 00-.766.31c-.204.2-.317.471-.316.786l-.008.163C11.956 18.022 10.88 19 9.584 19h-1.17c-1.373 0-2.486-1.093-2.484-2.398l-.008-.14a.994.994 0 00-.14-.401 1.066 1.066 0 00-.652-.493 1.12 1.12 0 00-.852.127l-.169.083a2.526 2.526 0 01-1.698.122 2.47 2.47 0 01-1.488-1.154l-.604-1.024-.08-.152a2.404 2.404 0 01.975-3.132l.1-.061c.292-.199.467-.527.467-.877 0-.381-.207-.733-.569-.94l-.147-.092a2.419 2.419 0 01-.724-3.236l.615-.993a2.503 2.503 0 013.366-.912l.126.066c.13.058.269.089.403.09a1.08 1.08 0 001.086-1.068l.008-.185c.049-.57.301-1.106.713-1.513A2.5 2.5 0 018.414 0h1.17zm0 1.375h-1.17c-.287 0-.562.113-.764.312-.179.177-.288.41-.308.628l-.012.29c-.098 1.262-1.172 2.253-2.486 2.253a2.475 2.475 0 01-1.013-.231l-.182-.095a1.1 1.1 0 00-1.488.407l-.616.993a1.05 1.05 0 00.296 1.392l.247.153A2.43 2.43 0 013.181 9.5c0 .802-.401 1.552-1.095 2.023l-.147.091c-.486.276-.674.873-.448 1.342l.053.102.597 1.01c.14.248.374.431.652.509.246.069.51.05.714-.04l.103-.05a2.506 2.506 0 011.882-.248 2.456 2.456 0 011.823 2.1l.02.335c.059.535.52.95 1.079.95h1.17c.566 0 1.036-.427 1.08-.95l.005-.104a2.412 2.412 0 01.726-1.732 2.508 2.508 0 011.779-.713c.331.009.658.082.992.23l.3.15c.469.202 1.026.054 1.309-.344l.068-.105.61-1a1.045 1.045 0 00-.288-1.383l-.257-.16a2.435 2.435 0 01-1.006-1.389 2.393 2.393 0 01.25-1.847c.181-.31.429-.575.752-.795l.152-.095c.485-.278.672-.875.448-1.346l-.067-.127-.012-.027-.554-.945a1.095 1.095 0 00-1.27-.487l-.105.041-.098.049a2.515 2.515 0 01-1.88.259 2.47 2.47 0 01-1.511-1.122 2.367 2.367 0 01-.325-.97l-.012-.24a1.056 1.056 0 00-.307-.774 1.096 1.096 0 00-.779-.323zm-.58 5.02c1.744 0 3.16 1.39 3.16 3.105s-1.416 3.105-3.16 3.105c-1.746 0-3.161-1.39-3.161-3.105s1.415-3.105 3.16-3.105zm0 1.376c-.973 0-1.761.774-1.761 1.729 0 .955.788 1.73 1.76 1.73s1.76-.775 1.76-1.73-.788-1.73-1.76-1.73z" />
                                                    </svg>
                                                </span>
                                                Settings
                                            </div>
                                        </a>
                                    </li>
                                    {/* Add logout and other items */}
                                    <li className="_nav_dropdown_list_item">
                                        <a href="#0" className="_nav_dropdown_link" onClick={(e) => { e.preventDefault(); logout(); }}>
                                            <div className="_nav_drop_info">
                                                <span>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" fill="none" viewBox="0 0 19 19">
                                                        <path stroke="#377DFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6.667 18H2.889A1.889 1.889 0 011 16.111V2.89A1.889 1.889 0 012.889 1h3.778M13.277 14.222L18 9.5l-4.723-4.722M18 9.5H6.667" />
                                                    </svg>
                                                </span>
                                                Log Out
                                            </div>
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
        </>
    );
};

export default Navbar;
