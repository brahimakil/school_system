import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HomeScreen from '../screens/HomeScreen';
import ClassesScreen from '../screens/ClassesScreen';
import QuizzesScreen from '../screens/QuizzesScreen';
import TasksScreen from '../screens/TasksScreen';
import CoursesScreen from '../screens/CoursesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatScreen from '../screens/ChatScreen';
import AIChatScreen from '../screens/AIChatScreen';
import SplashScreen from '../screens/SplashScreen';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const ChatStack = createStackNavigator();

const ChatStackScreen = () => {
  return (
    <ChatStack.Navigator screenOptions={{ headerShown: false }}>
      <ChatStack.Screen name="ChatList" component={ChatScreen} />
      <ChatStack.Screen name="AIChat" component={AIChatScreen} />
    </ChatStack.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const { student, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const [showSplash, setShowSplash] = useState(true);

  // Show splash screen on app start
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // Show nothing while checking auth (brief moment after splash)
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingDot} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {student ? (
        <Tab.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: '#6366f1',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            tabBarActiveTintColor: '#6366f1',
            tabBarInactiveTintColor: '#9ca3af',
            tabBarStyle: {
              backgroundColor: '#fff',
              borderTopWidth: 1,
              borderTopColor: '#e5e7eb',
              paddingBottom: insets.bottom + 8,
              paddingTop: 8,
              height: 60 + insets.bottom,
            },
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '600',
            },
          }}
        >
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{
              title: 'Dashboard',
              tabBarLabel: 'Home',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="home" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Classes"
            component={ClassesScreen}
            options={{
              title: 'My Classes',
              tabBarLabel: 'Classes',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="book" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Tasks"
            component={TasksScreen}
            options={{
              title: 'My Tasks',
              tabBarLabel: 'Tasks',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="checkmark-done" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Chat"
            component={ChatStackScreen}
            options={{
              title: 'Messages',
              tabBarLabel: 'Chat',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="chatbubbles" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Quizzes"
            component={QuizzesScreen}
            options={{
              title: 'My Quizzes',
              tabBarLabel: 'Quizzes',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="document-text" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Courses"
            component={CoursesScreen}
            options={{
              title: 'My Courses',
              tabBarLabel: 'Courses',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="school" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              title: 'My Profile',
              tabBarLabel: 'Profile',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="person" size={size} color={color} />
              ),
            }}
          />
        </Tab.Navigator>
      ) : (
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6366f1',
  },
  loadingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
});

export default AppNavigator;
