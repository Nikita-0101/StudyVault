import {
  Ionicons,
} from '@expo/vector-icons';

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

export default function GroupsScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>
            Совместная учёба
          </Text>

          <Text style={styles.title}>
            Учебные группы
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          style={styles.addButton}
          onPress={() => undefined}
        >
          <Ionicons
            name="add"
            size={26}
            color={
              theme.colors.textOnPrimary
            }
          />
        </Pressable>
      </View>

      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Ionicons
            name="people-outline"
            size={44}
            color={
              theme.colors.primary
            }
          />
        </View>

        <Text style={styles.emptyTitle}>
          Групп пока нет
        </Text>

        <Text style={styles.emptyDescription}>
          Создайте новую учебную
          группу или присоединитесь
          по коду приглашения.
        </Text>

        <View style={styles.actions}>
          <Pressable
            style={styles.primaryAction}
            onPress={() => undefined}
          >
            <Text
              style={
                styles.primaryActionText
              }
            >
              Создать группу
            </Text>
          </Pressable>

          <Pressable
            style={styles.secondaryAction}
            onPress={() => undefined}
          >
            <Text
              style={
                styles.secondaryActionText
              }
            >
              Войти по коду
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',

    gap: theme.spacing.md,
  },

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

  addButton: {
    width: 48,
    height: 48,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius:
      theme.radius.md,

    backgroundColor:
      theme.colors.primary,
  },

  emptyState: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal:
      theme.spacing.lg,
  },

  emptyIcon: {
    width: 88,
    height: 88,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius:
      theme.radius.round,

    backgroundColor:
      theme.colors.primarySoft,
  },

  emptyTitle: {
    marginTop:
      theme.spacing.lg,

    color:
      theme.colors.text,

    fontSize: 22,
    fontWeight: '800',
  },

  emptyDescription: {
    maxWidth: 360,

    marginTop:
      theme.spacing.sm,

    color:
      theme.colors.textSecondary,

    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },

  actions: {
    width: '100%',
    maxWidth: 360,

    gap: theme.spacing.md,

    marginTop:
      theme.spacing.lg,
  },

  primaryAction: {
    minHeight: 50,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius:
      theme.radius.md,

    backgroundColor:
      theme.colors.primary,
  },

  primaryActionText: {
    color:
      theme.colors.textOnPrimary,

    fontSize: 15,
    fontWeight: '700',
  },

  secondaryAction: {
    minHeight: 50,

    alignItems: 'center',
    justifyContent: 'center',

    borderWidth: 1,
    borderColor:
      theme.colors.border,

    borderRadius:
      theme.radius.md,

    backgroundColor:
      theme.colors.surface,
  },

  secondaryActionText: {
    color:
      theme.colors.primary,

    fontSize: 15,
    fontWeight: '700',
  },
});
