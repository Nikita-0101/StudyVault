import {
  Ionicons,
} from '@expo/vector-icons';

import {
  router,
} from 'expo-router';

import {
  useState,
} from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  PrimaryButton,
} from '@/src/components/primary-button';

import {
  Screen,
} from '@/src/components/screen';

import {
  TextField,
} from '@/src/components/text-field';

import {
  theme,
} from '@/src/constants/theme';

export default function LoginScreen() {
  const [
    email,
    setEmail,
  ] = useState('');

  const [
    password,
    setPassword,
  ] = useState('');

  const handleLogin = () => {
    /*
     * Временно открываем приложение
     * без запроса к backend.
     *
     * Позже здесь будет:
     *
     * POST /api/auth/login
     */
    router.replace(
      '/subjects',
    );
  };

  return (
    <Screen
      scroll
      contentStyle={
        styles.screenContent
      }
    >
      <View style={styles.container}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Ionicons
              name="library"
              size={34}
              color={
                theme.colors.primary
              }
            />
          </View>

          <Text style={styles.appName}>
            StudyVault
          </Text>

          <Text style={styles.subtitle}>
            Все учебные материалы
            в одном месте
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.title}>
            Вход
          </Text>

          <Text style={styles.description}>
            Войдите в аккаунт,
            чтобы продолжить работу
          </Text>

          <TextField
            label="Электронная почта"
            placeholder="student@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextField
            label="Пароль"
            placeholder="Введите пароль"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <PrimaryButton
            title="Войти"
            onPress={handleLogin}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Нет аккаунта?
            </Text>

            <Pressable
              onPress={() => {
                router.push(
                  '/register',
                );
              }}
            >
              <Text style={styles.footerLink}>
                Зарегистрироваться
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    justifyContent: 'center',
  },

  container: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    gap: theme.spacing.xl,
  },

  brand: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },

  logo: {
    width: 72,
    height: 72,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius:
      theme.radius.lg,

    backgroundColor:
      theme.colors.primarySoft,
  },

  appName: {
    color:
      theme.colors.text,

    fontSize: 32,
    fontWeight: '800',
  },

  subtitle: {
    color:
      theme.colors.textSecondary,

    fontSize: 16,
    textAlign: 'center',
  },

  form: {
    gap: theme.spacing.md,

    padding:
      theme.spacing.lg,

    borderWidth: 1,
    borderColor:
      theme.colors.border,

    borderRadius:
      theme.radius.lg,

    backgroundColor:
      theme.colors.surface,
  },

  title: {
    color:
      theme.colors.text,

    fontSize: 26,
    fontWeight: '800',
  },

  description: {
    marginBottom:
      theme.spacing.sm,

    color:
      theme.colors.textSecondary,

    fontSize: 15,
    lineHeight: 22,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',

    gap: theme.spacing.sm,

    marginTop:
      theme.spacing.sm,
  },

  footerText: {
    color:
      theme.colors.textSecondary,

    fontSize: 14,
  },

  footerLink: {
    color:
      theme.colors.primary,

    fontSize: 14,
    fontWeight: '700',
  },
});
