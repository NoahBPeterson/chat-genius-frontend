export interface Message {
    id: number;
    channel_id: number;
    user_id: number;
    content: string;
    timestamp: string;
    created_at: string;
    display_name: string;
    thread?: Thread;
    thread_id?: number;
    is_thread_parent?: boolean;
    thread_parent_message_id?: number;
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
