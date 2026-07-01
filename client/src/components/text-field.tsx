import type {
  TextInputProps,
} from 'react-native';

import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  theme,
} from '@/src/constants/theme';

type TextFieldProps =
  TextInputProps & {
    label: string;
    error?: string;
  };

export function TextField({
  label,
  error,
  style,
  ...inputProps
}: TextFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
      </Text>

      <TextInput
        {...inputProps}
        placeholderTextColor={
          theme.colors.textSecondary
        }
        style={[
          styles.input,

          error
            ? styles.inputError
            : null,

          style,
        ]}
      />

      {error ? (
        <Text style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
  },

  label: {
    color:
      theme.colors.text,

    fontSize: 14,
    fontWeight: '600',
  },

  input: {
    minHeight: 52,

    paddingHorizontal:
      theme.spacing.md,

    borderWidth: 1,
    borderColor:
      theme.colors.border,

    borderRadius:
      theme.radius.md,

    backgroundColor:
      theme.colors.inputBackground,

    color:
      theme.colors.text,

    fontSize: 16,
  },

  inputError: {
    borderColor:
      theme.colors.danger,
  },

  error: {
    color:
      theme.colors.danger,

    fontSize: 13,
  },
});
