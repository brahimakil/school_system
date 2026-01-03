import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { homeworkAPI, quizResultAPI } from '../services/api';
import { PieChart, LineChart, BarChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

interface StatisticsData {
  quizzes: {
    total: number;
    completed: number;
    pending: number;
    averageScore: number;
    scores: number[];
  };
  homeworks: {
    total: number;
    submitted: number;
    pending: number;
    graded: number;
    averageGrade: number;
    grades: number[];
  };
  performance: {
    labels: string[];
    scores: number[];
  };
}

const StatisticsScreen: React.FC = () => {
  const { student } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatisticsData>({
    quizzes: {
      total: 0,
      completed: 0,
      pending: 0,
      averageScore: 0,
      scores: [],
    },
    homeworks: {
      total: 0,
      submitted: 0,
      pending: 0,
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
    if (student) {
      fetchStatistics();
    }
  }, [student]);

  const fetchStatistics = async () => {
    if (!student) return;

    try {
      setLoading(true);

      console.log('Fetching statistics for student:', student.uid);

      // Fetch quiz results
      const quizResponse = await quizResultAPI.getByStudent(student.uid);
      console.log('Quiz Response:', quizResponse);
      const quizResults = quizResponse.success ? quizResponse.data : [];
      console.log('Quiz Results:', quizResults);

      // Fetch homework submissions
      const homeworkResponse = await homeworkAPI.getMySubmissions(student.uid);
      console.log('Homework Response:', homeworkResponse);
      const homeworkSubmissions = homeworkResponse.success ? homeworkResponse.data : [];
      console.log('Homework Submissions:', homeworkSubmissions);

      // Calculate quiz statistics
      const quizScores = quizResults.map((result: any) => result.percentage);
      console.log('Quiz Scores:', quizScores);
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
          type: 'Quiz'
        })),
        ...gradedHomeworks.map((h: any) => ({
          date: new Date(h.submittedAt?.toDate ? h.submittedAt.toDate() : h.submittedAt),
          score: h.grade,
          type: 'Homework'
        }))
      ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10).reverse();

      const performanceLabels = allAssessments.map((a, idx) => `${idx + 1}`);
      const performanceScores = allAssessments.map(a => a.score);

      setStats({
        quizzes: {
          total: quizResults.length,
          completed: quizResults.length,
          pending: 0,
          averageScore: averageQuizScore,
          scores: quizScores,
        },
        homeworks: {
          total: homeworkSubmissions.length,
          submitted: homeworkSubmissions.length,
          pending: 0,
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
      setLoading(false);
    }
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading statistics...</Text>
      </View>
    );
  }

  const quizPieData = [
    {
      name: 'Completed',
      population: stats.quizzes.completed,
      color: '#10b981',
      legendFontColor: '#374151',
      legendFontSize: 14,
    },
    {
      name: 'Pending',
      population: stats.quizzes.pending,
      color: '#f59e0b',
      legendFontColor: '#374151',
      legendFontSize: 14,
    },
  ].filter(item => item.population > 0);

  const homeworkPieData = [
    {
      name: 'Graded',
      population: stats.homeworks.graded,
      color: '#10b981',
      legendFontColor: '#374151',
      legendFontSize: 14,
    },
    {
      name: 'Submitted',
      population: stats.homeworks.submitted - stats.homeworks.graded,
      color: '#f59e0b',
      legendFontColor: '#374151',
      legendFontSize: 14,
    },
    {
      name: 'Pending',
      population: stats.homeworks.pending,
      color: '#ef4444',
      legendFontColor: '#374151',
      legendFontSize: 14,
    },
  ].filter(item => item.population > 0);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Statistics</Text>
        <Text style={styles.headerSubtitle}>Academic Performance Overview</Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryCards}>
        <View style={[styles.summaryCard, styles.quizCard]}>
          <Text style={styles.cardIcon}>📝</Text>
          <Text style={styles.cardTitle}>Quizzes</Text>
          <Text style={styles.cardValue}>{stats.quizzes.completed}</Text>
          <Text style={styles.cardLabel}>Completed</Text>
          <View style={styles.cardFooter}>
            <Text style={styles.averageText}>
              Avg: {stats.quizzes.averageScore.toFixed(1)}%
            </Text>
          </View>
        </View>

        <View style={[styles.summaryCard, styles.homeworkCard]}>
          <Text style={styles.cardIcon}>✅</Text>
          <Text style={styles.cardTitle}>Homeworks</Text>
          <Text style={styles.cardValue}>{stats.homeworks.graded}</Text>
          <Text style={styles.cardLabel}>Graded</Text>
          <View style={styles.cardFooter}>
            <Text style={styles.averageText}>
              Avg: {stats.homeworks.averageGrade.toFixed(1)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Quiz Distribution */}
      {quizPieData.length > 0 && (
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Quiz Completion Status</Text>
          <View style={styles.chartContainer}>
            <PieChart
              data={quizPieData}
              width={screenWidth - 40}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        </View>
      )}

      {/* Homework Distribution */}
      {homeworkPieData.length > 0 && (
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Homework Status Distribution</Text>
          <View style={styles.chartContainer}>
            <PieChart
              data={homeworkPieData}
              width={screenWidth - 40}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        </View>
      )}

      {/* Performance Timeline */}
      {stats.performance.scores.length > 0 && (
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Performance Timeline (Last 10 Assessments)</Text>
          <Text style={styles.chartSubtitle}>Track your progress over time</Text>
          <View style={styles.chartContainer}>
            <LineChart
              data={{
                labels: stats.performance.labels,
                datasets: [
                  {
                    data: stats.performance.scores,
                  },
                ],
              }}
              width={screenWidth - 40}
              height={220}
              yAxisSuffix="%"
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
              }}
              bezier
              style={styles.chart}
            />
          </View>
        </View>
      )}

      {/* Score Distribution Bar Chart */}
      {stats.quizzes.scores.length > 0 && (
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Quiz Score Distribution</Text>
          <Text style={styles.chartSubtitle}>Your recent quiz performances</Text>
          <View style={styles.chartContainer}>
            <BarChart
              data={{
                labels: stats.quizzes.scores.slice(-8).map((_, idx) => `Q${idx + 1}`),
                datasets: [
                  {
                    data: stats.quizzes.scores.slice(-8),
                  },
                ],
              }}
              width={screenWidth - 40}
              height={220}
              yAxisSuffix="%"
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
              }}
              style={styles.chart}
            />
          </View>
        </View>
      )}

      {/* Performance Insights */}
      <View style={styles.insightsSection}>
        <Text style={styles.insightsTitle}>📊 Performance Insights</Text>
        
        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Text style={styles.insightIcon}>🎯</Text>
            <Text style={styles.insightLabel}>Overall Performance</Text>
          </View>
          <Text style={styles.insightValue}>
            {((stats.quizzes.averageScore + stats.homeworks.averageGrade) / 2).toFixed(1)}%
          </Text>
          <Text style={styles.insightDescription}>
            {((stats.quizzes.averageScore + stats.homeworks.averageGrade) / 2) >= 80
              ? 'Excellent! Keep up the great work! 🌟'
              : ((stats.quizzes.averageScore + stats.homeworks.averageGrade) / 2) >= 60
              ? 'Good progress! Keep improving! 💪'
              : 'Need more focus. You can do it! 📚'}
          </Text>
        </View>

        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Text style={styles.insightIcon}>📈</Text>
            <Text style={styles.insightLabel}>Total Assessments</Text>
          </View>
          <Text style={styles.insightValue}>
            {stats.quizzes.completed + stats.homeworks.submitted}
          </Text>
          <Text style={styles.insightDescription}>
            Quizzes: {stats.quizzes.completed} | Homeworks: {stats.homeworks.submitted}
          </Text>
        </View>

        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Text style={styles.insightIcon}>⭐</Text>
            <Text style={styles.insightLabel}>Best Performance</Text>
          </View>
          <Text style={styles.insightValue}>
            {Math.max(...stats.quizzes.scores, ...stats.homeworks.grades, 0).toFixed(1)}%
          </Text>
          <Text style={styles.insightDescription}>
            Your highest score achieved
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Keep learning and improving! 🚀</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    padding: 20,
    backgroundColor: '#6366f1',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0e7ff',
  },
  summaryCards: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  quizCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  homeworkCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  cardLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  cardFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    width: '100%',
    alignItems: 'center',
  },
  averageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  chartSection: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  chart: {
    borderRadius: 16,
  },
  insightsSection: {
    padding: 20,
    paddingTop: 0,
  },
  insightsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
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
  insightIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  insightLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  insightValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  footer: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: '#6b7280',
    fontStyle: 'italic',
  },
});

export default StatisticsScreen;
