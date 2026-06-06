import { Platform, Share } from 'react-native';

/**
 * Copy text without pulling in expo-clipboard's ClipboardPasteButton
 * (breaks Android/Expo Go bundling when imported from the package root).
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    const ExpoClipboard = await import('expo-clipboard/build/ExpoClipboard');
    const mod = ExpoClipboard.default ?? ExpoClipboard;
    if (typeof mod.setStringAsync === 'function') {
      await mod.setStringAsync(text);
      return true;
    }
  } catch {
    /* fall through */
  }

  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  try {
    await Share.share({ message: text });
  } catch {
    return false;
  }
  return false;
}
