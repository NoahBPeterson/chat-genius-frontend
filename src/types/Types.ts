export interface Attachment {
    filename: string;
    mime_type: string;
    size: number;
    storage_path: string;
}

export interface Message {
    id: number;
    channel_id: number;
    user_id: string;
    content: string;
    created_at: string;
    timestamp: string;
    display_name: string;
    thread_id?: number;
    thread_parent_message_id?: number;
    thread?: {
        id: number;
        channel_id: number;
        parent_message_id: number;
        created_at: string;
        last_reply_at: string;
        thread_starter_content: string;
        thread_starter_name: string;
        thread_starter_id: string;
        reply_count: number;
    };
    has_thread?: boolean;
    is_thread_parent?: boolean;
    reactions: {
        [emoji: string]: {
            count: number;
            users: string[];
        };
    };
    attachments?: Attachment[];
}

export interface JWTPayload {
    userId: number;
    role: string;
    iat: number;
    exp: number;
}

export interface User {
    id: string;
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
    id: string;
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
