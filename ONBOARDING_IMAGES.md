# Required Onboarding Images

To complete the onboarding flow, you'll need to add the following images to the `assets/onboarding/` directory:

## Directory Structure
Create this folder structure:
```
assets/
└── onboarding/
    ├── welcome-notebook.jpg
    └── related-image.jpg
```

## Image Details

### 1. welcome-notebook.jpg
- **Location**: `assets/onboarding/welcome-notebook.jpg`
- **Used in**: Slide 1 - Welcome screen
- **Description**: An image of an open notebook with pages, similar to the one shown in your screenshot with pressed flowers/botanical drawings
- **Recommended size**: 600x400px or similar aspect ratio
- **Purpose**: Shows the "living notebook" concept

### 2. related-image.jpg
- **Location**: `assets/onboarding/related-image.jpg`
- **Used in**: Slide 4 - Related content screen
- **Description**: A classical painting or artwork (in your screenshot it appears to be a classical painting with figures)
- **Recommended size**: 320x400px (portrait orientation)
- **Purpose**: Demonstrates how the app finds related content like artwork

## How to Add Images

1. Create the directory:
   ```
   mkdir assets/onboarding
   ```

2. Add your images to the `assets/onboarding/` folder with the exact names above

3. The app will automatically load them using `require()` statements

## Temporary Placeholder

If you don't have the images ready, you can:
1. Use any placeholder images with the same filenames
2. Comment out the `require()` lines in `OnboardingScreen.js` temporarily
3. The rest of the onboarding flow will still work (just without those images)

## Notes

- All other visual elements (note cards, chat bubbles, letter envelope, etc.) are created using React Native components and styles
- No additional images are needed for the other slides
- The images should match the dark theme aesthetic (works well on black background)
