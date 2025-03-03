import React, { useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { JWTPayload } from '../types/Types';

interface MessageReactionsProps {
    messageId: number;
    reactions: {
        [emoji: string]: {
            count: number;
            users: string[];
        };
    };
    wsRef: React.RefObject<WebSocket>;
}

const COMMON_EMOJIS = ['👍', '❤️', '😂', '🎉', '🤔', '👀', '🚀', '👎'];

const MessageReactions: React.FC<MessageReactionsProps> = ({ messageId, reactions, wsRef }) => {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const currentUserId = jwtDecode<JWTPayload>(localStorage.getItem('token') as string).userId.toString();

    const handleReactionClick = (emoji: string) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        wsRef.current.send(JSON.stringify({
            type: 'update_reaction',
            messageId,
            emoji,
            token: localStorage.getItem('token')
        }));

        setShowEmojiPicker(false);
    };

    return (
        <div className="flex items-center gap-1 mt-1 relative">
            <div className="flex items-center gap-1 flex-wrap">
                {Object.entries(reactions).map(([emoji, data]) => (
                    <button
                        key={emoji}
                        onClick={() => handleReactionClick(emoji)}
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs rounded-full border transition-colors duration-150
                            ${data.users.includes(currentUserId) 
                                ? 'bg-purple-500 border-purple-400 text-white hover:bg-purple-600' 
                                : 'bg-purple-900 border-purple-700 text-white hover:bg-purple-800'}`}
                        title={`${data.count} ${data.count === 1 ? 'reaction' : 'reactions'}`}
                    >
                        <span>{emoji}</span>
                        <span className="text-xs">{data.count}</span>
                    </button>
                ))}
            </div>

            <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-white hover:text-purple-300 rounded-full w-5 h-5 min-w-[1.25rem] flex items-center justify-center hover:bg-purple-700 text-sm leading-none"
            >
                +
            </button>

            {showEmojiPicker && (
                <div className="absolute bottom-full left-0 bg-purple-900 border border-purple-700 rounded-lg shadow-lg p-1 mb-1 z-10">
                    <div className="flex gap-1">
                        {COMMON_EMOJIS.map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => handleReactionClick(emoji)}
                                className="hover:bg-purple-700 p-1.5 rounded text-sm"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MessageReactions; 