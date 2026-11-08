import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { Linking, Platform } from 'react-native';

export type Photo = { uri: string; b64: string; mime: string };

/** Returns a photo, null if cancelled, or throws 'badFile' for unsupported types. */
export async function pickPhoto(): Promise<Photo | null> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.7 });
  if (r.canceled) return null;
  const a = r.assets[0];
  const mime = a.mimeType ?? (a.uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime) || !a.base64) throw new Error('badFile');
  return { uri: a.uri, b64: a.base64, mime };
}

/** Saves an image or video URL. Returns 'saved' or 'opened' (fallback: open it, user saves). */
export async function saveMedia(url: string, kind: 'image' | 'video'): Promise<'saved' | 'opened'> {
  if (Platform.OS === 'web') {
    window.open(url, '_blank');
    return 'opened';
  }
  try {
    const perm = await MediaLibrary.requestPermissionsAsync(true);
    if (!perm.granted) throw new Error('no permission');
    const ext = kind === 'video' ? 'mp4' : 'jpg';
    const { uri } = await FileSystem.downloadAsync(url, `${FileSystem.cacheDirectory}adverse-${Date.now()}.${ext}`);
    await MediaLibrary.saveToLibraryAsync(uri);
    return 'saved';
  } catch {
    await Linking.openURL(url);
    return 'opened';
  }
}
