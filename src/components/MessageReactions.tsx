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

        const hasReacted = reactions[emoji]?.users.includes(currentUserId);
        const messageType = hasReacted ? 'remove_reaction' : 'add_reaction';

        wsRef.current.send(JSON.stringify({
            type: messageType,
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
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs rounded-full border 
                            ${data.users.includes(currentUserId) 
                                ? 'bg-purple-100 border-purple-300 text-purple-700' 
                                : 'bg-gray-800 border-gray-500 text-white-700 hover:bg-gray-700'}`}
                        title={`${data.count} ${data.count === 1 ? 'reaction' : 'reactions'}`}
                    >
                        <span>{emoji}</span>
                        <span className="text-xs">{data.count}</span>
                    </button>
                ))}
            </div>

            <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-gray-400 hover:text-gray-600 rounded-full w-5 h-5 min-w-[1.25rem] flex items-center justify-center hover:bg-gray-400 text-sm leading-none"
            >
                +
            </button>

            {showEmojiPicker && (
                <div className="absolute top-full left-0 bg-gray-700 border rounded-lg shadow-lg p-1 mt-1 z-10">
                    <div className="flex gap-1">
                        {COMMON_EMOJIS.map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => handleReactionClick(emoji)}
                                className="hover:bg-gray-100 p-1.5 rounded text-sm"
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