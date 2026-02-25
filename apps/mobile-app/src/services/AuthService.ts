import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from './DualSyncService';

const AUTH_TOKEN_KEY = 'dtrs_auth_token';

export class AuthService {
  /**
   * Check if hardware supports biometrics
   */
  static async hasHardwareAsync(): Promise<boolean> {
    return await LocalAuthentication.hasHardwareAsync();
  }

  /**
   * Check if biometrics are enrolled
   */
  static async isEnrolledAsync(): Promise<boolean> {
    return await LocalAuthentication.isEnrolledAsync();
  }

  /**
   * Trigger the biometric prompt
   */
  static async authenticateAsync(): Promise<boolean> {
    const hasHardware = await this.hasHardwareAsync();
    const isEnrolled = await this.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      return false;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Log in to DTRS',
      fallbackLabel: 'Use Passcode',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    return result.success;
  }

  /**
   * Save auth token
   */
  static async saveAuthToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
  }

  /**
   * Get auth token
   */
  static async getAuthToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  }

  /**
   * Clear auth token
   */
  static async clearAuthToken(): Promise<void> {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  }

  /**
   * Example of a cloud auth call (commented out for prototype)
   *
   * static async loginWithCloud(credentials: any) {
   *   const response = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, credentials);
   *   return response.data;
   * }
   */
}
