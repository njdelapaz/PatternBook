/**
 * Persona Selection Screen
 * Shown after onboarding for first-time users
 * Allows users to choose a persona or start with blank slate
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPersonaMetadata } from '../services/personaService';

export default function PersonaSelectionScreen({ onSelectPersona, isDarkMode, isLoading }) {
  const insets = useSafeAreaInsets();
  const theme = {
    backgroundColor: '#000000',
    cardBackground: '#2a2a2a',
    textColor: '#FFFFFF',
    secondaryTextColor: '#999999',
    accentColor: '#C8D5B9',
    borderColor: '#2a2a2a',
  };

  const personas = getPersonaMetadata();
  const personaOrder = ['software-engineer', 'therapist', 'doctor', 'blank-slate'];

  const handleSelect = (personaType) => {
    if (!isLoading) {
      onSelectPersona(personaType);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor, paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingContent, { backgroundColor: theme.cardBackground }]}>
            <ActivityIndicator size="large" color={theme.accentColor} />
            <Text style={[styles.loadingText, { color: theme.textColor }]}>
              Loading your notes...
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.textColor }]}>
            Choose Your Starting Point
          </Text>
          <Text style={[styles.subtitle, { color: theme.secondaryTextColor }]}>
            Select a persona with preloaded notes, or start fresh with a blank slate
          </Text>
        </View>

        {/* Persona Cards */}
        <View style={styles.cardsContainer}>
          {personaOrder.map((personaType) => {
            const persona = personas[personaType];
            const isBlankSlate = personaType === 'blank-slate';

            return (
              <TouchableOpacity
                key={personaType}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.cardBackground,
                    borderColor: theme.borderColor,
                  },
                ]}
                onPress={() => handleSelect(personaType)}
                activeOpacity={0.7}
                disabled={isLoading}
              >
                <View style={styles.cardContent}>
                  {/* Icon */}
                  <Text style={styles.icon}>{persona.icon}</Text>

                  {/* Text Content */}
                  <View style={styles.textContent}>
                    <Text style={[styles.cardTitle, { color: theme.textColor }]}>
                      {persona.title}
                    </Text>
                    <Text style={[styles.cardDescription, { color: theme.secondaryTextColor }]}>
                      {persona.description}
                    </Text>
                  </View>

                  {/* Select Button */}
                  <View style={[styles.selectButton, { backgroundColor: theme.accentColor }]}>
                    <Text style={styles.selectButtonText}>Select</Text>
                  </View>
                </View>

                {/* Note Count Badge (if not blank slate) */}
                {!isBlankSlate && (
                  <View style={[styles.badge, { backgroundColor: theme.accentColor }]}>
                    <Text style={styles.badgeText}>{persona.noteCount} notes</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.secondaryTextColor }]}>
            You can always create your own notes later
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContent: {
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 40,
    paddingBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  icon: {
    fontSize: 48,
  },
  textContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  selectButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  selectButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    paddingTop: 32,
    paddingBottom: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
