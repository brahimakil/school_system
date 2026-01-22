import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { scheduleAPI, ClassSchedule, homeworkAPI, quizResultAPI } from '../services/api';
import ScheduleView from '../components/ScheduleView';
import WeekSchedule from '../components/WeekSchedule';
import { useFocusEffect } from '@react-navigation/native';

const screenWidth = Dimensions.get('window').width;

interface HomeScreenProps {
  navigation: any;
}

interface StatisticsData {
  quizzes: {
    total: number;
    completed: number;
    averageScore: number;
  };
  homeworks: {
    total: number;
    graded: number;
    averageGrade: number;
    pending: number;
  };
  overallGrade: number;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { student } = useAuth();
  const [classes, setClasses] = useState<ClassSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [currentDay, setCurrentDay] = useState('');
  const [stats, setStats] = useState<StatisticsData>({
    quizzes: {
      total: 0,
      completed: 0,
      averageScore: 0,
    },
    homeworks: {
      total: 0,
      graded: 0,
      averageGrade: 0,
      pending: 0,
    },
    overallGrade: 0,
  });

  useEffect(() => {
    // Get current day
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    setCurrentDay(today);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (student) {
        fetchClasses();
        fetchStatistics();
      }
    }, [student])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchClasses(), fetchStatistics()]);
    setRefreshing(false);
  };

  const fetchClasses = async () => {
    if (!student) return;

    try {
      setLoading(true);
      const response = await scheduleAPI.getMyClasses(
        student.currentGrade.grade,
        student.currentGrade.section
      );
      if (response.success) {
        setClasses(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    if (!student) return;

    try {
      setStatsLoading(true);

      const quizResponse = await quizResultAPI.getByStudent(student.uid);
      const quizResults = quizResponse.success ? quizResponse.data : [];

      const homeworkResponse = await homeworkAPI.getMySubmissions(student.uid);
      const homeworkSubmissions = homeworkResponse.success ? homeworkResponse.data : [];

      const quizScores = quizResults.map((result: any) => result.percentage);
      const averageQuizScore = quizScores.length > 0
        ? quizScores.reduce((sum: number, score: number) => sum + score, 0) / quizScores.length
        : 0;

      const gradedHomeworks = homeworkSubmissions.filter((hw: any) => hw.grade !== null && hw.grade !== undefined);
      const pendingHomeworks = homeworkSubmissions.filter((hw: any) => hw.grade === null || hw.grade === undefined);
      const homeworkGrades = gradedHomeworks.map((hw: any) => hw.grade);
      const averageHomeworkGrade = homeworkGrades.length > 0
        ? homeworkGrades.reduce((sum: number, grade: number) => sum + grade, 0) / homeworkGrades.length
        : 0;

      // Calculate overall grade (weighted average)
      const overallGrade = quizScores.length > 0 || homeworkGrades.length > 0
        ? ((averageQuizScore * quizScores.length) + (averageHomeworkGrade * homeworkGrades.length)) / (quizScores.length + homeworkGrades.length)
        : 0;

      setStats({
        quizzes: {
          total: quizResults.length,
          completed: quizResults.length,
          averageScore: averageQuizScore,
        },
        homeworks: {
          total: homeworkSubmissions.length,
          graded: gradedHomeworks.length,
          averageGrade: averageHomeworkGrade,
          pending: pendingHomeworks.length,
        },
        overallGrade,
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const getNextDay = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const currentIndex = days.indexOf(currentDay);
    const nextIndex = (currentIndex + 1) % days.length;
    setCurrentDay(days[nextIndex]);
  };

  const getPreviousDay = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const currentIndex = days.indexOf(currentDay);
    const prevIndex = (currentIndex - 1 + days.length) % days.length;
    setCurrentDay(days[prevIndex]);
  };

  const handleClassPress = (classItem: ClassSchedule) => {
    navigation.navigate('Classes', { selectedClassId: classItem.id });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return '#10b981';
    if (grade >= 80) return '#22c55e';
    if (grade >= 70) return '#eab308';
    if (grade >= 60) return '#f97316';
    return '#ef4444';
  };

  const getGradeLetter = (grade: number) => {
    if (grade >= 90) return 'A';
    if (grade >= 80) return 'B';
    if (grade >= 70) return 'C';
    if (grade >= 60) return 'D';
    return 'F';
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header with Gradient */}
      <View style={styles.headerGradient}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.studentName}>{student?.fullName?.split(' ')[0]}</Text>
              <View style={styles.gradeBadge}>
                <Text style={styles.gradeText}>
                  Grade {student?.currentGrade.grade} • Section {student?.currentGrade.section}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {student?.fullName?.charAt(0).toUpperCase()}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366f1']} />
        }
      >
        {/* Quick Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Academic Overview</Text>
          
          {statsLoading ? (
            <View style={styles.miniLoadingContainer}>
              <ActivityIndicator size="small" color="#6366f1" />
            </View>
          ) : (
            <>
              {/* Overall Grade Card */}
              <View style={styles.overallGradeCard}>
                <View style={styles.overallLeft}>
                  <Text style={styles.overallLabel}>Overall Performance</Text>
                  <Text style={styles.overallSubtext}>Based on all assessments</Text>
                </View>
                <View style={[styles.gradeCircle, { backgroundColor: getGradeColor(stats.overallGrade) + '20' }]}>
                  <Text style={[styles.gradeLetter, { color: getGradeColor(stats.overallGrade) }]}>
                    {getGradeLetter(stats.overallGrade)}
                  </Text>
                  <Text style={[styles.gradePercentSmall, { color: getGradeColor(stats.overallGrade) }]}>
                    {stats.overallGrade.toFixed(0)}%
                  </Text>
                </View>
              </View>

              {/* Stats Grid */}
              <View style={styles.statsGrid}>
                <TouchableOpacity 
                  style={styles.statCard}
                  onPress={() => navigation.navigate('Quizzes')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statIconContainer, { backgroundColor: '#eef2ff' }]}>
                    <Ionicons name="document-text" size={22} color="#6366f1" />
                  </View>
                  <Text style={styles.statValue}>{stats.quizzes.completed}</Text>
                  <Text style={styles.statLabel}>Quizzes Taken</Text>
                  <View style={styles.statBadge}>
                    <Text style={styles.statBadgeText}>
                      {stats.quizzes.averageScore.toFixed(0)}% avg
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.statCard}
                  onPress={() => navigation.navigate('Tasks')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statIconContainer, { backgroundColor: '#ecfdf5' }]}>
                    <Ionicons name="checkmark-done" size={22} color="#10b981" />
                  </View>
                  <Text style={styles.statValue}>{stats.homeworks.graded}</Text>
                  <Text style={styles.statLabel}>Tasks Graded</Text>
                  <View style={[styles.statBadge, { backgroundColor: '#ecfdf5' }]}>
                    <Text style={[styles.statBadgeText, { color: '#10b981' }]}>
                      {stats.homeworks.averageGrade.toFixed(0)}% avg
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.statCard}
                  onPress={() => navigation.navigate('Tasks')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statIconContainer, { backgroundColor: '#fef3c7' }]}>
                    <Ionicons name="time" size={22} color="#f59e0b" />
                  </View>
                  <Text style={styles.statValue}>{stats.homeworks.pending}</Text>
                  <Text style={styles.statLabel}>Pending</Text>
                  <View style={[styles.statBadge, { backgroundColor: '#fef3c7' }]}>
                    <Text style={[styles.statBadgeText, { color: '#f59e0b' }]}>
                      Review
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.statCard}
                  onPress={() => navigation.navigate('Classes')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statIconContainer, { backgroundColor: '#fce7f3' }]}>
                    <Ionicons name="book" size={22} color="#ec4899" />
                  </View>
                  <Text style={styles.statValue}>{classes.length}</Text>
                  <Text style={styles.statLabel}>Subjects</Text>
                  <View style={[styles.statBadge, { backgroundColor: '#fce7f3' }]}>
                    <Text style={[styles.statBadgeText, { color: '#ec4899' }]}>
                      Active
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActionsScroll}
          >
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => navigation.navigate('Chat', { screen: 'AIChat' })}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#6366f1' }]}>
                <Ionicons name="sparkles" size={24} color="#fff" />
              </View>
              <Text style={styles.quickActionText}>AI Tutor</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => navigation.navigate('Chat')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#10b981' }]}>
                <Ionicons name="chatbubbles" size={24} color="#fff" />
              </View>
              <Text style={styles.quickActionText}>Messages</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => navigation.navigate('Courses')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#f59e0b' }]}>
                <Ionicons name="play-circle" size={24} color="#fff" />
              </View>
              <Text style={styles.quickActionText}>Courses</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => navigation.navigate('Quizzes')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#ec4899' }]}>
                <Ionicons name="help-circle" size={24} color="#fff" />
              </View>
              <Text style={styles.quickActionText}>Quizzes</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Schedule Section */}
        <View style={styles.scheduleSection}>
          <View style={styles.scheduleTitleRow}>
            <Text style={styles.sectionTitle}>My Schedule</Text>
            <View style={styles.viewToggle}>
              <TouchableOpacity
                style={[styles.toggleButton, viewMode === 'day' && styles.toggleButtonActive]}
                onPress={() => setViewMode('day')}
              >
                <Text style={[styles.toggleText, viewMode === 'day' && styles.toggleTextActive]}>Day</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, viewMode === 'week' && styles.toggleButtonActive]}
                onPress={() => setViewMode('week')}
              >
                <Text style={[styles.toggleText, viewMode === 'week' && styles.toggleTextActive]}>Week</Text>
              </TouchableOpacity>
            </View>
          </View>

          {viewMode === 'day' && (
            <View style={styles.dayNavigator}>
              <TouchableOpacity style={styles.navButton} onPress={getPreviousDay}>
                <Ionicons name="chevron-back" size={20} color="#6366f1" />
              </TouchableOpacity>
              <View style={styles.dayInfo}>
                <Text style={styles.currentDayText}>{currentDay}</Text>
                {currentDay === ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()] && (
                  <View style={styles.todayIndicator}>
                    <Text style={styles.todayIndicatorText}>Today</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity style={styles.navButton} onPress={getNextDay}>
                <Ionicons name="chevron-forward" size={20} color="#6366f1" />
              </TouchableOpacity>
            </View>
          )}

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366f1" />
              <Text style={styles.loadingText}>Loading schedule...</Text>
            </View>
          ) : (
            <>
              {viewMode === 'day' && <ScheduleView classes={classes} currentDay={currentDay} onClassPress={handleClassPress} />}
              {viewMode === 'week' && <WeekSchedule classes={classes} onClassPress={handleClassPress} />}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#4f46e5',
  },
  headerGradient: {
    paddingTop: 8,
    paddingBottom: 24,
    backgroundColor: '#6366f1',
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {},
  greeting: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 2,
  },
  studentName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  gradeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  gradeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  profileButton: {
    padding: 4,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  statsSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  miniLoadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  overallGradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  overallLeft: {},
  overallLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  overallSubtext: {
    fontSize: 13,
    color: '#6b7280',
  },
  gradeCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeLetter: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  gradePercentSmall: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: -2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: (screenWidth - 52) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  statBadge: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366f1',
  },
  quickActionsSection: {
    paddingTop: 28,
    paddingLeft: 20,
  },
  quickActionsScroll: {
    paddingRight: 20,
    gap: 16,
  },
  quickAction: {
    alignItems: 'center',
    width: 72,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  scheduleSection: {
    paddingHorizontal: 20,
    paddingTop: 28,
    minHeight: 300,
  },
  scheduleTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    padding: 3,
  },
  toggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  toggleTextActive: {
    color: '#1f2937',
    fontWeight: '600',
  },
  dayNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  currentDayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  todayIndicator: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  todayIndicatorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16a34a',
  },
  loadingContainer: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
});

export default HomeScreen;
