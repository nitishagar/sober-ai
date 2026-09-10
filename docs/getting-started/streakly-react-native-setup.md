# Streakly (React Native) — Setup Guide (MVP, Step by Step)

This guide resets your app setup from Flutter to **React Native** with a clean, beginner-friendly workflow in **VS Code**.

## 0) MVP decisions (locked)

- App: **Streakly: Quit Tracker**
- Stack: **React Native + TypeScript**
- State: **Zustand** (simple, minimal)
- Local storage: **AsyncStorage** (offline)
- Navigation: **React Navigation**
- Scope: no backend, no overengineering

---

## 1) Prerequisites (Mac)

Install and verify:

- Node LTS (use `nvm` recommended)
- Watchman
- Xcode + Command Line Tools
- CocoaPods
- Android Studio (later if you want Android emulator)

Quick checks:

```bash
node -v
npm -v
watchman -v
xcode-select -p
pod --version
```

---

## 2) Create a fresh React Native project

Use React Native CLI (good for learning native workflow):

```bash
npx react-native@latest init streakly --template react-native-template-typescript
cd streakly
```

Install iOS pods:

```bash
cd ios && pod install && cd ..
```

Run app on iOS simulator:

```bash
npx react-native run-ios
```

---

## 3) Install core MVP packages

```bash
npm i @react-navigation/native @react-navigation/native-stack
npm i zustand @react-native-async-storage/async-storage
npm i date-fns
```

Install native deps for navigation on iOS:

```bash
npm i react-native-screens react-native-safe-area-context
cd ios && pod install && cd ..
```

---

## 4) Suggested beginner folder structure

```text
src/
  features/
    tracker/
      model/
      data/
      state/
      ui/screens/
  navigation/
  theme/
```

Mirrors your Flutter mental model, so migration is easier.

---

## 5) First screens to build (MVP order)

1. `HomeScreen`
   - Empty state: "No trackers yet"
   - Tracker list
2. `AddTrackerScreen`
   - Title input
   - Start button
3. Tracker store + storage
   - Save/read/delete trackers from AsyncStorage

Keep this as pure MVP.

---

## 6) Duolingo-like UI direction (lightweight)

Start simple and consistent:

- Rounded cards (`borderRadius: 16`)
- Bold title text + friendly spacing
- Bright CTA color (green accent)
- Large tappable buttons
- Minimal text, clear actions

Do not build a design system yet; keep a tiny `theme/colors.ts` and `theme/spacing.ts` only.

---

## 7) Codex in terminal workflow (clean + practical)

In VS Code terminal, run Codex from project root and use this loop:

1. Ask for **one tiny task only** (example: "Create AddTrackerScreen UI only").
2. Let Codex edit files.
3. Run app and test manually.
4. Commit small changes.
5. Repeat.

Prompt pattern that works well:

```text
Task: [one small task]
Constraints:
- Keep it beginner-friendly
- No overengineering
- Explain what you changed and why
- Show exact files touched
```

---

## 8) What to do next (recommended immediate step)

After project boots successfully, build this exact next step:

- Create `HomeScreen` + navigation stack
- Add a floating `+` button that opens `AddTrackerScreen`
- Build `AddTrackerScreen` with:
  - `TextInput` for title
  - `Start` button
  - On press: create tracker with `Date.now()`, save, go back

---

## 8.1) Step 1 now: HomeScreen + Navigation Stack (+ button only)

Below is the exact first implementation to do right now (no storage yet).

### Install stack navigator (if not already)

```bash
npm i @react-navigation/native-stack react-native-screens react-native-safe-area-context
cd ios && pod install && cd ..
```

### Create these files

#### `src/navigation/AppNavigator.tsx`

```tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../features/tracker/ui/screens/HomeScreen';
import { AddTrackerScreen } from '../features/tracker/ui/screens/AddTrackerScreen';

export type RootStackParamList = {
  Home: undefined;
  AddTracker: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Streakly' }}
        />
        <Stack.Screen
          name="AddTracker"
          component={AddTrackerScreen}
          options={{ title: 'New Tracker' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

#### `src/features/tracker/ui/screens/HomeScreen.tsx`

```tsx
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.emptyText}>No trackers yet</Text>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddTracker')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 20,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#58CC02',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  fabText: {
    color: '#fff',
    fontSize: 34,
    lineHeight: 36,
    fontWeight: '700',
    marginTop: -2,
  },
});
```

#### `src/features/tracker/ui/screens/AddTrackerScreen.tsx`

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function AddTrackerScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>AddTrackerScreen (Step 2 will add input + Start)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  text: {
    fontSize: 16,
    color: '#111827',
  },
});
```

#### `App.tsx`

```tsx
import React from 'react';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return <AppNavigator />;
}
```

### Run it

```bash
npx react-native run-ios
```

Expected result:

- Home screen opens with “No trackers yet”
- Green floating `+` button visible
- Tapping `+` opens `AddTrackerScreen`

---

## 9) MVP roadmap after setup

- Human-readable dates ("Started 2 hours ago")
- Days-since timer
- Basic streak logic
- Simple insights (e.g., total quit attempts)

Keep everything offline until the MVP feels solid.

---

## 10) Codex terminal setup (for your own workflow)

Use this once on your machine:

```bash
npm i -g @openai/codex
codex --login
```

Then inside your app folder:

```bash
cd ~/path/to/streakly
codex
```

Use this prompt style each time:

```text
Task: Build HomeScreen with floating + button and stack navigation.
Constraints:
- One small step only
- Explain changes in simple terms
- Avoid overengineering
```
