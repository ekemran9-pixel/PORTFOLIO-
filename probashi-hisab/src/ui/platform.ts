import { Alert, Platform, Share } from 'react-native';

/** Yes/No confirmation that works on Android, iOS and web. */
export function confirm(title: string, message: string, okLabel: string, cancelLabel: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: okLabel, style: 'destructive', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

/**
 * Hands a text file to the user: a download on web, the system share sheet on phones
 * (from where it can be saved to Files/Drive or sent by e-mail/WhatsApp).
 */
export async function exportText(filename: string, content: string, mime = 'text/csv'): Promise<boolean> {
  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  }
  const r = await Share.share({ title: filename, message: content });
  return r.action !== Share.dismissedAction;
}
