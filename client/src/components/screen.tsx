import type {
  PropsWithChildren,
} from 'react';

import type {
  StyleProp,
  ViewStyle,
} from 'react-native';

import {
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  theme,
} from '@/src/constants/theme';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}>;

export function Screen({
  children,
  scroll = false,
  contentStyle,
}: ScreenProps) {
  if (scroll) {
    return (
      <SafeAreaView
        style={styles.safeArea}
        edges={[
          'top',
          'left',
          'right',
        ]}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            contentStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={[
        'top',
        'left',
        'right',
      ]}
    >
      <View
        style={[
          styles.content,
          contentStyle,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,

    backgroundColor:
      theme.colors.background,
  },

  content: {
    flex: 1,

    padding:
      theme.spacing.md,
  },

  scrollContent: {
    flexGrow: 1,

    padding:
      theme.spacing.md,
  },
});
