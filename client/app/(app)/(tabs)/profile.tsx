import {
  Ionicons,
} from '@expo/vector-icons';

import {
  router,
} from 'expo-router';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Screen,
} from '@/src/components/screen';

import {
  theme,
} from '@/src/constants/theme';

export default function ProfileScreen() {
  const handleLogout = () => {
    router.replace(
      '/login',
    );
  };

  return (
    <Screen>
      <Text style={styles.eyebrow}>
        Аккаунт
      </Text>

      <Text style={styles.title}>
        Профиль
      </Text>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            Н
          </Text>
        </View>

        <View style={styles.userData}>
          <Text style={styles.userName}>
            Никита
          </Text>

          <Text style={styles.userEmail}>
            student@example.com
          </Text>
        </View>
      </View>

      <View style={styles.menu}>
        <Pressable
          style={styles.menuItem}
          onPress={() => undefined}
        >
          <View style={styles.menuIcon}>
            <Ionicons
              name="person-outline"
              size={22}
              color={
                theme.colors.primary
              }
            />
          </View>

          <Text style={styles.menuText}>
            Изменить профиль
          </Text>

          <Ionicons
            name="chevron-forward"
            size={20}
            color={
              theme.colors.textSecondary
            }
          />
        </Pressable>

        <Pressable
          style={styles.menuItem}
          onPress={() => undefined}
        >
          <View style={styles.menuIcon}>
            <Ionicons
              name="settings-outline"
              size={22}
              color={
                theme.colors.primary
              }
            />
          </View>

          <Text style={styles.menuText}>
            Настройки
          </Text>

          <Ionicons
            name="chevron-forward"
            size={20}
            color={
              theme.colors.textSecondary
            }
          />
        </Pressable>
      </View>

      <Pressable
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Ionicons
          name="log-out-outline"
          size={22}
          color={
            theme.colors.danger
          }
        />

        <Text style={styles.logoutText}>
          Выйти
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color:
      theme.colors.primary,

    fontSize: 14,
    fontWeight: '700',
  },

  title: {
    marginTop:
      theme.spacing.xs,

    color:
      theme.colors.text,

    fontSize: 30,
    fontWeight: '800',
  },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: theme.spacing.md,

    marginTop:
      theme.spacing.lg,

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

  avatar: {
    width: 64,
    height: 64,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius:
      theme.radius.round,

    backgroundColor:
      theme.colors.primary,
  },

  avatarText: {
    color:
      theme.colors.textOnPrimary,

    fontSize: 26,
    fontWeight: '800',
  },

  userData: {
    flex: 1,
    gap: theme.spacing.xs,
  },

  userName: {
    color:
      theme.colors.text,

    fontSize: 20,
    fontWeight: '800',
  },

  userEmail: {
    color:
      theme.colors.textSecondary,

    fontSize: 14,
  },

  menu: {
    gap: theme.spacing.sm,

    marginTop:
      theme.spacing.lg,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: theme.spacing.md,

    minHeight: 64,

    paddingHorizontal:
      theme.spacing.md,

    borderWidth: 1,
    borderColor:
      theme.colors.border,

    borderRadius:
      theme.radius.md,

    backgroundColor:
      theme.colors.surface,
  },

  menuIcon: {
    width: 40,
    height: 40,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius:
      theme.radius.sm,

    backgroundColor:
      theme.colors.primarySoft,
  },

  menuText: {
    flex: 1,

    color:
      theme.colors.text,

    fontSize: 15,
    fontWeight: '600',
  },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: theme.spacing.sm,

    minHeight: 52,

    marginTop: 'auto',

    borderWidth: 1,
    borderColor: '#FECACA',

    borderRadius:
      theme.radius.md,

    backgroundColor: '#FEF2F2',
  },

  logoutText: {
    color:
      theme.colors.danger,

    fontSize: 15,
    fontWeight: '700',
  },
});
