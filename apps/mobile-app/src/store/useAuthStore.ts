import { create } from 'zustand';
import { AuthService } from '../services/AuthService';

interface AuthState {
  isAuthenticated: boolean;
  isBiometricSupported: boolean;
  isCheckingSession: boolean;
  officerId: string | null;
  init: () => Promise<void>;
  loginWithBiometrics: () => Promise<boolean>;
  loginWithPassword: () => Promise<void>;
  logout: () => Promise<void>;
  checkPersistedSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isBiometricSupported: false,
  isCheckingSession: true,
  officerId: null,

  init: async () => {
    try {
      const hasHardware = await AuthService.hasHardwareAsync();
      const isEnrolled = await AuthService.isEnrolledAsync();
      set({ isBiometricSupported: hasHardware && isEnrolled });
    } catch (e) {
      console.error('Failed to init biometric check:', e);
      set({ isBiometricSupported: false });
    }
  },

  checkPersistedSession: async () => {
    set({ isCheckingSession: true });
    try {
      const token = await AuthService.getAuthToken();
      if (token) {
        set({ isAuthenticated: true, officerId: 'OFFICER_007' }); // hack: hardcoded for now
      } else {
        set({ isAuthenticated: false, officerId: null });
      }
    } catch (e) {
      console.error('Failed to check persisted session:', e);
      set({ isAuthenticated: false, officerId: null });
    } finally {
      set({ isCheckingSession: false });
    }
  },

  loginWithBiometrics: async () => {
    try {
      const success = await AuthService.authenticateAsync();
      if (success) {
        // hack: hardcoded for now
        await AuthService.saveAuthToken('mock_auth_token_123');
        set({ isAuthenticated: true, officerId: 'OFFICER_007' });
      }
      return success;
    } catch (e) {
      console.error('Biometric auth failed:', e);
      return false;
    }
  },

  loginWithPassword: async () => {
    try {
      // hack: hardcoded for now
      await AuthService.saveAuthToken('mock_auth_token_456');
      set({ isAuthenticated: true, officerId: 'OFFICER_007' });
    } catch (e) {
      console.error('Password login failed:', e);
    }
  },

  logout: async () => {
    try {
      await AuthService.clearAuthToken();
      set({ isAuthenticated: false, officerId: null });
    } catch (e) {
      console.error('Logout failed:', e);
    }
  }
}));
