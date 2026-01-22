import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { coursesAPI, Course, scheduleAPI, ClassSchedule } from '../services/api';
import { useFocusEffect } from '@react-navigation/native';

interface CoursesScreenProps {
  navigation: any;
}

const CoursesScreen: React.FC<CoursesScreenProps> = ({ navigation }) => {
  const { student } = useAuth();
  const [classes, setClasses] = useState<ClassSchedule[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<ClassSchedule | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      if (student) {
        fetchData();
      }
    }, [student])
  );

  const fetchData = async () => {
    if (!student) return;

    try {
      setLoading(true);
      const [classesResponse, coursesResponse] = await Promise.all([
        scheduleAPI.getMyClasses(
          student.currentGrade.grade,
          student.currentGrade.section
        ),
        coursesAPI.getMyCourses(
          student.currentGrade.grade,
          student.currentGrade.section
        ),
      ]);
      
      if (classesResponse.success) {
        // Deduplicate classes by className (same class can appear on multiple days with different IDs)
        const uniqueClasses = classesResponse.data.reduce((acc: ClassSchedule[], current) => {
          const exists = acc.find(item => item.className === current.className);
          if (!exists) {
            acc.push(current);
          }
          return acc;
        }, []);
        setClasses(uniqueClasses);
      }
      if (coursesResponse.success) {
        // Show all courses including completed ones
        setCourses(coursesResponse.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCoursesForClass = (className: string) => {
    return courses.filter(course => course.className === className);
  };

  const handleMarkAsCompleted = async (courseId: string) => {
    Alert.alert(
      'Mark as Completed',
      'Are you sure you want to mark this course as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await coursesAPI.markAsCompleted(courseId);
              fetchData();
              setSelectedCourse(null);
              Alert.alert('Success', 'Course marked as completed!');
            } catch (error) {
              console.error('Failed to mark as completed:', error);
              Alert.alert('Error', 'Failed to mark course as completed');
            }
          },
        },
      ]
    );
  };

  const openAttachment = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open attachment');
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#10b981';
      case 'completed':
        return '#3b82f6';
      case 'overdue':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return 'play-circle';
      case 'completed':
        return 'checkmark-circle';
      case 'overdue':
        return 'alert-circle';
      default:
        return 'ellipse';
    }
  };

  if (selectedCourse) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.detailHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedCourse(null)}
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.detailTitle}>Course Details</Text>
        </View>

        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Title</Text>
            <Text style={styles.detailValue}>{selectedCourse.title}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Subject</Text>
            <Text style={styles.detailValue}>{selectedCourse.subject}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Class</Text>
            <Text style={styles.detailValue}>{selectedCourse.className}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(selectedCourse.status)}20` }]}>
              <Ionicons name={getStatusIcon(selectedCourse.status)} size={16} color={getStatusColor(selectedCourse.status)} />
              <Text style={[styles.statusBadgeText, { color: getStatusColor(selectedCourse.status) }]}>
                {selectedCourse.status.toUpperCase()}
              </Text>
            </View>
          </View>

          {selectedCourse.description && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Description</Text>
              <Text style={styles.detailDescription}>{selectedCourse.description}</Text>
            </View>
          )}

          {selectedCourse.attachmentUrl && (
            <TouchableOpacity
              style={styles.attachmentButton}
              onPress={() => openAttachment(selectedCourse.attachmentUrl!)}
            >
              <Ionicons name="document-attach" size={24} color="#fff" />
              <Text style={styles.attachmentButtonText}>VIEW ATTACHED MEDIA</Text>
            </TouchableOpacity>
          )}

          {selectedCourse.status === 'active' && (
            <TouchableOpacity
              style={styles.completeButton}
              onPress={() => handleMarkAsCompleted(selectedCourse.id)}
            >
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.completeButtonText}>Mark as Completed</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    );
  }

  // Show courses for selected class
  if (selectedClass) {
    const classCourses = getCoursesForClass(selectedClass.className);
    
    return (
      <ScrollView style={styles.container}>
        <View style={styles.detailHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedClass(null)}
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.detailTitle}>{selectedClass.className} Courses</Text>
        </View>

        {classCourses.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="book-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No Courses Yet</Text>
            <Text style={styles.emptyText}>
              No courses assigned for this class yet.
            </Text>
          </View>
        )}

        {classCourses.length > 0 && (
          <>
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{classCourses.filter(c => c.status === 'active').length}</Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{classCourses.filter(c => c.status === 'completed').length}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{classCourses.filter(c => c.status === 'overdue').length}</Text>
                <Text style={styles.statLabel}>Overdue</Text>
              </View>
            </View>

            {classCourses.map((course) => (
              <TouchableOpacity
                key={course.id}
                style={styles.courseCard}
                onPress={() => setSelectedCourse(course)}
              >
                <View style={styles.courseCardHeader}>
                  <View style={[styles.courseIcon, { backgroundColor: `${getStatusColor(course.status)}20` }]}>
                    <Ionicons name={getStatusIcon(course.status)} size={24} color={getStatusColor(course.status)} />
                  </View>
                  <View style={styles.courseInfo}>
                    <Text style={styles.courseName}>{course.title}</Text>
                    <Text style={styles.courseSubject}>{course.subject}</Text>
                  </View>
                </View>

                <View style={styles.courseCardFooter}>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(course.status)}20` }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(course.status) }]}>
                      {course.status.toUpperCase()}
                    </Text>
                  </View>
                  {course.attachmentUrl && (
                    <Ionicons name="document-attach" size={18} color="#6b7280" />
                  )}
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    );
  }

  // Show list of classes
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Courses</Text>
        <Text style={styles.headerSubtitle}>
          Select a class to view courses
        </Text>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading classes...</Text>
        </View>
      )}

      {!loading && classes.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="book-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No Classes Yet</Text>
          <Text style={styles.emptyText}>
            Your classes will appear here once they are set up.
          </Text>
        </View>
      )}

      {!loading && classes.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>My Classes</Text>
          
          {classes.map((classItem) => {
            const classCoursesCount = getCoursesForClass(classItem.className).length;
            const activeCount = getCoursesForClass(classItem.className).filter(c => c.status === 'active').length;
            
            return (
              <TouchableOpacity
                key={classItem.id}
                style={styles.classCard}
                onPress={() => setSelectedClass(classItem)}
              >
                <View style={styles.courseCardHeader}>
                  <View style={styles.classIcon}>
                    <Text style={styles.classIconText}>
                      {classItem.className.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.courseInfo}>
                    <Text style={styles.courseName}>{classItem.className}</Text>
                    <View style={styles.teacherRow}>
                      <Ionicons name="person" size={14} color="#6b7280" />
                      <Text style={styles.teacherName}>
                        {classItem.teacherName || 'Teacher not assigned'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.courseCardFooter}>
                  <View style={styles.coursesCountBadge}>
                    <Ionicons name="school" size={16} color="#f59e0b" />
                    <Text style={styles.coursesCountText}>
                      {classCoursesCount} course{classCoursesCount !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  {activeCount > 0 && (
                    <View style={styles.activeCountBadge}>
                      <Text style={styles.activeCountText}>{activeCount} active</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </View>
              </TouchableOpacity>
            );
          })}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  courseCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  courseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  courseIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  courseInfo: {
    flex: 1,
  },
  courseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  courseSubject: {
    fontSize: 13,
    color: '#6b7280',
  },
  courseCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: 16,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  detailCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  detailRow: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 6,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '600',
  },
  detailDescription: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  attachmentButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  classCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  classIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#ede9fe',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  classIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  teacherName: {
    fontSize: 13,
    color: '#6b7280',
  },
  coursesCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#fef3c7',
    borderRadius: 6,
  },
  coursesCountText: {
    fontSize: 12,
    color: '#d97706',
    fontWeight: '600',
  },
  activeCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#d1fae5',
    borderRadius: 6,
  },
  activeCountText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
});

export default CoursesScreen;
