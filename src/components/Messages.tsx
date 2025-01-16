import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Channel, Message, Thread } from '../types/Types';
import { jwtDecode } from 'jwt-decode';
import { User, JWTPayload } from '../types/Types';
import FileUpload from './FileUpload';
import MessageContent from './MessageContent';
import ThreadView from './ThreadView';
import { useNavigate } from 'react-router-dom';
import MentionAutocomplete from './MentionAutocomplete';
import MessageReactions from './MessageReactions';

interface MessagesProps {
    channelId: number;
    channelName?: string;
    isDM: boolean;
    messages: Message[];
    onSendMessage: (content: string) => void;
    isSearchResults?: boolean;
    channels?: Channel[];
    users?: User[];
    onMessageClick?: (channelId: number, messageId: number, threadParentMessageId?: number) => void;
    onFileUpload: (storagePath: string, filename: string, size: number, mimeType: string) => void;
    onTyping: (isTyping: boolean) => void;
    wsRef: React.RefObject<WebSocket>;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export interface MessagesRef {
    focus: () => void;
}

const Messages = forwardRef<MessagesRef, MessagesProps>(({ 
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
}, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
        focus: () => {
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }
    }));

    // Focus input on mount
    useEffect(() => {
        if (inputRef.current && !isSearchResults) {
            inputRef.current.focus();
        }
    }, [isSearchResults]);

    const [newMessage, setNewMessage] = useState<string>('');
    const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
    const [hasNewMessages, setHasNewMessages] = useState<boolean>(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const highlightedMessageId = useRef<number | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout>();
    const navigate = useNavigate();
    const [mentionState, setMentionState] = useState<{
        active: boolean;
        searchTerm: string;
        position: { bottom: number; left: number };
        startIndex: number;
    }>({
        active: false,
        searchTerm: '',
        position: { bottom: 0, left: 0 },
        startIndex: 0
    });

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

    const scrollToMessage = (messageId: number) => {
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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setNewMessage(value);
        
        // Handle @ mentions
        const caretPosition = e.target.selectionStart || 0;
        const textBeforeCaret = value.slice(0, caretPosition);
        const lastAtSymbol = textBeforeCaret.lastIndexOf('@');
        
        if (lastAtSymbol !== -1 && 
            (lastAtSymbol === 0 || value[lastAtSymbol - 1] === ' ') && 
            caretPosition > lastAtSymbol) {
            const searchTerm = textBeforeCaret.slice(lastAtSymbol + 1);
            const rect = e.target.getBoundingClientRect();
            
            // Calculate position relative to viewport bottom
            const viewportHeight = window.innerHeight;
            const distanceFromBottom = viewportHeight - rect.top;
            
            setMentionState({
                active: true,
                searchTerm,
                position: {
                    bottom: distanceFromBottom,
                    left: rect.left + (lastAtSymbol * 8), // Approximate character width
                },
                startIndex: lastAtSymbol
            });
        } else {
            setMentionState(prev => ({ ...prev, active: false }));
        }

        // Handle typing indicator
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        onTyping(true);
        typingTimeoutRef.current = setTimeout(() => {
            onTyping(false);
        }, 3000);
    };

    const handleUserMention = async (user: User | null) => {
        if (!user) {
            setMentionState(prev => ({ ...prev, active: false }));
            return;
        }

        const prefix = newMessage.slice(0, mentionState.startIndex);
        const suffix = newMessage.slice(inputRef.current?.selectionStart || 0);
        const mention = `@${user.display_name || user.email} `;
        
        const newValue = `${prefix}${mention}${suffix}`;
        
        setNewMessage(newValue);
        setMentionState(prev => ({ ...prev, active: false }));
        
        // Focus the input and place cursor after the mention (including space)
        if (inputRef.current) {
            inputRef.current.focus();
            const cursorPosition = prefix.length + mention.length;
            inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() && !mentionState.active) {
            onSendMessage(newMessage);
            setNewMessage('');
            onTyping(false);
            scrollToBottom(true);
        }
    };

    const handleCreateThread = useCallback((messageId: number) => {
        // Find the message that will start the thread
        const message = messages.find(msg => msg.id === messageId);

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
    }, [messages, channelId, setSelectedThread]);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const messageId = Number(urlParams.get('message'));
        const threadMessageId = Number(urlParams.get('thread_message'));

        if (messageId) {
            scrollToMessage(messageId);
            // Only open the thread if there's a thread_message parameter
            // and it's different from the message parameter (meaning it's a thread reply)
            if (threadMessageId && threadMessageId !== messageId) {
                const message = messages.find(m => m.id === messageId);
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
            
            // Clear URL parameters after highlighting
            setTimeout(() => {
                navigate('/', { replace: true });
            }, 2500); // Wait for highlighting animation to complete
        } else {
            // Only scroll if there's no specific message to highlight
            scrollToBottom(true);
        }
    }, [handleCreateThread, messages, navigate]);

    useEffect(() => {
        const ws = wsRef.current;
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
            } else if (data.type === 'reaction_update') {
                setMessages(prevMessages => {
                    const updatedMessages = prevMessages.map(msg => {
                        if (msg.id === data.messageId) {
                            // Transform the reactions data to match the MessageReaction[] type
                            const transformedReactions = Object.entries(data.reactions as { [emoji: string]: { count: number; users: string[] } }).map(([emoji, reactionData]) => ({
                                emoji,
                                count: reactionData.count,
                                users: reactionData.users
                            }));
                            return {
                                ...msg,
                                reactions: transformedReactions
                            };
                        }
                        return msg;
                    });
                    return updatedMessages;
                });
            }
        };

        ws?.addEventListener('message', handleWebSocketMessage);
        return () => ws?.removeEventListener('message', handleWebSocketMessage);
    }, [channelId, wsRef, setMessages, setSelectedThread]);

    const getChannelName = (channelId: number) => {
        const channel = channels.find(c => c.id == channelId);
        if (!channel) return 'Unknown Channel';

        if (channel.is_dm) {
            const token = localStorage.getItem('token');
            if (!token) return 'Unknown User';
            
            const currentUserId = Number(jwtDecode<JWTPayload>(token).userId);
            const otherUserId = channel.dm_participants.find((id: number) => id !== currentUserId);
            
            const otherUser = users.find(u => Number(u.id) === otherUserId);
            return otherUser?.display_name ?? otherUser?.email ?? 'Unknown User';
        }

        return channel.name;
    };

    return (
        <div className="flex h-screen w-full">
            <div className="flex flex-col flex-grow">
                <div className="sticky top-0 z-10 p-4 bg-purple-900 border-b border-purple-600 shadow-lg">
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
                                        ${message.is_ai_generated ? 'bg-gradient-to-r from-purple-900 to-purple-800 border border-purple-600' : 'bg-purple-700 hover:bg-purple-600'}`}
                                >
                                    <div className="flex flex-col">
                                        {isSearchResults && (
                                            <div className="text-sm text-purple-400 mb-1">
                                                in {message.thread_id ? 
                                                    `Thread in ${channels.find(c => c.id === message.channel_id)?.is_dm ? 
                                                        `DM: ${getChannelName(message.channel_id)}` : 
                                                        `#${channels.find(c => c.id === message.channel_id)?.name || 'Unknown Channel'}`}` :
                                                    channels.find(c => c.id === message.channel_id)?.is_dm ? 
                                                        `DM: ${getChannelName(message.channel_id)}` : 
                                                        `#${channels.find(c => c.id === message.channel_id)?.name || 'Unknown Channel'}`}
                                            </div>
                                        )}
                                        <div className="flex items-baseline gap-2">
                                            <div className="flex items-center gap-2">
                                                {message.is_ai_generated && <span className="text-lg">🤖</span>}
                                                <span className="font-bold text-purple-300">
                                                    {message.is_ai_generated ? `AI Avatar of ${message.display_name}` : message.display_name}
                                                </span>
                                            </div>
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
                                                }}
                                                className="text-xs text-gray-400 hover:text-purple-300"
                                                title="Copy link to message"
                                            >
                                                🔗
                                            </button>
                                            {!isSearchResults && (
                                                <button
                                                    onClick={() => handleCreateThread(message.id)}
                                                    className="ml-auto text-xs text-purple-400 hover:text-purple-300"
                                                >
                                                    💬 {message.thread?.reply_count 
                                                        ? `${message.thread.reply_count} ${message.thread.reply_count === 1 ? 'reply' : 'replies'}` 
                                                        : 'Reply in Thread'}
                                                </button>
                                            )}
                                        </div>
                                        <div 
                                            className="mt-1 break-words whitespace-pre-wrap [overflow-wrap:anywhere]"
                                            onClick={() => {
                                                if (isSearchResults && onMessageClick) {
                                                    onMessageClick(
                                                        message.channel_id, 
                                                        message.id,
                                                        message.thread_parent_message_id
                                                    );
                                                }
                                            }}
                                        >
                                            <MessageContent message={message} users={users} />
                                        </div>
                                        <MessageReactions
                                            messageId={message.id}
                                            reactions={(() => {
                                                // If reactions is already in object format, use it directly
                                                if (message.reactions && !Array.isArray(message.reactions)) {
                                                    return message.reactions;
                                                }
                                                // Otherwise transform from array format
                                                return Array.isArray(message.reactions) ? message.reactions.reduce((acc, reaction) => ({
                                                    ...acc,
                                                    [reaction.emoji]: {
                                                        count: reaction.count,
                                                        users: reaction.users
                                                    }
                                                }), {}) : {};
                                            })()}
                                            wsRef={wsRef}
                                        />
                                    </div>
                                </li>
                            ))}
                        <div ref={messagesEndRef} />
                    </ul>
                </div>

                {!isSearchResults && (
                    <div className="border-t border-purple-700 bg-purple-900">
                        {(() => {
                            const token = localStorage.getItem('token');
                            if (!token) return null;
                            
                            const currentUserId = Number(jwtDecode<JWTPayload>(token).userId);
                            const typingUsers = users.filter(user => 
                                user.is_typing?.channels?.[channelId] && 
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
                                <div className="px-4 py-2 text-sm text-gray-400 italic">
                                    {typingText}
                                </div>
                            );
                        })()}
                        <div className="p-4">
                            <div className="flex items-center gap-2">
                                <FileUpload onUploadComplete={onFileUpload} />
                                <form onSubmit={handleSubmit} className="flex-1">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={newMessage}
                                        onChange={handleInputChange}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.repeat) {
                                                e.preventDefault();
                                                handleSubmit(e);
                                            }
                                        }}
                                        placeholder={isSearchResults ? "Cannot send messages in search results" : "Type a message..."}
                                        disabled={isSearchResults}
                                        className="w-full p-2 rounded bg-gray-700 text-white placeholder-gray-400"
                                    />
                                </form>
                                
                                <MentionAutocomplete
                                    users={users}
                                    searchTerm={mentionState.searchTerm}
                                    onSelect={handleUserMention}
                                    position={mentionState.position}
                                    visible={mentionState.active}
                                />
                            </div>
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
});

export default Messages;