import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ClassSchedule } from '../services/api';

interface ScheduleViewProps {
  classes: ClassSchedule[];
  currentDay: string;
  onClassPress?: (classItem: ClassSchedule) => void;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({ classes, currentDay, onClassPress }) => {
  // Filter classes for the current day
  const todayClasses = classes
    .filter((cls) => cls.dayOfWeek === currentDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (todayClasses.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📅</Text>
        <Text style={styles.emptyText}>No classes scheduled for {currentDay}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {todayClasses.map((classItem) => (
        <TouchableOpacity 
          key={classItem.id} 
          style={styles.classCard}
          onPress={() => onClassPress?.(classItem)}
          activeOpacity={0.7}
        >
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{classItem.startTime}</Text>
            <Text style={styles.timeSeparator}>-</Text>
            <Text style={styles.timeText}>{classItem.endTime}</Text>
          </View>
          <View style={styles.classInfo}>
            <Text style={styles.className}>{classItem.className}</Text>
            {classItem.teacherName && (
              <Text style={styles.teacherName}>👨‍🏫 {classItem.teacherName}</Text>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
  classCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  timeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 16,
    borderRightWidth: 2,
    borderRightColor: '#e5e7eb',
    minWidth: 70,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  timeSeparator: {
    fontSize: 12,
    color: '#9ca3af',
    marginVertical: 2,
  },
  classInfo: {
    flex: 1,
    paddingLeft: 16,
    justifyContent: 'center',
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  teacherName: {
    fontSize: 14,
    color: '#6b7280',
  },
});

export default ScheduleView;
