import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';

export function AuthScreen({ navigation }: any) {
  const {
    isAuthenticated,
    isBiometricSupported,
    isCheckingSession,
    init,
    checkPersistedSession,
    loginWithBiometrics,
    loginWithPassword
  } = useAuthStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    init();
    checkPersistedSession();
  }, [init, checkPersistedSession]);

  useEffect(() => {
    if (isAuthenticated) {
      navigation.replace('MainApp');
    }
  }, [isAuthenticated, navigation]);

  const handlePasswordLogin = async () => {
    setLoading(true);
    await loginWithPassword();
    setLoading(false);
  };

  const handleBiometricLogin = async () => {
    setLoading(true);
    const success = await loginWithBiometrics();
    if (!success) {
      Alert.alert("Authentication Failed", "Biometric authentication failed or was cancelled.");
    }
    setLoading(false);
  };

  if (isCheckingSession) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>DTRS</Text>
          <Text style={styles.subtitle}>Delhi Traffic Reporting System</Text>
        </View>

        <View style={styles.form}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handlePasswordLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#001F3F" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {isBiometricSupported && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleBiometricLogin}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>Use Fingerprint / FaceID</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#001F3F',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-around',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#CCC',
  },
  form: {
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#001F3F',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
