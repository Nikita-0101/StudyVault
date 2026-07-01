import type {
  StyleProp,
  ViewStyle,
} from 'react-native';

import {
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';

import {
  theme,
} from '@/src/constants/theme';

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  title,
  onPress,
  disabled = false,
  style,
}: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,

        pressed &&
        !disabled
          ? styles.pressed
          : null,

        disabled
          ? styles.disabled
          : null,

        style,
      ]}
    >
      <Text style={styles.text}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,

    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal:
      theme.spacing.lg,

    borderRadius:
      theme.radius.md,

    backgroundColor:
      theme.colors.primary,
  },

  pressed: {
    backgroundColor:
      theme.colors.primaryPressed,

    transform: [
      {
        scale: 0.99,
      },
    ],
  },

  disabled: {
    opacity: 0.5,
  },

  text: {
    color:
      theme.colors.textOnPrimary,

    fontSize: 16,
    fontWeight: '700',
  },
});
