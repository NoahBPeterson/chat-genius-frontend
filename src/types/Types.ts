export interface Attachment {
    filename: string;
    mime_type: string;
    size: number;
    storage_path: string;
}

export interface Message {
    id: number;
    channel_id: number;
    user_id: number;
    content: string;
    created_at: string;
    display_name: string;
    thread_id?: number;
    thread_parent_message_id?: number;
    thread?: Thread;
    is_thread_parent?: boolean;
    timestamp?: string;
    reactions?: MessageReaction[];
    is_ai_generated?: boolean;
}

export interface JWTPayload {
    userId: number;
    role: string;
    iat: number;
    exp: number;
}

export interface User {
    id: number;
    display_name: string;
    email: string;
    presence_status: 'online' | 'idle' | 'offline';
    custom_status?: string;
    is_typing?: { 
        channels: { [channelId: string]: boolean },
        threads: { [threadId: string]: boolean }
    };
}

export interface Channel {
    id: number;
    name: string;
    is_dm: boolean;
    dm_participants: number[];
}

export interface Thread {
    id: number;
    channel_id: number;
    parent_message_id: number;
    created_at: string;
    last_reply_at: string;
    thread_starter_content: string;
    thread_starter_name: string;
    thread_starter_id: number;
    reply_count: number;
}

export interface MessageReaction {
    emoji: string;
    count: number;
    users: string[];
}
