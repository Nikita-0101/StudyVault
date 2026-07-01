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

const demoSubjects = [
  {
    id: '1',
    title: 'Математический анализ',
    materialsCount: 12,
  },
  {
    id: '2',
    title: 'Физика',
    materialsCount: 8,
  },
  {
    id: '3',
    title: 'Программирование',
    materialsCount: 17,
  },
];

export default function SubjectsScreen() {
  return (
    <Screen scroll>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>
            Личное пространство
          </Text>

          <Text style={styles.title}>
            Мои предметы
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.addButton,

            pressed
              ? styles.addButtonPressed
              : null,
          ]}
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

      <Text style={styles.description}>
        Сохраняйте заметки, ссылки
        и учебные файлы по предметам.
      </Text>

      <View style={styles.list}>
        {demoSubjects.map(
          (subject) => (
            <Pressable
              key={subject.id}
              style={({ pressed }) => [
                styles.card,

                pressed
                  ? styles.cardPressed
                  : null,
              ]}
              onPress={() => undefined}
            >
              <View style={styles.cardIcon}>
                <Ionicons
                  name="book-outline"
                  size={24}
                  color={
                    theme.colors.primary
                  }
                />
              </View>

              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>
                  {subject.title}
                </Text>

                <Text
                  style={
                    styles.cardDescription
                  }
                >
                  Материалов:{' '}
                  {subject.materialsCount}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={22}
                color={
                  theme.colors.textSecondary
                }
              />
            </Pressable>
          ),
        )}
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

  addButtonPressed: {
    backgroundColor:
      theme.colors.primaryPressed,
  },

  description: {
    marginTop:
      theme.spacing.md,

    color:
      theme.colors.textSecondary,

    fontSize: 15,
    lineHeight: 22,
  },

  list: {
    gap: theme.spacing.md,

    marginTop:
      theme.spacing.lg,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: theme.spacing.md,

    padding:
      theme.spacing.md,

    borderWidth: 1,
    borderColor:
      theme.colors.border,

    borderRadius:
      theme.radius.md,

    backgroundColor:
      theme.colors.surface,
  },

  cardPressed: {
    opacity: 0.8,
  },

  cardIcon: {
    width: 48,
    height: 48,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius:
      theme.radius.md,

    backgroundColor:
      theme.colors.primarySoft,
  },

  cardContent: {
    flex: 1,
    gap: theme.spacing.xs,
  },

  cardTitle: {
    color:
      theme.colors.text,

    fontSize: 16,
    fontWeight: '700',
  },

  cardDescription: {
    color:
      theme.colors.textSecondary,

    fontSize: 14,
  },
});
