import { createServiceClient, createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import type { DisasterRow, CampaignRow } from '@/types/admin';

function getDb() {
  try {
    return createServiceClient();
  } catch {
    return null;
  }
}

/**
 * Fetch all donations for currently authenticated citizen
 * Uses service client to bypass RLS restrictions and ensure immediate data access
 */
export async function getCitizenDonations() {
  const user = await getCurrentUser();
  if (!user?.id) return [];

  const db = getDb() || (await createClient());
  try {
    const { data, error } = await db
      .from('donations')
      .select('id, donation_code, amount, payment_status, payment_method, created_at, campaigns(id, title, media_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[citizenService] Error fetching donations:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('[citizenService] Exception fetching donations:', err);
    return [];
  }
}

/**
 * Fetch all disaster reports submitted by the logged-in citizen
 */
export async function getCitizenReports() {
  const user = await getCurrentUser();
  if (!user?.id) return [];

  const db = getDb() || (await createClient());
  try {
    const { data, error } = await db
      .from('disasters')
      .select('*')
      .eq('reporter_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[citizenService] Error fetching citizen reports:', error);
      return [];
    }
    return (data || []) as DisasterRow[];
  } catch (err) {
    console.error('[citizenService] Exception fetching citizen reports:', err);
    return [];
  }
}

/**
 * Fetch active disaster channels from DB
 */
export async function getCitizenChatChannels() {
  const db = getDb() || (await createClient());
  try {
    const { data, error } = await db
      .from('chats')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[citizenService] Error fetching chat channels:', err);
    return [];
  }
}

/**
 * Fetch messages for a specific chat channel from DB with sender profile details
 */
export async function getChatMessages(chatId: string) {
  const db = getDb() || (await createClient());
  try {
    const { data: messages, error } = await db
      .from('messages')
      .select('id, chat_id, sender_id, content, type, image_url, created_at, status')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) throw error;
    if (!messages || messages.length === 0) return [];

    // Fetch sender profile details in one batch
    const senderIds = Array.from(new Set(messages.map((m) => m.sender_id).filter(Boolean)));
    const { data: profiles } = await db
      .from('profiles')
      .select('user_id, name, role, profile_photo_url')
      .in('user_id', senderIds);

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

    return messages.map((m) => ({
      ...m,
      sender: profileMap.get(m.sender_id) || {
        name: 'Citizen',
        role: 'citizen',
        profile_photo_url: null,
      },
    }));
  } catch (err) {
    console.error('[citizenService] Error fetching chat messages:', err);
    return [];
  }
}

/**
 * Send a chat message into the database
 */
export async function sendChatMessage(chatId: string, content: string) {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error('Unauthorized');

  const db = getDb() || (await createClient());
  const { data, error } = await db
    .from('messages')
    .insert({
      chat_id: chatId,
      sender_id: user.id,
      content: content.trim(),
      type: 'text',
      status: 'sent',
    })
    .select('id, chat_id, sender_id, content, type, created_at, status')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch all active disasters for the citizen internal map
 */
export async function getCitizenMapDisasters() {
  const db = getDb() || (await createClient());
  try {
    const { data, error } = await db
      .from('disasters')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as DisasterRow[];
  } catch (err) {
    console.error('[citizenService] Error fetching map disasters:', err);
    return [];
  }
}

/**
 * Fetch active campaigns for citizen internal campaigns page
 */
export async function getCitizenCampaigns() {
  const db = getDb() || (await createClient());
  try {
    const { data, error } = await db
      .from('campaigns')
      .select('*')
      .order('collected_amount', { ascending: false });

    if (error) throw error;
    return (data || []) as CampaignRow[];
  } catch (err) {
    console.error('[citizenService] Error fetching campaigns:', err);
    return [];
  }
}
