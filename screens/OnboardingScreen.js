import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
  Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

export default function OnboardingScreen({ onComplete }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "Welcome to Lightpage, your living notebook",
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
    },
    {
      title: "On Sundays, it'll recap your week and offer insights in a personal letter",
      letterPreview: {
        recipient: "Nathan",
        text: "\nWhat a week!\nHere's what\nstood out...",
      },
      hasToggle: true,
      toggleLabel: "Notify me when my letter is ready",
      hasButton: true,
      buttonText: "Continue →",
    },
    {
      title: "Want a daily reminder to make it a habit?",
      subtitle: "Lightpage works best when you brain dump regularly",
      timeSelector: "8:00 AM",
      disclaimer: "You'll only get a daily reminder if you haven't created any notes or chats recently",
      hasButtons: true,
      primaryButtonText: "Turn on daily reminder",
      secondaryButtonText: "Maybe later",
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text style={styles.title}>{currentSlideData.title}</Text>

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

        {/* Slide 5: Letter preview */}
        {currentSlide === 4 && (
          <View style={styles.contentContainer}>
            <View style={styles.letterContainer}>
              <View style={styles.envelope}>
                <View style={styles.envelopeFlap} />
                <View style={styles.letter}>
                  <Text style={styles.letterText}>
                    Dear {currentSlideData.letterPreview.recipient},{'\n'}
                    {currentSlideData.letterPreview.text}
                  </Text>
                </View>
                <View style={styles.stamp}>
                  <Text style={styles.stampIcon}>🌹</Text>
                </View>
              </View>
            </View>

            <View style={styles.toggleContainer}>
              <View style={styles.toggleSwitch}>
                <View style={[styles.toggleTrack, styles.toggleOn]}>
                  <View style={[styles.toggleThumb, styles.toggleThumbOn]} />
                </View>
              </View>
              <Text style={styles.toggleText}>{currentSlideData.toggleLabel}</Text>
            </View>
          </View>
        )}

        {/* Slide 6: Daily reminder */}
        {currentSlide === 5 && (
          <View style={styles.contentContainer}>
            <Text style={styles.subtitle}>{currentSlideData.subtitle}</Text>
            <View style={styles.timeButton}>
              <Text style={styles.timeText}>{currentSlideData.timeSelector}</Text>
            </View>
            <Text style={styles.disclaimer}>{currentSlideData.disclaimer}</Text>
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
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.buttonContainer}>
        {currentSlideData.hasButton && (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>{currentSlideData.buttonText}</Text>
          </TouchableOpacity>
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
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 100,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '400',
    color: '#FFFFFF',
    marginBottom: 30,
    lineHeight: 36,
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
    gap: 16,
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

  // Slide 5: Letter
  letterContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  envelope: {
    width: 200,
    height: 240,
    backgroundColor: '#E8E4D9',
    borderRadius: 8,
    position: 'relative',
    overflow: 'visible',
  },
  envelopeFlap: {
    position: 'absolute',
    top: -40,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: '#D4CFC0',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    transform: [{ rotateX: '30deg' }],
  },
  letter: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 4,
  },
  letterText: {
    fontSize: 13,
    color: '#333333',
    lineHeight: 20,
  },
  stamp: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    backgroundColor: '#8B6B47',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stampIcon: {
    fontSize: 20,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleSwitch: {
    width: 50,
    height: 28,
  },
  toggleTrack: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    backgroundColor: '#3a3a3a',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleOn: {
    backgroundColor: '#7FB069',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
  },
  toggleText: {
    fontSize: 15,
    color: '#FFFFFF',
    flex: 1,
  },

  // Slide 6: Daily reminder
  timeButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  timeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disclaimer: {
    fontSize: 14,
    color: '#999999',
    lineHeight: 20,
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
  continueButton: {
    backgroundColor: '#C8D5B9',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
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
