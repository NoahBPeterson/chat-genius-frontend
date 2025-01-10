import React, { useState, useRef, useEffect } from 'react';
import { Channel, Message, Thread } from '../types/Types';
import { jwtDecode } from 'jwt-decode';
import { User, JWTPayload } from '../types/Types';
import FileUpload from './FileUpload';
import MessageContent from './MessageContent';
import ThreadView from './ThreadView';
import { useNavigate } from 'react-router-dom';

interface MessagesProps {
    channelId: string;
    channelName?: string;
    isDM: boolean;
    messages: Message[];
    onSendMessage: (content: string) => void;
    isSearchResults?: boolean;
    channels?: Channel[];
    users?: User[];
    onMessageClick?: (channelId: string, messageId: string, threadParentMessageId?: string) => void;
    onFileUpload: (storagePath: string, filename: string, size: number, mimeType: string) => void;
    onTyping: (isTyping: boolean) => void;
    wsRef: React.RefObject<WebSocket>;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

const Messages: React.FC<MessagesProps> = ({ 
    channelId, 
    channelName, 
    isDM,
    messages,
    onSendMessage,
    isSearchResults = false,
    channels = [],
    users = [],
    onMessageClick,
    onFileUpload,
    onTyping,
    wsRef,
    setMessages
}) => {
    const [newMessage, setNewMessage] = useState<string>('');
    const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
    const [hasNewMessages, setHasNewMessages] = useState<boolean>(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const highlightedMessageId = useRef<string | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout>();
    const navigate = useNavigate();

    const scrollToBottom = (force: boolean = false) => {
        if (highlightedMessageId.current && !force) {
            setHasNewMessages(true);
            return;
        }
        messagesContainerRef.current?.scrollTo({
            top: messagesContainerRef.current.scrollHeight,
            behavior: force ? "auto" : "smooth"
        });
        setHasNewMessages(false);
    };

    const handleNewMessages = () => {
        highlightedMessageId.current = null;
        navigate('/', { replace: true });
        scrollToBottom(true);
    };

    const scrollToMessage = (messageId: string) => {
        highlightedMessageId.current = messageId;
        setTimeout(() => {
            const messageElement = document.getElementById(`message-${messageId}`);
            if (messageElement && messagesContainerRef.current) {
                const containerRect = messagesContainerRef.current.getBoundingClientRect();
                const messageRect = messageElement.getBoundingClientRect();
                const scrollTop = messageRect.top - containerRect.top - (containerRect.height / 2) + messagesContainerRef.current.scrollTop;
                
                messagesContainerRef.current.scrollTo({
                    top: scrollTop,
                    behavior: 'smooth'
                });
                
                messageElement.classList.remove('bg-purple-700');
                messageElement.classList.add('bg-purple-400');
                
                setTimeout(() => {
                    messageElement.classList.remove('bg-purple-400');
                    messageElement.classList.add('bg-purple-700');
                }, 2000);
            }
        }, 100);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim()) {
            onSendMessage(newMessage);
            setNewMessage('');
            scrollToBottom(true);
        }
    };

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const messageId = urlParams.get('message');
        const threadMessageId = urlParams.get('thread_message');

        if (messageId) {
            scrollToMessage(messageId);
            // Only open the thread if there's a thread_message parameter
            // and it's different from the message parameter (meaning it's a thread reply)
            if (threadMessageId && threadMessageId !== messageId) {
                const message = messages.find(m => String(m.id) === String(messageId));
                if (message) {
                    handleCreateThread(messageId);
                    // After a short delay to let the thread view open, highlight the thread message
                    setTimeout(() => {
                        const threadMessageElement = document.getElementById(`thread-message-${threadMessageId}`);
                        if (threadMessageElement) {
                            threadMessageElement.classList.remove('bg-gray-700');
                            threadMessageElement.classList.add('bg-purple-400');
                            setTimeout(() => {
                                threadMessageElement.classList.remove('bg-purple-400');
                                threadMessageElement.classList.add('bg-gray-700');
                            }, 2000);
                        }
                    }, 500); // Wait for thread view to open
                }
            }
        } else {
            // Only scroll if there's no specific message to highlight
            scrollToBottom(true);
        }
    }, [messages, channelId]);

    const getChannelName = (channelId: string) => {
        const channel = channels.find(c => c.id == channelId);
        if (!channel) return 'Unknown Channel';

        if (channel.is_dm) {
            const currentUserId = Number(jwtDecode<JWTPayload>(localStorage.getItem('token') as string).userId);
            const otherUserId = channel.dm_participants.find((id: number) => id !== currentUserId);
            
            const otherUser = users.find(u => Number(u.id) === otherUserId);
            return otherUser?.display_name ?? otherUser?.email ?? 'Unknown User';
        }

        return channel.name;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);
        
        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Send typing started
        onTyping(true);

        // Set timeout to stop typing indicator
        typingTimeoutRef.current = setTimeout(() => {
            onTyping(false);
        }, 3000);
    };

    useEffect(() => {
        const handleWebSocketMessage = (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            if (data.type === 'thread_created' && data.thread.channel_id === Number(channelId)) {
                setSelectedThread(data.thread);
            } else if (data.type === 'thread_message' && data.message.channel_id === Number(channelId)) {
                // Update reply count even if thread is not open
                setMessages(prevMessages => 
                    prevMessages.map(msg => {
                        if (msg.id === data.message.parent_message_id && msg.thread) {
                            return {
                                ...msg,
                                thread: {
                                    ...msg.thread,
                                    reply_count: msg.thread.reply_count + 1,
                                    last_reply_at: data.message.created_at
                                }
                            };
                        }
                        return msg;
                    })
                );
            }
        };

        wsRef.current?.addEventListener('message', handleWebSocketMessage);
        return () => wsRef.current?.removeEventListener('message', handleWebSocketMessage);
    }, [channelId, setMessages]);

    const handleCreateThread = (messageId: string) => {
        // Find the message that will start the thread
        const message = messages.find(msg => msg.id.toString() === messageId);

        if (message) {
            const tempThread: Thread = {
                id: message.thread?.id || -1,
                channel_id: Number(channelId),
                parent_message_id: message.id,
                created_at: message.created_at,
                last_reply_at: message.thread?.last_reply_at || message.created_at,
                thread_starter_content: message.content,
                thread_starter_name: message.display_name,
                thread_starter_id: Number(message.user_id),
                reply_count: message.thread?.reply_count || 0
            };
            setSelectedThread(tempThread);
        }
    };

    return (
        <div className="flex h-screen w-full">
            <div className="flex flex-col flex-grow">
                <div className="sticky top-0 z-10 p-4 bg-purple-700">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-white">
                            {isSearchResults ? (
                                <span>🔍 {channelName}</span>
                            ) : isDM ? (
                                <span>
                                    <span className="mr-2">👤</span>
                                    {channelName}
                                </span>
                            ) : (
                                <span>#{channelName || channelId}</span>
                            )}
                        </h2>
                        {hasNewMessages && (
                            <button
                                onClick={handleNewMessages}
                                className="px-3 py-1 bg-purple-500 hover:bg-purple-400 text-white rounded-full text-sm flex items-center gap-1"
                            >
                                <span>↓</span> New Messages
                            </button>
                        )}
                    </div>
                </div>

                <div 
                    ref={messagesContainerRef}
                    className="flex-1 overflow-y-auto p-4 bg-purple-800"
                >
                    <ul className="space-y-2">
                        {messages
                            .filter(message => isSearchResults || message.is_thread_parent || message.thread_id == null)
                            .map((message) => (
                            <li
                                key={message.id}
                                id={`message-${message.id}`}
                                className={`p-2 rounded text-white transition-all duration-300 ease-in-out
                                    ${isSearchResults ? 'cursor-pointer hover:bg-purple-600' : ''}
                                    bg-purple-700 hover:bg-purple-600`}
                            >
                                <div className="flex flex-col">
                                    {isSearchResults && (
                                        <div className="text-sm text-purple-400 mb-1">
                                            in {message.thread_id ? 
                                                `Thread in ${channels.find(c => Number(c.id) == message.channel_id)?.is_dm ? 
                                                    `DM: ${getChannelName(message.channel_id.toString())}` : 
                                                    `#${channels.find(c => Number(c.id) == message.channel_id)?.name || 'Unknown Channel'}`}` :
                                                channels.find(c => Number(c.id) == message.channel_id)?.is_dm ? 
                                                    `DM: ${getChannelName(message.channel_id.toString())}` : 
                                                    `#${channels.find(c => Number(c.id) == message.channel_id)?.name || 'Unknown Channel'}`}
                                        </div>
                                    )}
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-bold text-purple-300">
                                            {message.display_name}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {new Date(message.created_at).toLocaleTimeString()}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const baseUrl = window.location.origin;
                                                const url = message.thread_parent_message_id 
                                                    ? `${baseUrl}/?message=${message.thread_parent_message_id}&thread_message=${message.id}`
                                                    : `${baseUrl}/?message=${message.id}`;
                                                navigator.clipboard.writeText(url);
                                                // Optional: Show a tooltip or notification that the link was copied
                                            }}
                                            className="text-xs text-gray-400 hover:text-purple-300"
                                            title="Copy link to message"
                                        >
                                            🔗
                                        </button>
                                        {!isSearchResults && (
                                            <button
                                                onClick={() => handleCreateThread(message.id.toString())}
                                                className="ml-auto text-xs text-purple-400 hover:text-purple-300"
                                            >
                                                💬 {message.thread?.reply_count 
                                                    ? `${message.thread.reply_count} ${message.thread.reply_count === 1 ? 'reply' : 'replies'}` 
                                                    : 'Reply in Thread'}
                                            </button>
                                        )}
                                    </div>
                                    <div 
                                        className="mt-1 break-all whitespace-pre-wrap"
                                        onClick={() => {
                                            if (isSearchResults && onMessageClick) {
                                                onMessageClick(
                                                    message.channel_id.toString(), 
                                                    message.id.toString(),
                                                    message.thread_parent_message_id?.toString()
                                                );
                                            }
                                        }}
                                    >
                                        <MessageContent message={message} wsRef={wsRef} />
                                    </div>
                                </div>
                            </li>
                        ))}
                        <div ref={messagesEndRef} />
                    </ul>
                    {(() => {
                        const typingUsers = users.filter(user => user.is_typing?.channels?.[channelId]);
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
                            <div className="text-sm text-gray-400 italic">
                                {typingText}
                            </div>
                        );
                    })()}
                </div>

                {!isSearchResults && (
                    <div className="p-4 border-t border-purple-700 bg-purple-900">
                        <div className="flex items-center gap-2">
                            <FileUpload onUploadComplete={onFileUpload} />
                            <input
                                type="text"
                                value={newMessage}
                                onChange={handleInputChange}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.repeat) {
                                        e.preventDefault();
                                        handleSubmit(e);
                                    }
                                }}
                                placeholder="Type your message..."
                                className="w-full p-2 border rounded bg-purple-700 text-white placeholder-gray-400"
                            />
                        </div>
                    </div>
                )}
            </div>

            {selectedThread && (
                <div className="w-96 border-l border-gray-700">
                    <ThreadView
                        thread={selectedThread}
                        channelId={channelId}
                        wsRef={wsRef}
                        onClose={() => setSelectedThread(null)}
                        allMessages={messages}
                        users={users}
                    />
                </div>
            )}
        </div>
    );
};

export default Messages;