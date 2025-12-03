# Setting up React Native development environment

Today I set up React Native on my Mac. Steps: 1) Install Node.js and Watchman using Homebrew (brew install node && brew install watchman). 2) Install Xcode from App Store and accept license. 3) Install CocoaPods (sudo gem install cocoapods). 4) Create new project with npx react-native init MyApp. 5) For iOS, run "cd ios && pod install". Common issue: if build fails, try "cd ios && pod install --repo-update".
