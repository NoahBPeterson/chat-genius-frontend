export interface Message {
    id: number;
    channel_id: number;
    user_id: number;
    content: string;
    created_at: string;
    timestamp: string;
    display_name: string;
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
        [channelId: string]: boolean 
    };
}

export interface Channel {
    id: string;
    name: string;
    is_dm: boolean;
    dm_participants: number[];
}