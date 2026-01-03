import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Homework, Quiz } from './api';

// Configure how notifications should behave when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class NotificationService {
  private static notificationInterval: NodeJS.Timeout | null = null;

  // Request permissions for notifications
  static async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  // Schedule a notification for a specific homework
  static async scheduleHomeworkNotification(homework: Homework) {
    const dueDate = new Date(homework.dueDate);
    const now = new Date();
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Only notify if deadline is within 48 hours and not passed
    if (hoursUntilDue > 0 && hoursUntilDue <= 48) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📚 Homework Reminder',
          body: `"${homework.title}" is due in ${Math.floor(hoursUntilDue)} hours!`,
          data: { type: 'homework', id: homework.id },
        },
        trigger: null, // Show immediately
      });
    }
  }

  // Schedule a notification for a specific quiz
  static async scheduleQuizNotification(quiz: Quiz) {
    const endDate = new Date(quiz.endDateTime);
    const now = new Date();
    const hoursUntilEnd = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Only notify if deadline is within 48 hours and not passed
    if (hoursUntilEnd > 0 && hoursUntilEnd <= 48) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📝 Quiz Reminder',
          body: `Quiz "${quiz.title}" ends in ${Math.floor(hoursUntilEnd)} hours!`,
          data: { type: 'quiz', id: quiz.id },
        },
        trigger: null, // Show immediately
      });
    }
  }

  // Check all homeworks and quizzes for upcoming deadlines
  static async checkDeadlines(homeworks: Homework[], quizzes: Quiz[]) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.log('Notification permissions not granted');
      return;
    }

    // Cancel all previous scheduled notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Check homeworks
    for (const homework of homeworks) {
      await this.scheduleHomeworkNotification(homework);
    }

    // Check quizzes
    for (const quiz of quizzes) {
      await this.scheduleQuizNotification(quiz);
    }

    console.log('[Notifications] Checked deadlines:', {
      homeworks: homeworks.length,
      quizzes: quizzes.length,
    });
  }

  // Start periodic checking (for debugging: 5 seconds, for production: 1 hour)
  static startPeriodicCheck(
    fetchHomeworks: () => Promise<Homework[]>,
    fetchQuizzes: () => Promise<Quiz[]>,
    intervalSeconds: number = 5 // Default 5 seconds for debugging
  ) {
    // Clear any existing interval
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
    }

    // Initial check
    this.performCheck(fetchHomeworks, fetchQuizzes);

    // Set up periodic check
    this.notificationInterval = setInterval(
      () => {
        this.performCheck(fetchHomeworks, fetchQuizzes);
      },
      intervalSeconds * 1000
    );

    console.log(`[Notifications] Started periodic check every ${intervalSeconds} seconds`);
  }

  // Stop periodic checking
  static stopPeriodicCheck() {
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
      this.notificationInterval = null;
      console.log('[Notifications] Stopped periodic check');
    }
  }

  // Perform a single check
  private static async performCheck(
    fetchHomeworks: () => Promise<Homework[]>,
    fetchQuizzes: () => Promise<Quiz[]>
  ) {
    try {
      const [homeworks, quizzes] = await Promise.all([
        fetchHomeworks(),
        fetchQuizzes(),
      ]);

      await this.checkDeadlines(homeworks, quizzes);
    } catch (error) {
      console.error('[Notifications] Error checking deadlines:', error);
    }
  }
}
