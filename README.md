# GotSport Tracker

A React Native (Expo) app for tracking football scores, league table, and fixtures from [GotSport](https://system.gotsport.com). Built for St Albans City FC Academy supporters (U14/U16).

**Note:** This app is in development and is not official.

## Features

- **Home** – League position, last result, next fixture, today’s and upcoming fixtures
- **Table** – Full league table (P, W, D, L, GF, GA, GD, PTS) with team crests
- **Results** – Recent results with opponent crests
- **Fixtures** – Fixtures for the next 15 days with home/away crests and scores
- **Settings** – Choose age group (U14 / U16); data is cached locally

Theme: St Albans yellow (`#FFD700`) and dark blue (`#0a2463`).

## Tech stack

- **Expo** ~52, **React Native** 0.76, **Expo Router** (file-based tabs)
- **AsyncStorage** for cache and selected team
- Data from GotSport via client-side requests (no official API)

## Prerequisites

- Node.js 18+
- npm or yarn
- For local Android: JDK 17 and Android SDK  
- For iOS: Xcode (macOS)  
- For builds: [Expo account](https://expo.dev) (EAS Build)

## Setup

```bash
# Install dependencies
npm install

# Start dev server
npm start
```

Then open **Android** or **iOS** from the terminal, or scan the QR code with Expo Go.

- **Android device/emulator:** `npm run android`
- **iOS simulator:** `npm run ios`

## Scripts

| Command           | Description                |
|-------------------|----------------------------|
| `npm start`       | Start Expo dev server      |
| `npm run android`| Run on Android             |
| `npm run ios`     | Run on iOS                 |
| `npm run web`     | Run in browser             |
| `npm run build:apk` | Build Android APK (EAS)  |

## Building an APK (EAS)

1. Log in: `npx eas login`
2. Build: `npm run build:apk` (or `npx eas build --platform android --profile preview`)
3. Download the APK from the link in the terminal or from [expo.dev](https://expo.dev) → your project → Builds

The **preview** profile produces an APK for direct install. Use **production** for an AAB for the Play Store.

## CI / GitHub Actions

- **Tests** (`.github/workflows/tests.yml`): runs unit tests on every push and PR.
- **EAS Build** (`.github/workflows/build.yml`): runs when the Tests workflow succeeds on **push to `main` or `master`**, and triggers EAS builds for **iOS and Android** (preview profile).

To enable EAS builds in CI:

1. Create an [Expo access token](https://expo.dev/accounts/[account]/settings/access-tokens).
2. In your GitHub repo: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
3. Name: `EXPO_TOKEN`, Value: your Expo token.

## Project structure

```
app/                 # Expo Router app entry and tabs
  (tabs)/            # Home, Table, Results, Fixtures, Settings
components/          # TeamBadge, ScheduleMatchList
lib/                 # badges, cache, scraper, teamCrests
assets/              # Team crests and images
patches/             # Gradle/build fixes (expo-font, expo-asset)
scripts/             # apply-expo-gradle-fix.js, etc.
android/             # Native Android project
```

## License

Private. Not an official St Albans City FC or GotSport product.
