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

export default function RegisterScreen() {
  const [
    name,
    setName,
  ] = useState('');

  const [
    email,
    setEmail,
  ] = useState('');

  const [
    password,
    setPassword,
  ] = useState('');

  const [
    passwordConfirmation,
    setPasswordConfirmation,
  ] = useState('');

  const handleRegister = () => {
    /*
     * Временно открываем приложение.
     *
     * Позже здесь будет:
     *
     * POST /api/auth/register
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
              size={30}
              color={
                theme.colors.primary
              }
            />
          </View>

          <Text style={styles.appName}>
            StudyVault
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.title}>
            Регистрация
          </Text>

          <Text style={styles.description}>
            Создайте аккаунт,
            чтобы сохранять личные
            материалы и работать
            в учебных группах
          </Text>

          <TextField
            label="Имя"
            placeholder="Никита"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

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
            placeholder="Минимум 8 символов"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <TextField
            label="Повторите пароль"
            placeholder="Введите пароль ещё раз"
            value={passwordConfirmation}
            onChangeText={
              setPasswordConfirmation
            }
            secureTextEntry
            autoCapitalize="none"
          />

          <PrimaryButton
            title="Создать аккаунт"
            onPress={handleRegister}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Уже есть аккаунт?
            </Text>

            <Pressable
              onPress={() => {
                router.replace(
                  '/login',
                );
              }}
            >
              <Text style={styles.footerLink}>
                Войти
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
    gap: theme.spacing.lg,
  },

  brand: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },

  logo: {
    width: 64,
    height: 64,

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

    fontSize: 28,
    fontWeight: '800',
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
