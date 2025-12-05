import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

export default function OnboardingScreen({ onComplete }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "Welcome to PatternBook, your living notebook",
      image: require('../assets/onboarding/welcome-notebook.jpg'),
      hasButton: true,
      buttonText: "Continue →",
    },
    {
      title: "Dictate or write about anything on your mind",
      subtitle: "NOTE",
      noteTitle: "Morning pages",
      noteContent: "I slept a lot better, sleeping\nmask is working!",
      emoji: "🛏️",
      hasButton: true,
      buttonText: "Continue →",
    },
    {
      title: "Chat with your AI when you want a thought partner",
      noteTitle: "I keep picking fights with Taylor over small things",
      chatMessage: "what do you think?",
      hasButton: true,
      buttonText: "Continue →",
    },
    {
      title: "Every day, it'll find things related to what you've been thinking about",
      contentCards: [
        {
          type: 'image',
          image: require('../assets/onboarding/related-image.jpg'),
        },
        {
          type: 'quote',
          text: '"Between what is said and not meant, and what is meant and not said, most of love is lost." –Kahlil Gibran',
        },
        {
          type: 'article',
          title: 'When Trivial Arguments Trigger Strong Emotions',
          author: 'Article by Elka Cubacub',
        }
      ],
      hasButton: true,
      buttonText: "Continue →",
    }
  ];

  const currentSlideData = slides[currentSlide];

  const handleContinue = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handlePrimaryAction = () => {
    // For the last slide with primary/secondary buttons
    onComplete();
  };

  const handleSecondaryAction = () => {
    // For the last slide "Maybe later"
    onComplete();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={[styles.scrollContent, currentSlide === 3 && styles.scrollContentCompact]}>
        {/* Title */}
        <Text style={[styles.title, currentSlide === 3 && styles.titleCompact]}>{currentSlideData.title}</Text>

        {/* Slide 1: Welcome with image */}
        {currentSlide === 0 && (
          <View style={styles.contentContainer}>
            {currentSlideData.image ? (
              <Image
                source={currentSlideData.image}
                style={styles.welcomeImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.welcomeImage, styles.imagePlaceholder]}>
                <Text style={styles.placeholderText}>📓</Text>
                <Text style={styles.placeholderSubtext}>Add welcome-notebook.jpg</Text>
              </View>
            )}
          </View>
        )}

        {/* Slide 2: Note card */}
        {currentSlide === 1 && (
          <View style={styles.contentContainer}>
            <View style={styles.noteCard}>
              <Text style={styles.noteLabel}>{currentSlideData.subtitle}</Text>
              <Text style={styles.noteTitle}>{currentSlideData.noteTitle}</Text>
              <Text style={styles.noteContent}>{currentSlideData.noteContent}</Text>
              <Text style={styles.noteEmoji}>{currentSlideData.emoji}</Text>
            </View>
          </View>
        )}

        {/* Slide 3: Chat card */}
        {currentSlide === 2 && (
          <View style={styles.contentContainer}>
            <View style={styles.chatContainer}>
              <View style={styles.noteCardSmall}>
                <Text style={styles.noteLabel}>NOTE</Text>
                <Text style={styles.noteTextSmall}>{currentSlideData.noteTitle}</Text>
              </View>
              <View style={styles.chatBubble}>
                <Text style={styles.chatText}>{currentSlideData.chatMessage}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Slide 4: Related content cards */}
        {currentSlide === 3 && (
          <View style={styles.contentContainer}>
            <View style={styles.relatedContentContainer}>
              {currentSlideData.contentCards[0].image ? (
                <Image
                  source={currentSlideData.contentCards[0].image}
                  style={styles.relatedImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.relatedImage, styles.imagePlaceholder]}>
                  <Text style={styles.placeholderText}>🖼️</Text>
                </View>
              )}
              <View style={styles.quoteCard}>
                <Text style={styles.quoteText}>{currentSlideData.contentCards[1].text}</Text>
              </View>
              <View style={styles.articleCard}>
                <Text style={styles.articleTitle}>{currentSlideData.contentCards[2].title}</Text>
                <Text style={styles.articleAuthor}>📎 {currentSlideData.contentCards[2].author}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Slide indicators */}
        <View style={styles.indicatorContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === currentSlide && styles.indicatorActive
              ]}
            />
          ))}
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.buttonContainer}>
        {currentSlideData.hasButton && (
          <View style={styles.navigationButtons}>
            {currentSlide > 0 && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBack}
                activeOpacity={0.8}
              >
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.continueButton, currentSlide === 0 && styles.continueButtonFullWidth]}
              onPress={handleContinue}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>{currentSlideData.buttonText}</Text>
            </TouchableOpacity>
          </View>
        )}

        {currentSlideData.hasButtons && (
          <>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handlePrimaryAction}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>{currentSlideData.primaryButtonText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleSecondaryAction}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>{currentSlideData.secondaryButtonText}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 100,
    paddingBottom: 20,
  },
  scrollContentCompact: {
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: '400',
    color: '#FFFFFF',
    marginBottom: 30,
    lineHeight: 36,
  },
  titleCompact: {
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    marginBottom: 30,
    lineHeight: 24,
  },
  contentContainer: {
    flex: 1,
    marginBottom: 20,
  },

  // Slide 1: Welcome
  welcomeImage: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    marginBottom: 20,
  },
  imagePlaceholder: {
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 12,
    color: '#666666',
  },

  // Slide 2: Note card
  noteCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 24,
    position: 'relative',
  },
  noteLabel: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 12,
    letterSpacing: 1,
  },
  noteTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  noteContent: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
    marginBottom: 20,
  },
  noteEmoji: {
    fontSize: 40,
    position: 'absolute',
    bottom: 20,
    right: 20,
  },

  // Slide 3: Chat
  chatContainer: {
    gap: 16,
  },
  noteCardSmall: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 20,
  },
  noteTextSmall: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  chatBubble: {
    backgroundColor: '#6B5B95',
    borderRadius: 20,
    borderBottomRightRadius: 4,
    padding: 16,
    alignSelf: 'flex-end',
    maxWidth: '70%',
  },
  chatText: {
    fontSize: 15,
    color: '#FFFFFF',
  },

  // Slide 4: Related content
  relatedContentContainer: {
    gap: 12,
    marginBottom: 20,
  },
  relatedImage: {
    width: 160,
    height: 200,
    borderRadius: 12,
  },
  quoteCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 20,
  },
  quoteText: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  articleCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 20,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  articleAuthor: {
    fontSize: 14,
    color: '#999999',
  },

  // Indicators
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    marginBottom: 20,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3a3a3a',
  },
  indicatorActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },

  // Buttons
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 30,
    gap: 16,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    flex: 1,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  continueButton: {
    backgroundColor: '#C8D5B9',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    flex: 1,
  },
  continueButtonFullWidth: {
    flex: 1,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  primaryButton: {
    backgroundColor: '#C8D5B9',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  secondaryButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
