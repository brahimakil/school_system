import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Homework, Quiz, Course } from './api';

// Configure how notifications should behave when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Storage keys for tracking notified items
const NOTIFIED_QUIZZES_KEY = 'notified_quiz_ids';
const NOTIFIED_HOMEWORKS_KEY = 'notified_homework_ids';
const NOTIFIED_COURSES_KEY = 'notified_course_ids';
const QUIZ_REMINDER_KEY = 'quiz_reminder_times';

export class NotificationService {
  private static notificationInterval: NodeJS.Timeout | null = null;
  private static reminderInterval: NodeJS.Timeout | null = null;

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

  // Get already notified IDs from storage
  private static async getNotifiedIds(key: string): Promise<Set<string>> {
    try {
      const stored = await AsyncStorage.getItem(key);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch (error) {
      console.error('Error getting notified IDs:', error);
      return new Set();
    }
  }

  // Save notified IDs to storage
  private static async saveNotifiedIds(key: string, ids: Set<string>): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify([...ids]));
    } catch (error) {
      console.error('Error saving notified IDs:', error);
    }
  }

  // Show immediate notification for new item
  static async showNewItemNotification(type: 'quiz' | 'homework' | 'course', title: string, subject?: string) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    let notificationTitle = '';
    let notificationBody = '';
    let icon = '';

    switch (type) {
      case 'quiz':
        icon = '📝';
        notificationTitle = `${icon} New Quiz Added!`;
        notificationBody = subject 
          ? `A new quiz "${title}" has been assigned for ${subject}. Check it out!`
          : `A new quiz "${title}" has been assigned. Check it out!`;
        break;
      case 'homework':
        icon = '📚';
        notificationTitle = `${icon} New Homework Added!`;
        notificationBody = subject
          ? `New homework "${title}" has been assigned for ${subject}. Don't forget to complete it!`
          : `New homework "${title}" has been assigned. Don't forget to complete it!`;
        break;
      case 'course':
        icon = '📖';
        notificationTitle = `${icon} New Course Material!`;
        notificationBody = subject
          ? `New course "${title}" is now available for ${subject}. Start learning!`
          : `New course "${title}" is now available. Start learning!`;
        break;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: notificationTitle,
        body: notificationBody,
        data: { type, title },
      },
      trigger: null, // Show immediately
    });

    console.log(`[Notification] Sent new ${type} notification: ${title}`);
  }

  // Check for new quizzes and notify
  static async checkNewQuizzes(quizzes: Quiz[]) {
    const notifiedIds = await this.getNotifiedIds(NOTIFIED_QUIZZES_KEY);
    const newQuizzes = quizzes.filter(q => !notifiedIds.has(q.id));

    for (const quiz of newQuizzes) {
      await this.showNewItemNotification('quiz', quiz.title, quiz.className);
      notifiedIds.add(quiz.id);
    }

    await this.saveNotifiedIds(NOTIFIED_QUIZZES_KEY, notifiedIds);
    return newQuizzes.length;
  }

  // Check for new homeworks and notify
  static async checkNewHomeworks(homeworks: Homework[]) {
    const notifiedIds = await this.getNotifiedIds(NOTIFIED_HOMEWORKS_KEY);
    const newHomeworks = homeworks.filter(h => !notifiedIds.has(h.id));

    for (const homework of newHomeworks) {
      await this.showNewItemNotification('homework', homework.title, homework.subject);
      notifiedIds.add(homework.id);
    }

    await this.saveNotifiedIds(NOTIFIED_HOMEWORKS_KEY, notifiedIds);
    return newHomeworks.length;
  }

  // Check for new courses and notify
  static async checkNewCourses(courses: Course[]) {
    const notifiedIds = await this.getNotifiedIds(NOTIFIED_COURSES_KEY);
    const newCourses = courses.filter(c => !notifiedIds.has(c.id));

    for (const course of newCourses) {
      await this.showNewItemNotification('course', course.title, course.subject);
      notifiedIds.add(course.id);
    }

    await this.saveNotifiedIds(NOTIFIED_COURSES_KEY, notifiedIds);
    return newCourses.length;
  }

  // Send quiz reminder notification
  static async sendQuizReminder(quiz: Quiz, hoursRemaining: number, minutesRemaining: number) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    let timeText = '';
    if (hoursRemaining > 0) {
      timeText = `${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''}`;
      if (minutesRemaining > 0) {
        timeText += ` and ${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''}`;
      }
    } else {
      timeText = `${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''}`;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Quiz Starting Soon!',
        body: `Quiz "${quiz.title}" starts in ${timeText}. Get ready!`,
        data: { type: 'quiz_reminder', quizId: quiz.id },
      },
      trigger: null,
    });

    console.log(`[Notification] Quiz reminder sent: ${quiz.title} - ${timeText} remaining`);
  }

  // Check quiz reminders (5 hours before, every 30 minutes)
  static async checkQuizReminders(quizzes: Quiz[]) {
    const now = new Date();
    const reminderData = await this.getQuizReminderData();

    for (const quiz of quizzes) {
      const startTime = new Date(quiz.startDateTime);
      const timeDiff = startTime.getTime() - now.getTime();
      const hoursUntilStart = timeDiff / (1000 * 60 * 60);
      const minutesUntilStart = Math.floor(timeDiff / (1000 * 60));

      // Only remind if quiz is within 5 hours and hasn't started yet
      if (hoursUntilStart > 0 && hoursUntilStart <= 5) {
        // Check if we should send a reminder (every 30 minutes)
        const lastReminder = reminderData[quiz.id] || 0;
        const timeSinceLastReminder = now.getTime() - lastReminder;
        const thirtyMinutes = 30 * 60 * 1000;

        if (timeSinceLastReminder >= thirtyMinutes) {
          const hours = Math.floor(hoursUntilStart);
          const minutes = minutesUntilStart % 60;
          
          await this.sendQuizReminder(quiz, hours, minutes);
          reminderData[quiz.id] = now.getTime();
        }
      }
    }

    await this.saveQuizReminderData(reminderData);
  }

  // Get quiz reminder timestamps
  private static async getQuizReminderData(): Promise<{ [quizId: string]: number }> {
    try {
      const stored = await AsyncStorage.getItem(QUIZ_REMINDER_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      return {};
    }
  }

  // Save quiz reminder timestamps
  private static async saveQuizReminderData(data: { [quizId: string]: number }): Promise<void> {
    try {
      await AsyncStorage.setItem(QUIZ_REMINDER_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving quiz reminder data:', error);
    }
  }

  // Schedule a notification for a specific homework deadline
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

  // Schedule a notification for a specific quiz deadline
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

  // Check all homeworks, quizzes, and courses for new items and deadlines
  static async checkAll(homeworks: Homework[], quizzes: Quiz[], courses: Course[]) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.log('Notification permissions not granted');
      return;
    }

    // Check for new items (will notify user of newly added content)
    const newHomeworks = await this.checkNewHomeworks(homeworks);
    const newQuizzes = await this.checkNewQuizzes(quizzes);
    const newCourses = await this.checkNewCourses(courses);

    // Check quiz reminders (5 hours before, every 30 minutes)
    await this.checkQuizReminders(quizzes);

    console.log('[Notifications] Check complete:', {
      newHomeworks,
      newQuizzes,
      newCourses,
      totalHomeworks: homeworks.length,
      totalQuizzes: quizzes.length,
      totalCourses: courses.length,
    });
  }

  // Start periodic checking
  static startPeriodicCheck(
    fetchHomeworks: () => Promise<Homework[]>,
    fetchQuizzes: () => Promise<Quiz[]>,
    fetchCourses: () => Promise<Course[]>,
    intervalSeconds: number = 30 // Check every 30 seconds for new content
  ) {
    // Clear any existing interval
    this.stopPeriodicCheck();

    // Initial check
    this.performCheck(fetchHomeworks, fetchQuizzes, fetchCourses);

    // Set up periodic check for new content
    this.notificationInterval = setInterval(
      () => {
        this.performCheck(fetchHomeworks, fetchQuizzes, fetchCourses);
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
    }
    if (this.reminderInterval) {
      clearInterval(this.reminderInterval);
      this.reminderInterval = null;
    }
    console.log('[Notifications] Stopped periodic check');
  }

  // Perform a single check
  private static async performCheck(
    fetchHomeworks: () => Promise<Homework[]>,
    fetchQuizzes: () => Promise<Quiz[]>,
    fetchCourses: () => Promise<Course[]>
  ) {
    try {
      const [homeworks, quizzes, courses] = await Promise.all([
        fetchHomeworks(),
        fetchQuizzes(),
        fetchCourses(),
      ]);

      await this.checkAll(homeworks, quizzes, courses);
    } catch (error) {
      console.error('[Notifications] Error checking:', error);
    }
  }

  // Clear all notification tracking (for logout)
  static async clearNotificationData() {
    try {
      await AsyncStorage.multiRemove([
        NOTIFIED_QUIZZES_KEY,
        NOTIFIED_HOMEWORKS_KEY,
        NOTIFIED_COURSES_KEY,
        QUIZ_REMINDER_KEY,
      ]);
      console.log('[Notifications] Cleared all notification data');
    } catch (error) {
      console.error('Error clearing notification data:', error);
    }
  }
}
