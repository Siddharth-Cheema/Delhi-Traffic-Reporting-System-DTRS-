import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';

/**
 * Compute SHA-256 hash of a file.
 * Replaces react-native-fs hash() and react-native-sha256
 * with Expo-compatible equivalents.
 */
export async function hashFile(filePath: string): Promise<string> {
    const fileUri = filePath.startsWith('file://') ? filePath : `file://${filePath}`;
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
    });
    return Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        base64
    );
}
