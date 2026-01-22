import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { scheduleAPI, ClassSchedule, quizAPI, Quiz, homeworkAPI, Homework, HomeworkStatus, coursesAPI, Course } from '../services/api';
import { useFocusEffect } from '@react-navigation/native';

interface ClassesScreenProps {
  navigation: any;
  route?: {
    params?: {
      selectedClassId?: string;
    };
  };
}

const ClassesScreen: React.FC<ClassesScreenProps> = ({ navigation, route }) => {
  const { student } = useAuth();
  const [classes, setClasses] = useState<ClassSchedule[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<ClassSchedule | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      if (student) {
        fetchData();
      }
    }, [student])
  );

  useFocusEffect(
    React.useCallback(() => {
      if (route?.params?.selectedClassId && classes.length > 0) {
        const classToSelect = classes.find(c => c.id === route.params?.selectedClassId);
        if (classToSelect) {
          setSelectedClass(classToSelect);
          // Clear the param after using it
          navigation.setParams({ selectedClassId: undefined });
        }
      }
    }, [route?.params?.selectedClassId, classes])
  );

  const fetchData = async () => {
    if (!student) return;

    try {
      setLoading(true);
      const [classesResponse, quizzesResponse, homeworksResponse, coursesResponse] = await Promise.all([
        scheduleAPI.getMyClasses(
          student.currentGrade.grade,
          student.currentGrade.section
        ),
        quizAPI.getMyQuizzes(
          student.currentGrade.grade,
          student.currentGrade.section
        ),
        homeworkAPI.getMyHomework(
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
      if (quizzesResponse.success) {
        setQuizzes(quizzesResponse.data);
      }
      if (homeworksResponse.success) {
        setHomeworks(homeworksResponse.data);
      }
      if (coursesResponse.success) {
        // Include all courses except completed ones
        const filteredCourses = coursesResponse.data.filter(c => c.status !== 'completed');
        setCourses(filteredCourses);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQuizCountForClass = (className: string) => {
    const now = new Date();
    return quizzes.filter(quiz => {
      if (quiz.className !== className) return false;
      // Show quizzes that are available OR pending but start time has passed
      if (quiz.status === 'available') return true;
      if (quiz.status === 'pending') {
        const startDateTime = new Date(quiz.startDateTime);
        const endDateTime = new Date(quiz.endDateTime);
        return startDateTime <= now && endDateTime > now;
      }
      return false;
    }).length;
  };

  const getHomeworkCountForClass = (className: string) => {
    return homeworks.filter(homework => 
      homework.className === className && 
      (homework.status === HomeworkStatus.ACTIVE || homework.status === HomeworkStatus.PENDING)
    ).length;
  };

  const getCoursesCountForClass = (className: string) => {
    return courses.filter(course => 
      course.className === className && 
      (course.status === 'active' || course.status === 'overdue' || course.status === 'pending')
    ).length;
  };

  const getNextClassTime = (classItem: ClassSchedule) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date().getDay();
    const classDayIndex = days.indexOf(classItem.dayOfWeek);
    
    if (classDayIndex === -1) return 'No upcoming session';
    
    const daysUntil = (classDayIndex - today + 7) % 7;
    
    if (daysUntil === 0) {
      return `Today at ${classItem.startTime}`;
    } else if (daysUntil === 1) {
      return `Tomorrow at ${classItem.startTime}`;
    } else {
      return `${classItem.dayOfWeek} at ${classItem.startTime}`;
    }
  };

  const groupClassesByDay = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const grouped: { [key: string]: ClassSchedule[] } = {};
    
    for (const day of days) {
      grouped[day] = classes.filter(c => c.dayOfWeek === day)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    
    return grouped;
  };

  if (selectedClass) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.detailsHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setSelectedClass(null)}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.detailsTitle}>{selectedClass.className}</Text>
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.detailsSection}>
            <Text style={styles.detailsLabel}>Teacher</Text>
            <View style={styles.detailsRow}>
              <Ionicons name="person" size={18} color="#6366f1" />
              <Text style={styles.detailsValue}>
                {selectedClass.teacherName || 'Not assigned'}
              </Text>
            </View>
          </View>

          <View style={styles.detailsSection}>
            <Text style={styles.detailsLabel}>Schedule</Text>
            <View style={styles.detailsRow}>
              <Ionicons name="calendar" size={18} color="#6366f1" />
              <Text style={styles.detailsValue}>
                {selectedClass.dayOfWeek}
              </Text>
            </View>
            <View style={styles.detailsRow}>
              <Ionicons name="time" size={18} color="#6366f1" />
              <Text style={styles.detailsValue}>
                {selectedClass.startTime} - {selectedClass.endTime}
              </Text>
            </View>
          </View>

          <View style={styles.detailsSection}>
            <Text style={styles.detailsLabel}>Next Session</Text>
            <Text style={styles.nextSessionText}>
              {getNextClassTime(selectedClass)}
            </Text>
          </View>
        </View>

        <View style={styles.resourcesSection}>
          <Text style={styles.resourcesTitle}>Class Resources</Text>
          
          <TouchableOpacity 
            style={styles.resourceCard}
            onPress={() => {
              setSelectedClass(null);
              navigation.navigate('Quizzes');
            }}
          >
            <View style={styles.resourceIcon}>
              <Ionicons name="document-text" size={24} color="#6366f1" />
            </View>
            <View style={styles.resourceInfo}>
              <Text style={styles.resourceName}>Quizzes</Text>
              <Text style={styles.resourceCount}>{getQuizCountForClass(selectedClass.className)} active</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.resourceCard}
            onPress={() => {
              setSelectedClass(null);
              navigation.navigate('Tasks');
            }}
          >
            <View style={styles.resourceIcon}>
              <Ionicons name="checkmark-done" size={24} color="#10b981" />
            </View>
            <View style={styles.resourceInfo}>
              <Text style={styles.resourceName}>Tasks</Text>
              <Text style={styles.resourceCount}>{getHomeworkCountForClass(selectedClass.className)} active</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.resourceCard}
            onPress={() => {
              setSelectedClass(null);
              navigation.navigate('Courses');
            }}
          >
            <View style={styles.resourceIcon}>
              <Ionicons name="school" size={24} color="#f59e0b" />
            </View>
            <View style={styles.resourceInfo}>
              <Text style={styles.resourceName}>Courses</Text>
              <Text style={styles.resourceCount}>{getCoursesCountForClass(selectedClass.className)} active</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Classes</Text>
        <Text style={styles.headerSubtitle}>
          {student?.currentGrade.grade} - Section {student?.currentGrade.section}
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
            Your class schedule will appear here once your teachers set up the classes.
          </Text>
        </View>
      )}
      
      {!loading && classes.length > 0 && (
        <>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{classes.length}</Text>
              <Text style={styles.statLabel}>Total Classes</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {new Set(classes.map(c => c.teacherId)).size}
              </Text>
              <Text style={styles.statLabel}>Teachers</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>All Classes</Text>
          
          {classes.map((classItem) => (
            <TouchableOpacity
              key={classItem.id}
              style={styles.classCard}
              onPress={() => setSelectedClass(classItem)}
            >
              <View style={styles.classCardHeader}>
                <View style={styles.classIcon}>
                  <Text style={styles.classIconText}>
                    {classItem.className.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.classInfo}>
                  <Text style={styles.className}>{classItem.className}</Text>
                  <View style={styles.teacherRow}>
                    <Ionicons name="person" size={14} color="#6b7280" />
                    <Text style={styles.teacherName}>
                      {classItem.teacherName || 'Teacher not assigned'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.classCardFooter}>
                <View style={styles.scheduleInfo}>
                  <View style={styles.scheduleRow}>
                    <Ionicons name="calendar" size={13} color="#6b7280" />
                    <Text style={styles.scheduleText}>
                      {classItem.dayOfWeek}
                    </Text>
                  </View>
                  <View style={styles.scheduleRow}>
                    <Ionicons name="time" size={13} color="#6b7280" />
                    <Text style={styles.scheduleText}>
                      {classItem.startTime} - {classItem.endTime}
                    </Text>
                  </View>
                </View>
                <View style={styles.nextClassBadge}>
                  <Text style={styles.nextClassText}>
                    {getNextClassTime(classItem)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          <Text style={styles.sectionTitle}>Weekly Schedule</Text>
          
          {Object.entries(groupClassesByDay()).map(([day, dayClasses]) => {
            if (dayClasses.length === 0) return null;
            
            return (
              <View key={day} style={styles.daySection}>
                <Text style={styles.dayTitle}>{day}</Text>
                {dayClasses.map((classItem) => (
                  <View key={classItem.id} style={styles.miniClassCard}>
                    <Text style={styles.miniClassTime}>
                      {classItem.startTime} - {classItem.endTime}
                    </Text>
                    <Text style={styles.miniClassName}>{classItem.className}</Text>
                  </View>
                ))}
              </View>
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
    padding: 24,
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
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    paddingVertical: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
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
    padding: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  classCard: {
    backgroundColor: '#fff',
    marginHorizontal: 24,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  classCardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  classIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  classIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  classInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  className: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  teacherName: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
  },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  classCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  scheduleInfo: {
    gap: 4,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scheduleText: {
    fontSize: 13,
    color: '#6b7280',
  },
  nextClassBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  nextClassText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
  },
  daySection: {
    marginHorizontal: 24,
    marginBottom: 20,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  miniClassCard: {
    backgroundColor: '#fff',
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  miniClassTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
    marginBottom: 4,
  },
  miniClassName: {
    fontSize: 14,
    color: '#1f2937',
  },
  detailsHeader: {
    backgroundColor: '#fff',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '600',
  },
  detailsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  detailsCard: {
    backgroundColor: '#fff',
    margin: 24,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  detailsSection: {
    marginBottom: 20,
  },
  detailsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  detailsValue: {
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 6,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  nextSessionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  resourcesSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  resourcesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  resourceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  resourceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resourceInfo: {
    flex: 1,
  },
  resourceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  resourceCount: {
    fontSize: 14,
    color: '#6b7280',
  },
});

export default ClassesScreen;
