import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@crisislink/donation_history';

export interface SavedDonation {
  donation_code: string;
  donation_id?: string;
  amount: number;
  campaign_title?: string;
  saved_at: string;
}

export async function getSavedDonations(): Promise<SavedDonation[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedDonation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveDonationRecord(entry: SavedDonation): Promise<void> {
  const existing = await getSavedDonations();
  const code = entry.donation_code.trim().toUpperCase();
  if (!code) return;

  const filtered = existing.filter((d) => d.donation_code.toUpperCase() !== code);
  const next = [{ ...entry, donation_code: code }, ...filtered].slice(0, 50);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
