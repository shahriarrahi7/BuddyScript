import React, { useEffect, useState, useCallback, useRef } from 'react';

// Singleton toast instance
let addToastFn = null;

export const toast = {
    success: (msg, duration) => addToastFn?.('success', msg, duration),
    error:   (msg, duration) => addToastFn?.('error',   msg, duration),
    info:    (msg, duration) => addToastFn?.('info',    msg, duration),
};

const ICONS = {
    success: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    ),
    error: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    ),
    info: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    )
};

const COLORS = {
    success: { bg: '#f0fdf4', border: '#22c55e', text: '#166534', icon: '#22c55e' },
    error:   { bg: '#fef2f2', border: '#ef4444', text: '#991b1b', icon: '#ef4444' },
    info:    { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af', icon: '#3b82f6' }
};

const ToastItem = ({ id, type, message, onRemove }) => {
    const [visible, setVisible] = useState(false);
    const colors = COLORS[type];

    useEffect(() => {
        // Trigger enter animation
        const t = setTimeout(() => setVisible(true), 10);
        return () => clearTimeout(t);
    }, []);

    const handleRemove = useCallback(() => {
        setVisible(false);
        setTimeout(() => onRemove(id), 300);
    }, [id, onRemove]);

    return (
        <div
            role="alert"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderLeft: `4px solid ${colors.border}`,
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                minWidth: '280px',
                maxWidth: '380px',
                color: colors.text,
                fontSize: '14px',
                fontWeight: 500,
                transform: visible ? 'translateX(0)' : 'translateX(120%)',
                opacity: visible ? 1 : 0,
                transition: 'transform 0.3s ease, opacity 0.3s ease',
                fontFamily: 'Inter, -apple-system, sans-serif'
            }}
        >
            <span style={{ color: colors.icon, flexShrink: 0 }}>{ICONS[type]}</span>
            <span style={{ flex: 1, lineHeight: 1.4 }}>{message}</span>
            <button
                onClick={handleRemove}
                style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: colors.text, opacity: 0.5, lineHeight: 1,
                    padding: '2px', flexShrink: 0, fontSize: '18px'
                }}
                aria-label="Dismiss"
            >
                ×
            </button>
        </div>
    );
};

const ToastContainer = () => {
    const [toasts, setToasts] = useState([]);
    const idRef = useRef(0);

    const addToast = useCallback((type, message, duration = 4000) => {
        const id = ++idRef.current;
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => removeToast(id), duration);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    useEffect(() => {
        addToastFn = addToast;
        return () => { addToastFn = null; };
    }, [addToast]);

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                zIndex: 99999,
                pointerEvents: 'none'
            }}
        >
            {toasts.map(t => (
                <div key={t.id} style={{ pointerEvents: 'all' }}>
                    <ToastItem id={t.id} type={t.type} message={t.message} onRemove={removeToast} />
                </div>
            ))}
        </div>
    );
};

export default ToastContainer;
