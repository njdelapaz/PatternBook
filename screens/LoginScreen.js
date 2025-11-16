import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Import icons
import LightpageLogo from '../assets/lightpage-logo.svg';
import GoogleIcon from '../assets/google-icon.svg';
import EmailIcon from '../assets/email-icon.svg';

export default function LoginScreen({ onLogin, onNavigateToEmail }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo and Title Section */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <LightpageLogo width={60} height={60} />
            <Text style={styles.logoText}>PatternBook</Text>
          </View>
          <Text style={styles.tagline}>The second notebook that writes back</Text>
        </View>

        {/* Testimonials Section */}
        <View style={styles.testimonialsSection}>
          <Text style={styles.testimonialsTitle}>Reactions from early users</Text>
          <View style={styles.testimonialCard}>
            <Text style={styles.testimonialText}>
              had a super cathartic chat with patternbook, first time I've had that with an AI. great stuff
            </Text>
          </View>
        </View>

        {/* Login Buttons */}
        <View style={styles.loginButtonsContainer}>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={onLogin}
            activeOpacity={0.8}
          >
            <GoogleIcon width={20} height={20} />
            <Text style={styles.loginButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={onNavigateToEmail}
            activeOpacity={0.8}
          >
            <EmailIcon width={20} height={20} />
            <Text style={styles.loginButtonText}>Continue with email</Text>
          </TouchableOpacity>
        </View>

        {/* Terms and Privacy */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you acknowledge that you understand and agree to the{' '}
            <Text style={styles.linkText}>Terms of Use</Text> and{' '}
            <Text style={styles.linkText}>Privacy Policy</Text>.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 120,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '300',
    color: '#FFFFFF',
    marginTop: 12,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  testimonialsSection: {
    marginBottom: 40,
  },
  testimonialsTitle: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '400',
  },
  testimonialCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 8,
  },
  testimonialText: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
    fontWeight: '400',
  },
  loginButtonsContainer: {
    gap: 16,
    marginBottom: 30,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  footer: {
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 13,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 20,
  },
  linkText: {
    textDecorationLine: 'underline',
  },
});
