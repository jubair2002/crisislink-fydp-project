import type { UserRole } from './auth';

export type ChatType = 'campaign' | 'task' | 'channel' | 'direct' | 'broadcast';
export type MessageType = 'text' | 'image' | 'location' | 'system';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'seen';
export type BroadcastTargetType = 'all' | 'volunteers' | 'campaign';

export interface Chat {
  id: string;
  type: ChatType;
  name: string;
  description?: string | null;
  task_id?: string | null;
  campaign_id?: string | null;
  channel_slug?: string | null;
  created_by?: string | null;
  last_message_at?: string | null;
  last_message_preview?: string | null;
  created_at: string;
  updated_at: string;
  unread_count?: number;
  is_member?: boolean;
}

export interface ChatMember {
  id: string;
  chat_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  last_read_at?: string | null;
  unread_count: number;
  profile?: {
    name?: string | null;
    profile_photo_url?: string | null;
    role?: UserRole;
  } | null;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  type: MessageType;
  image_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status: MessageStatus;
  client_id?: string | null;
  created_at: string;
  updated_at: string;
  sender?: {
    name?: string | null;
    profile_photo_url?: string | null;
  } | null;
}

export interface Broadcast {
  id: string;
  admin_id: string;
  target_type: BroadcastTargetType;
  target_campaign_id?: string | null;
  title: string;
  message: string;
  created_at: string;
}

export interface PendingMessage {
  clientId: string;
  chatId: string;
  senderId: string;
  content: string;
  type: MessageType;
  imageUri?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
}

export interface ChatListItem extends Chat {
  unread_count: number;
}
