import React from 'react';
import './SocialUI.css';

const reactions = [
    { type: 'like', label: 'Like', emoji: '👍', color: '#1877f2' },
    { type: 'love', label: 'Love', emoji: '❤️', color: '#f33e58' },
    { type: 'haha', label: 'Haha', emoji: '😆', color: '#f7b125' },
    { type: 'care', label: 'Care', emoji: '🥰', color: '#f7b125' },
    { type: 'angry', label: 'Angry', emoji: '😡', color: '#e9710f' }
];

const ReactionPicker = ({ onSelect }) => {
    return (
        <div className="_reaction_picker_wrapper">
            <div className="_reaction_picker_container">
                {reactions.map((reaction) => (
                    <div
                        key={reaction.type}
                        className="_reaction_item"
                        onClick={() => onSelect(reaction.type)}
                        title={reaction.label}
                    >
                        <span className="_reaction_emoji_large">{reaction.emoji}</span>
                        <div className="_reaction_label_text">{reaction.label}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ReactionPicker;
