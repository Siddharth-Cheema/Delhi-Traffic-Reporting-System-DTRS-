import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';

export function ProfileScreen() {
  const { officerId, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: logout }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.officerBadge}>Officer: {officerId || 'Guest'}</Text>
        </View>

        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.settingsList}>
          {['Account', 'Posting Zone', 'Network Preferences', 'Logout'].map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.settingItem}
              onPress={item === 'Logout' ? handleLogout : undefined}
            >
              <Text style={[styles.settingText, item === 'Logout' && styles.logoutText]}>
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001F3F' },
  content: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  officerBadge: { fontSize: 12, color: '#fff', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, fontWeight: '600' },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: '#fff' },
  settingsList: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, overflow: 'hidden' },
  settingItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  settingText: { fontSize: 16, color: '#fff' },
  logoutText: { color: '#FF3B30' },
});
