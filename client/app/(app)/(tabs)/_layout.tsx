import {
  Ionicons,
} from '@expo/vector-icons';

import {
  Tabs,
} from 'expo-router';

import {
  Platform,
} from 'react-native';

import {
  theme,
} from '@/src/constants/theme';

export default function AppTabsLayout() {
  return (
    <Tabs
      initialRouteName="subjects"
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor:
          theme.colors.primary,

        tabBarInactiveTintColor:
          theme.colors.tabInactive,

        tabBarHideOnKeyboard: true,

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },

        tabBarStyle: {
          height:
            Platform.OS === 'web'
              ? 64
              : 72,

          paddingTop: 8,

          paddingBottom:
            Platform.OS === 'web'
              ? 8
              : 12,

          borderTopWidth: 1,

          borderTopColor:
            theme.colors.border,

          backgroundColor:
            theme.colors.tabBar,
        },
      }}
    >
      <Tabs.Screen
        name="subjects"
        options={{
          title: 'Предметы',

          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              name="library-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="groups"
        options={{
          title: 'Группы',

          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              name="people-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профиль',

          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              name="person-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
