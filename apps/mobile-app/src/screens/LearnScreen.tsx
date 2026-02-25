import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';

const TRAFFIC_RULES = [
  {
    title: 'Helmet Rules',
    description: 'Both rider and pillion must wear BIS certified helmets.',
    fine: '₹1000 + License Disqualification for 3 months',
  },
  {
    title: 'Triple Riding',
    description: 'More than two persons on a two-wheeler is strictly prohibited.',
    fine: '₹1000',
  },
  {
    title: 'Red Light Jumping',
    description: 'Crossing the intersection when the signal is red.',
    fine: '₹1000 - ₹5000 / 6 months to 1 year imprisonment',
  },
  {
    title: 'Wrong Side Driving',
    description: 'Driving against the flow of traffic on a one-way street or divided highway.',
    fine: '₹5000 - ₹10000',
  },
  {
    title: 'Use of Mobile Phone',
    description: 'Using a handheld mobile phone while driving.',
    fine: '₹1000 - ₹5000',
  },
  {
    title: 'Defective Number Plate',
    description: 'Number plate not as per CMVR standards (e.g., fancy fonts, improper size).',
    fine: '₹5000',
  },
];

export function LearnScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Traffic Rules Guide</Text>
        <Text style={styles.subtitle}>Reference for common violations</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {TRAFFIC_RULES.map((rule, index) => (
          <View key={index} style={styles.ruleCard}>
            <Text style={styles.ruleTitle}>{rule.title}</Text>
            <Text style={styles.ruleDescription}>{rule.description}</Text>
            <View style={styles.fineContainer}>
              <Text style={styles.fineLabel}>Penalty: </Text>
              <Text style={styles.fineAmount}>{rule.fine}</Text>
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.quizButton}>
          <Text style={styles.quizButtonText}>Take a Refresher Quiz</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#001F3F',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#001F3F',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  subtitle: {
    fontSize: 16,
    color: '#CCC',
    marginTop: 4,
  },
  content: {
    padding: 16,
  },
  ruleCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  ruleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  ruleDescription: {
    fontSize: 15,
    color: '#CCC',
    lineHeight: 22,
    marginBottom: 12,
  },
  fineContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,59,48,0.2)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'flex-start',
  },
  fineLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  fineAmount: {
    flex: 1,
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
  },
  quizButton: {
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  quizButtonText: {
    color: '#001F3F',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
