import { supabase } from './supabaseClient';
import type { UserRole } from '../types/auth';
import type {
  Broadcast,
  BroadcastTargetType,
  Chat,
  ChatListItem,
  ChatMember,
  ChatType,
  Message,
  MessageStatus,
  MessageType,
  PendingMessage,
} from '../types/chat';
import {
  addPendingMessage,
  getPendingMessages,
  removePendingMessage,
} from './chatPendingStorage';

const CHAT_MEDIA_BUCKET = 'chat-media';
const DEFAULT_PAGE_SIZE = 30;

const friendlyError = (message: string): string => {
  if (message.includes('row-level security'))
    return 'You do not have permission to perform this action.';
  if (message.toLowerCase().includes('network'))
    return 'Network error. Check your connection and try again.';
  return message;
};

const mapChat = (
  row: Record<string, unknown>,
  member?: { unread_count?: number; is_member?: boolean },
): ChatListItem => ({
  id: String(row.id),
  type: row.type as ChatType,
  name: String(row.name ?? 'Chat'),
  description: (row.description as string) ?? null,
  task_id: (row.task_id as string) ?? null,
  campaign_id: (row.campaign_id as string) ?? null,
  channel_slug: (row.channel_slug as string) ?? null,
  created_by: (row.created_by as string) ?? null,
  last_message_at: (row.last_message_at as string) ?? null,
  last_message_preview: (row.last_message_preview as string) ?? null,
  created_at: String(row.created_at ?? new Date().toISOString()),
  updated_at: String(row.updated_at ?? new Date().toISOString()),
  unread_count: member?.unread_count ?? 0,
  is_member: member?.is_member ?? false,
});

const mapMessage = (row: Record<string, unknown>): Message => ({
  id: String(row.id),
  chat_id: String(row.chat_id),
  sender_id: String(row.sender_id),
  content: String(row.content ?? ''),
  type: (row.type as MessageType) ?? 'text',
  image_url: (row.image_url as string) ?? null,
  latitude: row.latitude != null ? Number(row.latitude) : null,
  longitude: row.longitude != null ? Number(row.longitude) : null,
  status: (row.status as MessageStatus) ?? 'sent',
  client_id: (row.client_id as string) ?? null,
  created_at: String(row.created_at ?? new Date().toISOString()),
  updated_at: String(row.updated_at ?? new Date().toISOString()),
  sender: row.sender as Message['sender'],
});

const uriToArrayBuffer = async (uri: string): Promise<ArrayBuffer> => {
  const res = await fetch(uri);
  if (!res.ok) throw new Error('Could not read selected file.');
  return res.arrayBuffer();
};

const guessExtension = (uri: string): string => {
  const match = /\.([a-zA-Z0-9]+)(?:\?|$)/.exec(uri.split('?')[0]);
  return match ? match[1].toLowerCase() : 'jpg';
};

const REGULAR_USER_HIDDEN_CHANNEL_SLUGS = new Set(['announcements']);

export function isChannelVisibleToRole(channelSlug: string | null | undefined, role: UserRole): boolean {
  if (!channelSlug) return true;
  if (role === 'admin' || role === 'authority') return true;
  return !REGULAR_USER_HIDDEN_CHANNEL_SLUGS.has(channelSlug);
}

const roleCanAccessChatType = (role: UserRole, type: ChatType): boolean => {
  if (role === 'admin' || role === 'authority') return true;
  if (type === 'channel') return true;
  if (role === 'citizen') return false;
  if (role === 'volunteer') return type === 'campaign' || type === 'task' || type === 'direct';
  return false;
};

const attachSenderProfiles = async (messages: Message[]): Promise<Message[]> => {
  const senderIds = [...new Set(messages.map((m) => m.sender_id))];
  if (!senderIds.length) return messages;

  const { data } = await supabase
    .from('profiles')
    .select('user_id, name, profile_photo_url')
    .in('user_id', senderIds);

  const byId = new Map(
    (data ?? []).map((p) => [
      String(p.user_id),
      { name: p.name as string, profile_photo_url: p.profile_photo_url as string | null },
    ]),
  );

  return messages.map((m) => ({
    ...m,
    sender: byId.get(m.sender_id) ?? null,
  }));
};

// ─── Public API ──────────────────────────────────────────────────────────────

export async function getChatsForUser(userId: string, role: UserRole): Promise<ChatListItem[]> {
  const { data: memberships, error: memErr } = await supabase
    .from('chat_members')
    .select('chat_id, unread_count, chats(*)')
    .eq('user_id', userId);

  if (memErr) throw new Error(friendlyError(memErr.message));

  const memberByChatId = new Map<string, number>();
  const memberChatRows = new Map<string, Record<string, unknown>>();

  for (const row of memberships ?? []) {
    const chatId = String(row.chat_id);
    memberByChatId.set(chatId, Number(row.unread_count ?? 0));
    const chat = row.chats as Record<string, unknown> | Record<string, unknown>[] | null;
    if (chat && !Array.isArray(chat) && chat.id != null) {
      memberChatRows.set(chatId, chat);
    }
  }

  const globalChannels = await getGlobalChannels(role);
  const out: ChatListItem[] = [];
  const seen = new Set<string>();

  for (const ch of globalChannels) {
    seen.add(ch.id);
    out.push({
      ...ch,
      unread_count: memberByChatId.get(ch.id) ?? 0,
      is_member: memberByChatId.has(ch.id),
    });
  }

  const unresolvedMemberIds = [...memberByChatId.keys()].filter((id) => !seen.has(id));
  if (unresolvedMemberIds.length) {
    const { data: extraChats, error: extraErr } = await supabase
      .from('chats')
      .select('*')
      .in('id', unresolvedMemberIds);
    if (!extraErr && extraChats) {
      for (const row of extraChats as Record<string, unknown>[]) {
        memberChatRows.set(String(row.id), row);
      }
    }
  }

  for (const [chatId, row] of memberChatRows) {
    if (seen.has(chatId)) continue;
    const type = row.type as ChatType;
    if (!roleCanAccessChatType(role, type)) continue;
    const slug = row.channel_slug as string | null | undefined;
    if (type === 'channel' && !isChannelVisibleToRole(slug, role)) continue;
    seen.add(chatId);
    out.push(
      mapChat(row, {
        unread_count: memberByChatId.get(chatId) ?? 0,
        is_member: true,
      }),
    );
  }

  out.sort((a, b) => {
    if (a.type === 'channel' && b.type !== 'channel') return -1;
    if (a.type !== 'channel' && b.type === 'channel') return 1;
    if (a.type === 'channel' && b.type === 'channel') {
      return String(a.name).localeCompare(String(b.name));
    }
    const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
    return tb - ta;
  });

  return out;
}

export async function getMessages(
  chatId: string,
  page = 0,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<Message[]> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw new Error(friendlyError(error.message));

  const rows = ((data ?? []) as Record<string, unknown>[]).map(mapMessage).reverse();
  return attachSenderProfiles(rows);
}

export async function sendMessage(
  chatId: string,
  senderId: string,
  content: string,
  type: MessageType = 'text',
  extra?: {
    imageUrl?: string;
    latitude?: number;
    longitude?: number;
    clientId?: string;
    status?: MessageStatus;
  },
): Promise<Message> {
  const payload = {
    chat_id: chatId,
    sender_id: senderId,
    content,
    type,
    image_url: extra?.imageUrl ?? null,
    latitude: extra?.latitude ?? null,
    longitude: extra?.longitude ?? null,
    status: extra?.status ?? 'sent',
    client_id: extra?.clientId ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('messages').insert(payload).select('*').single();
  if (error) throw new Error(friendlyError(error.message));
  const [msg] = await attachSenderProfiles([mapMessage(data as Record<string, unknown>)]);
  return msg;
}

export async function sendImage(
  chatId: string,
  senderId: string,
  imageUri: string,
  clientId?: string,
): Promise<Message> {
  const ext = guessExtension(imageUri);
  const path = `${chatId}/${senderId}-${Date.now()}.${ext}`;
  const content = await uriToArrayBuffer(imageUri);
  const { error: upErr } = await supabase.storage.from(CHAT_MEDIA_BUCKET).upload(path, content, {
    contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
    upsert: false,
  });
  if (upErr) throw new Error(friendlyError(upErr.message));

  const { data: urlData } = supabase.storage.from(CHAT_MEDIA_BUCKET).getPublicUrl(path);
  return sendMessage(chatId, senderId, '', 'image', {
    imageUrl: urlData.publicUrl,
    clientId,
  });
}

export async function sendLocation(
  chatId: string,
  senderId: string,
  lat: number,
  lng: number,
  clientId?: string,
): Promise<Message> {
  return sendMessage(chatId, senderId, `${lat},${lng}`, 'location', {
    latitude: lat,
    longitude: lng,
    clientId,
  });
}

export function subscribeToChat(
  chatId: string,
  callback: (event: { type: 'INSERT' | 'UPDATE'; message: Message }) => void,
): () => void {
  const channel = supabase
    .channel(`chat-messages-${chatId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
      (payload) => {
        if (!payload.new || typeof payload.new !== 'object') return;
        callback({ type: 'INSERT', message: mapMessage(payload.new as Record<string, unknown>) });
      },
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
      (payload) => {
        if (!payload.new || typeof payload.new !== 'object') return;
        callback({ type: 'UPDATE', message: mapMessage(payload.new as Record<string, unknown>) });
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToUserChatUpdates(
  userId: string,
  callback: (payload: { chatId: string; unreadCount: number }) => void,
): () => void {
  const channel = supabase
    .channel(`chat-members-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_members',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (!payload.new || typeof payload.new !== 'object') return;
        const row = payload.new as { chat_id?: string; unread_count?: number };
        if (!row.chat_id) return;
        callback({ chatId: String(row.chat_id), unreadCount: Number(row.unread_count ?? 0) });
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      async (payload) => {
        if (!payload.new || typeof payload.new !== 'object') return;
        const msg = payload.new as { chat_id?: string; sender_id?: string };
        if (msg.sender_id === userId || !msg.chat_id) return;

        const { data } = await supabase
          .from('chat_members')
          .select('unread_count')
          .eq('chat_id', msg.chat_id)
          .eq('user_id', userId)
          .maybeSingle();

        if (data) {
          callback({
            chatId: String(msg.chat_id),
            unreadCount: Number(data.unread_count ?? 0),
          });
        }
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function markMessagesAsSeen(chatId: string, userId: string): Promise<void> {
  const now = new Date().toISOString();

  await supabase
    .from('messages')
    .update({ status: 'seen', updated_at: now })
    .eq('chat_id', chatId)
    .neq('sender_id', userId)
    .neq('status', 'seen');

  await supabase
    .from('chat_members')
    .update({ unread_count: 0, last_read_at: now })
    .eq('chat_id', chatId)
    .eq('user_id', userId);
}

export async function markMessageDelivered(messageId: string): Promise<void> {
  await supabase
    .from('messages')
    .update({ status: 'delivered', updated_at: new Date().toISOString() })
    .eq('id', messageId)
    .eq('status', 'sent');
}

export async function getChatMembers(chatId: string): Promise<ChatMember[]> {
  const { data, error } = await supabase.from('chat_members').select('*').eq('chat_id', chatId);

  if (error) throw new Error(friendlyError(error.message));

  const rows = (data ?? []) as Record<string, unknown>[];
  const userIds = rows.map((r) => String(r.user_id));
  let profilesByUser = new Map<string, ChatMember['profile']>();

  if (userIds.length) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name, profile_photo_url, role')
      .in('user_id', userIds);
    profilesByUser = new Map(
      (profiles ?? []).map((p) => [
        String(p.user_id),
        {
          name: p.name as string,
          profile_photo_url: p.profile_photo_url as string | null,
          role: p.role as ChatMember['profile'] extends { role?: infer R } ? R : never,
        },
      ]),
    );
  }

  return rows.map((row) => ({
    id: String(row.id),
    chat_id: String(row.chat_id),
    user_id: String(row.user_id),
    role: String(row.role ?? 'member'),
    joined_at: String(row.joined_at ?? new Date().toISOString()),
    last_read_at: (row.last_read_at as string) ?? null,
    unread_count: Number(row.unread_count ?? 0),
    profile: profilesByUser.get(String(row.user_id)) ?? null,
  }));
}

export async function joinChannel(channelId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('chat_members').upsert(
    {
      chat_id: channelId,
      user_id: userId,
      role: 'member',
      joined_at: new Date().toISOString(),
    },
    { onConflict: 'chat_id,user_id' },
  );
  if (error) throw new Error(friendlyError(error.message));
}

export async function getGlobalChannels(role?: UserRole): Promise<Chat[]> {
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .not('channel_slug', 'is', null)
    .order('name', { ascending: true });

  if (error) throw new Error(friendlyError(error.message));

  return ((data ?? []) as Record<string, unknown>[])
    .filter((row) => String(row.type ?? '') === 'channel')
    .map((row) => mapChat(row))
    .filter((c) => !role || isChannelVisibleToRole(c.channel_slug, role));
}

export async function getChannelBySlug(slug: string): Promise<Chat | null> {
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('type', 'channel')
    .eq('channel_slug', slug)
    .maybeSingle();

  if (error) throw new Error(friendlyError(error.message));
  if (!data) return null;
  return mapChat(data as Record<string, unknown>);
}

export async function getChatById(chatId: string): Promise<Chat | null> {
  const { data, error } = await supabase.from('chats').select('*').eq('id', chatId).maybeSingle();
  if (error) throw new Error(friendlyError(error.message));
  if (!data) return null;
  return mapChat(data as Record<string, unknown>);
}

export async function createTaskChat(taskId: string, memberIds: string[]): Promise<string> {
  const { data: existing } = await supabase
    .from('chats')
    .select('id')
    .eq('task_id', taskId)
    .maybeSingle();

  if (existing?.id) {
    await ensureChatMembers(String(existing.id), memberIds);
    return String(existing.id);
  }

  const { data: task } = await supabase
    .from('tasks')
    .select('help_type, task_type, disaster:disasters(disaster_type)')
    .eq('id', taskId)
    .maybeSingle();

  const taskLabel =
    (task as { help_type?: string; task_type?: string } | null)?.help_type ??
    (task as { task_type?: string } | null)?.task_type ??
    'Task';

  const { data: chat, error } = await supabase
    .from('chats')
    .insert({
      type: 'task',
      name: `Task: ${taskLabel}`,
      description: 'Temporary chat for assigned volunteers.',
      task_id: taskId,
    })
    .select('id')
    .single();

  if (error || !chat) throw new Error(friendlyError(error?.message ?? 'Could not create task chat.'));

  await ensureChatMembers(String(chat.id), memberIds);
  return String(chat.id);
}

export async function createCampaignChat(campaignId: string, memberIds: string[]): Promise<string> {
  const { data: existing } = await supabase
    .from('chats')
    .select('id')
    .eq('campaign_id', campaignId)
    .maybeSingle();

  if (existing?.id) {
    await ensureChatMembers(String(existing.id), memberIds);
    return String(existing.id);
  }

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('title')
    .eq('id', campaignId)
    .maybeSingle();

  const title = (campaign as { title?: string } | null)?.title ?? 'Campaign';

  const { data: chat, error } = await supabase
    .from('chats')
    .insert({
      type: 'campaign',
      name: `Campaign: ${title}`,
      description: 'Group chat for campaign volunteers.',
      campaign_id: campaignId,
    })
    .select('id')
    .single();

  if (error || !chat) throw new Error(friendlyError(error?.message ?? 'Could not create campaign chat.'));

  await ensureChatMembers(String(chat.id), memberIds);
  return String(chat.id);
}

async function ensureChatMembers(chatId: string, memberIds: string[]): Promise<void> {
  const unique = [...new Set(memberIds.filter(Boolean))];
  if (!unique.length) return;

  const rows = unique.map((userId) => ({
    chat_id: chatId,
    user_id: userId,
    role: 'member',
    joined_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from('chat_members').upsert(rows, {
    onConflict: 'chat_id,user_id',
  });
  if (error) throw new Error(friendlyError(error.message));
}

export async function ensureTaskChatForAssignment(taskId: string): Promise<void> {
  const { data: assignments, error } = await supabase
    .from('task_assignments')
    .select('volunteer_id')
    .eq('task_id', taskId)
    .in('status', ['assigned', 'accepted', 'completed']);

  if (error) return;

  const memberIds = (assignments ?? []).map((a) => String(a.volunteer_id));
  if (!memberIds.length) return;

  try {
    await createTaskChat(taskId, memberIds);
  } catch {
    /* best-effort */
  }
}

export async function ensureCampaignChatForVolunteers(campaignId: string): Promise<void> {
  const { data: volunteers, error } = await supabase
    .from('campaign_volunteers')
    .select('volunteer_user_id')
    .eq('campaign_id', campaignId)
    .eq('status', 'active');

  if (error) return;

  const memberIds = (volunteers ?? []).map((v) => String(v.volunteer_user_id));
  if (!memberIds.length) return;

  try {
    await createCampaignChat(campaignId, memberIds);
  } catch {
    /* best-effort */
  }
}

export async function createDirectChat(adminId: string, volunteerUserId: string): Promise<string> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('user_id', volunteerUserId)
    .maybeSingle();

  const name = profile?.name ? `DM: ${profile.name}` : 'Direct message';

  const { data: chat, error } = await supabase
    .from('chats')
    .insert({
      type: 'direct',
      name,
      description: 'Admin to volunteer direct message.',
      created_by: adminId,
    })
    .select('id')
    .single();

  if (error || !chat) throw new Error(friendlyError(error?.message ?? 'Could not create direct chat.'));

  await ensureChatMembers(String(chat.id), [adminId, volunteerUserId]);
  return String(chat.id);
}

export async function sendBroadcast(
  adminId: string,
  targetType: BroadcastTargetType,
  title: string,
  message: string,
  targetCampaignId?: string | null,
): Promise<Broadcast> {
  const { data: broadcast, error } = await supabase
    .from('broadcasts')
    .insert({
      admin_id: adminId,
      target_type: targetType,
      target_campaign_id: targetCampaignId ?? null,
      title,
      message,
    })
    .select('*')
    .single();

  if (error || !broadcast) throw new Error(friendlyError(error?.message ?? 'Broadcast failed.'));

  let userIds: string[] = [];

  if (targetType === 'all') {
    const { data } = await supabase.from('profiles').select('user_id');
    userIds = (data ?? []).map((p) => String(p.user_id));
  } else if (targetType === 'volunteers') {
    const { data } = await supabase.from('profiles').select('user_id').eq('role', 'volunteer');
    userIds = (data ?? []).map((p) => String(p.user_id));
  } else if (targetType === 'campaign' && targetCampaignId) {
    const { data } = await supabase
      .from('campaign_volunteers')
      .select('volunteer_user_id')
      .eq('campaign_id', targetCampaignId)
      .eq('status', 'active');
    userIds = (data ?? []).map((v) => String(v.volunteer_user_id));
  }

  if (userIds.length) {
    const now = new Date().toISOString();
    const chunkSize = 100;
    for (let i = 0; i < userIds.length; i += chunkSize) {
      const chunk = userIds.slice(i, i + chunkSize);
      await supabase.from('notifications').insert(
        chunk.map((userId) => ({
          user_id: userId,
          type: 'broadcast',
          title,
          message,
          is_read: false,
          created_at: now,
          broadcast_id: broadcast.id,
        })),
      );
    }
  }

  const { data: annChannel } = await supabase
    .from('chats')
    .select('id')
    .eq('type', 'channel')
    .eq('channel_slug', 'announcements')
    .maybeSingle();

  if (annChannel?.id) {
    const { data: annMsg } = await supabase
      .from('messages')
      .insert({
        chat_id: annChannel.id,
        sender_id: adminId,
        content: `📢 ${title}\n\n${message}`,
        type: 'text',
        status: 'sent',
      })
      .select('id')
      .single();

    if (annMsg?.id) {
      await supabase
        .from('broadcasts')
        .update({ announcement_message_id: annMsg.id })
        .eq('id', broadcast.id);
    }
  }

  return {
    id: String(broadcast.id),
    admin_id: String(broadcast.admin_id),
    target_type: broadcast.target_type as BroadcastTargetType,
    target_campaign_id: (broadcast.target_campaign_id as string) ?? null,
    title: String(broadcast.title),
    message: String(broadcast.message),
    created_at: String(broadcast.created_at),
  };
}

export async function fetchBroadcastNotifications(userId: string): Promise<
  Array<{
    id: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
  }>
> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, message, is_read, created_at')
    .eq('user_id', userId)
    .eq('type', 'broadcast')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(friendlyError(error.message));
  return (data ?? []).map((row) => ({
    id: String(row.id),
    title: String(row.title ?? 'Broadcast'),
    message: String(row.message ?? ''),
    is_read: Boolean(row.is_read),
    created_at: String(row.created_at ?? new Date().toISOString()),
  }));
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
}

// ─── Offline queue ───────────────────────────────────────────────────────────

export async function queueOfflineMessage(pending: PendingMessage): Promise<void> {
  await addPendingMessage(pending);
}

export async function flushPendingMessages(senderId: string): Promise<void> {
  const pending = await getPendingMessages();
  for (const msg of pending) {
    if (msg.senderId !== senderId) continue;
    try {
      if (msg.type === 'image' && msg.imageUri) {
        await sendImage(msg.chatId, msg.senderId, msg.imageUri, msg.clientId);
      } else if (msg.type === 'location' && msg.latitude != null && msg.longitude != null) {
        await sendLocation(msg.chatId, msg.senderId, msg.latitude, msg.longitude, msg.clientId);
      } else {
        await sendMessage(msg.chatId, msg.senderId, msg.content, msg.type, {
          clientId: msg.clientId,
        });
      }
      await removePendingMessage(msg.clientId);
    } catch {
      break;
    }
  }
}

export async function isOnline(): Promise<boolean> {
  try {
    const { error } = await supabase.from('profiles').select('user_id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

export { DEFAULT_PAGE_SIZE };
