import { Platform } from 'react-native';

export function shouldUseOsmMap(): boolean {
  return Platform.OS === 'android';
}
