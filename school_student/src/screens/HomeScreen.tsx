import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { scheduleAPI, ClassSchedule, homeworkAPI, quizResultAPI } from '../services/api';
import ScheduleView from '../components/ScheduleView';
import WeekSchedule from '../components/WeekSchedule';
import { useFocusEffect } from '@react-navigation/native';
import { PieChart, LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

interface HomeScreenProps {
  navigation: any;
}

interface StatisticsData {
  quizzes: {
    total: number;
    completed: number;
    averageScore: number;
    scores: number[];
  };
  homeworks: {
    total: number;
    graded: number;
    averageGrade: number;
    grades: number[];
  };
  performance: {
    labels: string[];
    scores: number[];
  };
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { student } = useAuth();
  const [classes, setClasses] = useState<ClassSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [currentDay, setCurrentDay] = useState('');
  const [stats, setStats] = useState<StatisticsData>({
    quizzes: {
      total: 0,
      completed: 0,
      averageScore: 0,
      scores: [],
    },
    homeworks: {
      total: 0,
      graded: 0,
      averageGrade: 0,
      grades: [],
    },
    performance: {
      labels: [],
      scores: [],
    },
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

      // Fetch quiz results
      const quizResponse = await quizResultAPI.getByStudent(student.uid);
      const quizResults = quizResponse.success ? quizResponse.data : [];

      // Fetch homework submissions
      const homeworkResponse = await homeworkAPI.getMySubmissions(student.uid);
      const homeworkSubmissions = homeworkResponse.success ? homeworkResponse.data : [];

      // Calculate quiz statistics
      const quizScores = quizResults.map((result: any) => result.percentage);
      const averageQuizScore = quizScores.length > 0
        ? quizScores.reduce((sum: number, score: number) => sum + score, 0) / quizScores.length
        : 0;

      // Calculate homework statistics
      const gradedHomeworks = homeworkSubmissions.filter((hw: any) => hw.grade !== null && hw.grade !== undefined);
      const homeworkGrades = gradedHomeworks.map((hw: any) => hw.grade);
      const averageHomeworkGrade = homeworkGrades.length > 0
        ? homeworkGrades.reduce((sum: number, grade: number) => sum + grade, 0) / homeworkGrades.length
        : 0;

      // Prepare performance timeline (last 10 assessments)
      const allAssessments = [
        ...quizResults.map((q: any) => ({
          date: new Date(q.submittedAt?.toDate ? q.submittedAt.toDate() : q.submittedAt),
          score: q.percentage,
        })),
        ...gradedHomeworks.map((h: any) => ({
          date: new Date(h.submittedAt?.toDate ? h.submittedAt.toDate() : h.submittedAt),
          score: h.grade,
        }))
      ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10).reverse();

      const performanceLabels = allAssessments.map((a, idx) => `${idx + 1}`);
      const performanceScores = allAssessments.map(a => a.score);

      setStats({
        quizzes: {
          total: quizResults.length,
          completed: quizResults.length,
          averageScore: averageQuizScore,
          scores: quizScores,
        },
        homeworks: {
          total: homeworkSubmissions.length,
          graded: gradedHomeworks.length,
          averageGrade: averageHomeworkGrade,
          grades: homeworkGrades,
        },
        performance: {
          labels: performanceLabels,
          scores: performanceScores,
        },
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

  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
  };

  const quizPieData = [
    {
      name: `${stats.quizzes.completed} Completed`,
      population: stats.quizzes.completed,
      color: '#10b981',
      legendFontColor: '#374151',
      legendFontSize: 11,
    },
  ].filter(item => item.population > 0);

  const homeworkPieData = [
    {
      name: `${stats.homeworks.graded} Graded`,
      population: stats.homeworks.graded,
      color: '#10b981',
      legendFontColor: '#374151',
      legendFontSize: 11,
    },
    {
      name: `${stats.homeworks.total - stats.homeworks.graded} Pending`,
      population: stats.homeworks.total - stats.homeworks.graded,
      color: '#f59e0b',
      legendFontColor: '#374151',
      legendFontSize: 11,
    },
  ].filter(item => item.population > 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.studentName}>{student?.fullName}</Text>
        </View>
        <View style={styles.gradeBadge}>
          <Text style={styles.gradeText}>
            {student?.currentGrade.grade}-{student?.currentGrade.section}
          </Text>
        </View>
      </View>

      {/* Statistics Section - Top Half */}
      <View style={styles.statsSection}>
        <View style={styles.sectionTitleContainer}>
          <Ionicons name="stats-chart" size={20} color="#1f2937" />
          <Text style={styles.sectionTitle}>Performance Overview</Text>
        </View>
        
        {statsLoading ? (
          <View style={styles.miniLoadingContainer}>
            <ActivityIndicator size="small" color="#6366f1" />
          </View>
        ) : (
          <>
            {/* Summary Cards */}
            <View style={styles.summaryCards}>
              <View style={[styles.summaryCard, styles.quizCard]}>
                <Ionicons name="document-text" size={28} color="#6366f1" />
                <Text style={styles.cardValue}>{stats.quizzes.completed}</Text>
                <Text style={styles.cardLabel}>Quizzes</Text>
                <Text style={styles.cardAvg}>Avg: {stats.quizzes.averageScore.toFixed(0)}%</Text>
              </View>

              <View style={[styles.summaryCard, styles.homeworkCard]}>
                <Ionicons name="checkmark-done-circle" size={28} color="#10b981" />
                <Text style={styles.cardValue}>{stats.homeworks.graded}</Text>
                <Text style={styles.cardLabel}>Graded</Text>
                <Text style={styles.cardAvg}>Avg: {stats.homeworks.averageGrade.toFixed(0)}%</Text>
              </View>
            </View>

            {/* Performance Chart */}
            {stats.performance.scores.length > 0 && (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Recent Performance</Text>
                <LineChart
                  data={{
                    labels: stats.performance.labels,
                    datasets: [{ data: stats.performance.scores }],
                  }}
                  width={screenWidth - 68}
                  height={160}
                  yAxisSuffix="%"
                  chartConfig={{
                    backgroundGradientFrom: '#fff',
                    backgroundGradientTo: '#fff',
                    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                    strokeWidth: 2,
                    decimalPlaces: 0,
                  }}
                  bezier
                  style={styles.chart}
                />
              </View>
            )}
          </>
        )}
      </View>

      {/* Schedule Section with Day/Week Toggle */}
      <View style={styles.scheduleSection}>
        <Text style={styles.sectionTitle}>My Schedule</Text>

        {/* View Mode Toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'day' && styles.toggleButtonActive]}
            onPress={() => setViewMode('day')}
          >
            <Text style={[styles.toggleText, viewMode === 'day' && styles.toggleTextActive]}>
              Day
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'week' && styles.toggleButtonActive]}
            onPress={() => setViewMode('week')}
          >
            <Text style={[styles.toggleText, viewMode === 'week' && styles.toggleTextActive]}>
              Week
            </Text>
          </TouchableOpacity>
        </View>

        {/* Day Navigator (only for day view) */}
        {viewMode === 'day' && (
          <View style={styles.dayNavigator}>
            <TouchableOpacity style={styles.navButton} onPress={getPreviousDay}>
              <Text style={styles.navButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.currentDayText}>{currentDay}</Text>
            <TouchableOpacity style={styles.navButton} onPress={getNextDay}>
              <Text style={styles.navButtonText}>→</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Schedule Content */}
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

      {/* Statistics Section - Bottom Half */}
      {!statsLoading && (
        <View style={styles.bottomStatsSection}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="trending-up" size={20} color="#1f2937" />
            <Text style={styles.sectionTitle}>Detailed Insights</Text>
          </View>

          {/* Overall Performance Card */}
          <View style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <Ionicons name="trophy" size={24} color="#6366f1" />
              <Text style={styles.insightLabel}>Overall Performance</Text>
            </View>
            <Text style={styles.insightValue}>
              {((stats.quizzes.averageScore + stats.homeworks.averageGrade) / 2).toFixed(1)}%
            </Text>
            <Text style={styles.insightDescription}>
              {((stats.quizzes.averageScore + stats.homeworks.averageGrade) / 2) >= 80
                ? 'Excellent! Keep up the great work!'
                : ((stats.quizzes.averageScore + stats.homeworks.averageGrade) / 2) >= 60
                ? 'Good progress! Keep improving!'
                : 'Need more focus. You can do it!'}
            </Text>
          </View>

          {/* Distribution Charts */}
          {(quizPieData.length > 0 || homeworkPieData.length > 0) && (
            <View style={styles.distributionCards}>
              {quizPieData.length > 0 && (
                <View style={styles.pieChartCard}>
                  <Text style={styles.pieChartTitle}>Quiz Status</Text>
                  <View style={styles.pieChartWrapper}>
                    <PieChart
                      data={[{ name: '', population: stats.quizzes.completed, color: '#10b981', legendFontColor: '#fff', legendFontSize: 0 }]}
                      width={screenWidth / 2 - 24}
                      height={110}
                      chartConfig={{
                        color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                      }}
                      accessor="population"
                      backgroundColor="transparent"
                      paddingLeft={`${(screenWidth / 2 - 24) / 4}`}
                      absolute
                      hasLegend={false}
                    />
                  </View>
                  <View style={styles.legendContainer}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                      <Text style={styles.legendText}>{stats.quizzes.completed} Completed</Text>
                    </View>
                  </View>
                </View>
              )}

              {homeworkPieData.length > 0 && (
                <View style={styles.pieChartCard}>
                  <Text style={styles.pieChartTitle}>Homework Status</Text>
                  <View style={styles.pieChartWrapper}>
                    <PieChart
                      data={[
                        { name: '', population: stats.homeworks.graded, color: '#10b981', legendFontColor: '#fff', legendFontSize: 0 },
                        { name: '', population: stats.homeworks.total - stats.homeworks.graded, color: '#f59e0b', legendFontColor: '#fff', legendFontSize: 0 }
                      ].filter(item => item.population > 0)}
                      width={screenWidth / 2 - 24}
                      height={110}
                      chartConfig={{
                        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                      }}
                      accessor="population"
                      backgroundColor="transparent"
                      paddingLeft={`${(screenWidth / 2 - 24) / 4}`}
                      absolute
                      hasLegend={false}
                    />
                  </View>
                  <View style={styles.legendContainer}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                      <Text style={styles.legendText}>{stats.homeworks.graded} Graded</Text>
                    </View>
                    {(stats.homeworks.total - stats.homeworks.graded) > 0 && (
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
                        <Text style={styles.legendText}>{stats.homeworks.total - stats.homeworks.graded} Pending</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#6366f1',
  },
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
    backgroundColor: '#6366f1',
  },
  greeting: {
    fontSize: 14,
    color: '#e0e7ff',
  },
  studentName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  gradeBadge: {
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  gradeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
  },
  statsSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  miniLoadingContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  summaryCards: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quizCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
  },
  homeworkCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  cardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  cardLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  cardAvg: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366f1',
    marginTop: 8,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  chart: {
    borderRadius: 8,
  },
  scheduleSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    minHeight: 300,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 8,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
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
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: 18,
    color: '#6366f1',
    fontWeight: '600',
  },
  currentDayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  bottomStatsSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  insightCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  insightValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  distributionCards: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  pieChartCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    paddingTop: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    minHeight: 200,
    overflow: 'visible',
  },
  pieChartTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  pieChartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    overflow: 'visible',
  },
  legendContainer: {
    marginTop: 12,
    alignItems: 'flex-start',
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
  },
});

export default HomeScreen;
