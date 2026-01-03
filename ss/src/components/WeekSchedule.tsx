import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ClassSchedule } from '../services/api';

interface WeekScheduleProps {
  classes: ClassSchedule[];
  onClassPress?: (classItem: ClassSchedule) => void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const WeekSchedule: React.FC<WeekScheduleProps> = ({ classes, onClassPress }) => {
  const getClassesForDay = (day: string) => {
    return classes
      .filter((cls) => cls.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  return (
    <View style={styles.container}>
      {DAYS.map((day) => {
        const dayClasses = getClassesForDay(day);
        
        return (
          <View key={day} style={styles.dayContainer}>
            <Text style={styles.dayTitle}>{day}</Text>
            {dayClasses.length === 0 ? (
              <View style={styles.emptyDay}>
                <Text style={styles.emptyText}>No classes</Text>
              </View>
            ) : (
              <View style={styles.classesContainer}>
                {dayClasses.map((classItem) => (
                  <TouchableOpacity 
                    key={classItem.id} 
                    style={styles.classCard}
                    onPress={() => onClassPress?.(classItem)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.classTime}>
                      {classItem.startTime} - {classItem.endTime}
                    </Text>
                    <Text style={styles.className}>{classItem.className}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 16,
  },
  dayContainer: {
    marginBottom: 24,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  emptyDay: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  classesContainer: {
    gap: 8,
  },
  classCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  classTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
    marginBottom: 4,
  },
  className: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
});

export default WeekSchedule;
