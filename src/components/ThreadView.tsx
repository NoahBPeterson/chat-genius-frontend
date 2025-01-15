import React, { useState, useEffect, useRef } from 'react';
import { Thread, Message, User, JWTPayload } from '../types/Types';
import MessageContent from './MessageContent';
import API_Client from '../API_Client';
import { jwtDecode } from 'jwt-decode';

interface ThreadViewProps {
    thread: Thread;
    channelId: string;
    wsRef: React.RefObject<WebSocket>;
    onClose: () => void;
    allMessages: Message[];
    users: User[];
}

const ThreadView: React.FC<ThreadViewProps> = ({ 
    thread, 
    channelId, 
    wsRef, 
    onClose, 
    allMessages, 
    users,
}) => {
    const [messages, setThreadMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout>();
    const threadMessagesRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        if (threadMessagesRef.current) {
            threadMessagesRef.current.scrollTo({
                top: threadMessagesRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        // Scroll to bottom when messages change
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const fetchThreadMessages = async () => {
            if (thread.id !== -1) {
                try {
                    const response = await API_Client.get(`/api/threads/${thread.id}/messages`);
                    if (response.status === 200) {
                        const sortedMessages = [...response.data.messages]
                            .filter(message => message.id !== thread.parent_message_id)
                            .sort((a: Message, b: Message) => 
                                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                            );
                        setThreadMessages(sortedMessages);
                    }
                } catch (error) {
                    console.error('Error fetching thread messages:', error);
                }
            }
        };

        const handleWebSocketMessage = (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            if (data.type === 'thread_message') {
                if (data.message.thread_id === thread.id && data.message.id !== thread.parent_message_id) {
                    // Update thread messages
                    setThreadMessages(prev => {
                        const newMessages = [...prev];
                        const messageIndex = newMessages.findIndex(m => m.id === data.message.id);
                        if (messageIndex === -1) {
                            newMessages.push(data.message);
                        }
                        return newMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                    });
                }
            } else if (data.type === 'thread_created' && data.thread.parent_message_id === thread.parent_message_id) {
                if (thread.id === -1) {
                    thread.id = data.thread.id;
                    fetchThreadMessages();
                }
            } else if (data.type === 'reaction_update') {
                setThreadMessages(prev => prev.map(msg => {
                    if (msg.id === data.messageId) {
                        return {
                            ...msg,
                            reactions: data.reactions
                        };
                    }
                    return msg;
                }));
            }
        };

        if (thread.id !== -1) {
            fetchThreadMessages();
        }
        wsRef.current?.addEventListener('message', handleWebSocketMessage);
        return () => wsRef.current?.removeEventListener('message', handleWebSocketMessage);
    }, [thread.id, thread.parent_message_id, wsRef]);

    const handleSendMessage = () => {
        if (!newMessage.trim()) return;
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            if (thread.id === -1) {
                // Create new thread with first message
                wsRef.current.send(JSON.stringify({
                    type: 'create_thread',
                    channelId: channelId,
                    messageId: thread.parent_message_id,
                    content: newMessage,
                    token: localStorage.getItem('token')
                }));
            } else {
                // Add message to existing thread
                wsRef.current.send(JSON.stringify({
                    type: 'thread_message',
                    threadId: thread.id,
                    channelId: channelId,
                    content: newMessage,
                    token: localStorage.getItem('token')
                }));
            }
            setNewMessage('');
            // Scroll to bottom after sending
            setTimeout(scrollToBottom, 100);
        }
    };

    const handleTyping = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            // Clear existing timeout
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            // Send typing started
            if (!isTyping) {
                setIsTyping(true);
                wsRef.current.send(JSON.stringify({
                    type: 'typing_start',
                    threadId: thread.id,
                    contextType: 'thread',
                    token: localStorage.getItem('token')
                }));
            }

            // Set timeout to stop typing indicator
            typingTimeoutRef.current = setTimeout(() => {
                setIsTyping(false);
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                        type: 'typing_stop',
                        threadId: thread.id,
                        contextType: 'thread',
                        token: localStorage.getItem('token')
                    }));
                }
            }, 3000);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-800 border-l border-gray-700">
            {/* Thread Header */}
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-white">Thread</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white">
                    ✕
                </button>
            </div>

            {/* Parent Message */}
            {(() => {
                const parentMessage = allMessages.find(m => m.id === thread.parent_message_id);
                if (parentMessage) {
                    return (
                        <div className="p-4 border-b border-gray-700">
                            <div className="bg-gray-700 rounded p-3">
                                <div className="flex items-baseline gap-2">
                                    <span className="font-bold text-purple-300">
                                        {parentMessage.display_name}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {new Date(parentMessage.created_at).toLocaleTimeString()}
                                    </span>
                                </div>
                                <div className="mt-1 text-white">
                                    <MessageContent message={parentMessage} wsRef={wsRef} users={users} />
                                </div>
                            </div>
                        </div>
                    );
                }
            })()}

            {/* Thread Messages */}
            <div 
                ref={threadMessagesRef}
                className="flex-1 overflow-y-auto p-4"
            >
                <div className="space-y-4">
                    {thread.id === -1 ? (
                        <div className="text-gray-400 text-center">Start the thread by sending a message</div>
                    ) : (
                        messages.map((message) => (
                            <div 
                                key={message.id} 
                                id={`thread-message-${message.id}`}
                                className="bg-gray-700 rounded p-3"
                            >
                                <div className="flex items-baseline gap-2">
                                    <span className="font-bold text-purple-300">
                                        {message.display_name}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {new Date(message.created_at).toLocaleTimeString()}
                                    </span>
                                </div>
                                <div className="mt-1 text-white">
                                    <MessageContent message={message} wsRef={wsRef} users={users} />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-700">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => {
                            setNewMessage(e.target.value);
                            handleTyping();
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.repeat) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        placeholder={thread.id === -1 ? "Send a message to start the thread..." : "Reply to thread..."}
                        className="flex-1 p-2 rounded bg-gray-700 text-white placeholder-gray-400"
                    />
                </div>
            </div>

            {/* Add typing indicators */}
            {(() => {
                const token = localStorage.getItem('token');
                if (!token) return null;
                
                const currentUserId = Number(jwtDecode<JWTPayload>(token).userId);
                const typingUsers = users.filter(user => 
                    user.is_typing?.threads?.[thread.id] && 
                    user.id !== currentUserId
                );
                if (typingUsers.length === 0) return null;
                
                const names = typingUsers.map(user => user.display_name || user.email);
                let typingText = '';
                if (names.length === 1) {
                    typingText = `${names[0]} is typing...`;
                } else if (names.length === 2) {
                    typingText = `${names[0]} and ${names[1]} are typing...`;
                } else if (names.length === 3) {
                    typingText = `${names[0]}, ${names[1]}, and ${names[2]} are typing...`;
                } else {
                    typingText = `${names[0]}, ${names[1]}, and ${names.length - 2} others are typing...`;
                }

                return (
                    <div className="text-sm text-gray-400 italic ml-4 mb-2">
                        {typingText}
                    </div>
                );
            })()}
        </div>
    );
};

export default ThreadView; 