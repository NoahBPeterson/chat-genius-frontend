import React from 'react';
import { Message } from '../types/Types';
import MessageReactions from './MessageReactions';

interface MessageContentProps {
    message: Message;
    wsRef: React.RefObject<WebSocket>;
}

const MessageContent: React.FC<MessageContentProps> = ({ message, wsRef }) => {
    if (!message) return null;
    
    return (
        <div className="flex flex-col">
            <span>{message.content}</span>
            {message.attachments && message.attachments.length > 0 && (
                <div className="mt-2">
                    {message.attachments.map((attachment, index) => (
                        <div key={index} className="text-blue-500 hover:underline">
                            <a href={attachment.storage_path} target="_blank" rel="noopener noreferrer">
                                {attachment.filename}
                            </a>
                        </div>
                    ))}
                </div>
            )}
            <MessageReactions
                messageId={message.id}
                reactions={message.reactions || {}}
                wsRef={wsRef}
            />
        </div>
    );
};

export default MessageContent; 