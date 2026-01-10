import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ManagementPage.css';
import { studentsAPI } from '../services/students.api';
import { teachersAPI } from '../services/teachers.api';
import { getAllClasses } from '../services/classes.api';
import { getAllHomeworks } from '../services/homeworks.api';
import { getAllQuizzes } from '../services/quizzes.api';
import { subjectsAPI } from '../api/subjects.api';
import LoadingScreen from '../components/LoadingScreen';

interface Activity {
  id: string;
  type: 'student' | 'teacher' | 'class' | 'homework' | 'quiz' | 'subject';
  action: string;
  user: {
    name: string;
    detail: string;
    avatar: string;
  };
  time: string;
  status: 'active' | 'pending' | 'inactive' | 'completed' | 'available' | 'cancelled' | 'past_due';
}

interface ClassSchedule {
  id: string;
  className: string;
  teacher: string;
  teacherId?: string;
  grade: string;
  section: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

const DashboardHome: React.FC = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [teachers, setTeachers] = useState<any[]>([]);
  const currentWeekStart = getMonday(new Date());

  const GRADES = [
    'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5',
    'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'
  ];

  const SECTIONS = ['A', 'B', 'C'];

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  function getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  useEffect(() => {
    fetchRecentActivities();
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [selectedGrade, selectedSection, selectedTeacher]);

  const parseDate = (dateInput: any): Date => {
    if (!dateInput) return new Date(0); // Return epoch if missing

    // Handle Firestore Timestamp (seconds/nanoseconds)
    if (typeof dateInput === 'object' && (dateInput._seconds !== undefined || dateInput.seconds !== undefined)) {
      const seconds = dateInput._seconds ?? dateInput.seconds;
      return new Date(seconds * 1000);
    }

    // Handle standard date string/number
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return new Date(0);

    return date;
  };

  const fetchRecentActivities = async () => {
    try {
      setLoading(true);
      const [studentsResponse, teachersResponse, classesResponse, homeworksResponse, quizzesResponse, subjectsResponse, activityLogResponse] = await Promise.all([
        studentsAPI.getAll(),
        teachersAPI.getAll(),
        getAllClasses(),
        getAllHomeworks(),
        getAllQuizzes(),
        subjectsAPI.getAll(),
        // Fetch activity logs from the new API
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/activity-log?limit=50`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }).then(res => res.json()).catch(() => ({ data: [] })),
      ]);

      const students = Array.isArray(studentsResponse) ? studentsResponse : (studentsResponse as any)?.data || [];
      const teachers = Array.isArray(teachersResponse) ? teachersResponse : (teachersResponse as any)?.data || [];
      const classes = Array.isArray(classesResponse) ? classesResponse : (classesResponse as any)?.data || [];
      const homeworks = Array.isArray(homeworksResponse) ? homeworksResponse : (homeworksResponse as any)?.data || [];
      const quizzes = Array.isArray(quizzesResponse) ? quizzesResponse : (quizzesResponse as any)?.data || [];
      const subjects = Array.isArray(subjectsResponse) ? subjectsResponse : (subjectsResponse as any)?.data || [];
      const activityLogs = activityLogResponse?.data || [];

      setTeachers(teachers);

      const allActivities: Activity[] = [];

      // Process Activity Logs (includes create, update, delete actions)
      activityLogs.forEach((log: any) => {
        const actionText = log.action === 'deleted'
          ? `${log.type.charAt(0).toUpperCase() + log.type.slice(1)} deleted`
          : log.action === 'created'
            ? `${log.type.charAt(0).toUpperCase() + log.type.slice(1)} created`
            : `${log.type.charAt(0).toUpperCase() + log.type.slice(1)} updated`;

        allActivities.push({
          id: log.id || `log-${Date.now()}-${Math.random()}`,
          type: log.type,
          action: actionText,
          user: {
            name: log.entityName || 'Unknown',
            detail: log.details || '',
            avatar: (log.entityName || 'U').charAt(0).toUpperCase(),
          },
          time: log.createdAt,
          status: log.action === 'deleted' ? 'inactive' : 'active',
        });
      });

      // Process Students (only add if not already in activity logs)
      const loggedStudentIds = new Set(activityLogs.filter((l: any) => l.type === 'student').map((l: any) => l.entityId));
      students.forEach((student: any) => {
        if (loggedStudentIds.has(student.id)) return; // Skip if already in logs

        const studentName = student.fullName || student.name || 'Unknown Student';
        const gradeDetail = student.currentGrade
          ? `Grade ${student.currentGrade.grade} ${student.currentGrade.section}`
          : 'N/A';

        allActivities.push({
          id: student.id || `student-${Date.now()}-${Math.random()}`,
          type: 'student',
          action: 'New student enrolled',
          user: {
            name: studentName,
            detail: gradeDetail,
            avatar: studentName.charAt(0).toUpperCase(),
          },
          time: student.createdAt,
          status: student.status || 'active',
        });
      });

      // Process Teachers (only add if not already in activity logs)
      const loggedTeacherIds = new Set(activityLogs.filter((l: any) => l.type === 'teacher').map((l: any) => l.entityId));
      teachers.forEach((teacher: any) => {
        if (loggedTeacherIds.has(teacher.id || teacher.uid)) return;

        const teacherName = teacher.fullName || teacher.name || 'Unknown Teacher';
        const teacherDetail = teacher.subjects?.[0] || teacher.email || 'Teacher';

        allActivities.push({
          id: teacher.id || teacher.uid || `teacher-${Date.now()}-${Math.random()}`,
          type: 'teacher',
          action: 'Teacher registered',
          user: {
            name: teacherName,
            detail: teacherDetail,
            avatar: teacherName.charAt(0).toUpperCase(),
          },
          time: teacher.createdAt,
          status: teacher.status || 'active',
        });
      });

      // Process Classes (only add if not already in activity logs)
      const loggedClassIds = new Set(activityLogs.filter((l: any) => l.type === 'class').map((l: any) => l.entityId));
      classes.forEach((cls: any) => {
        if (loggedClassIds.has(cls.id)) return;

        const className = cls.className || `${cls.grade || 'Grade'} ${cls.section || ''}`.trim();
        const teacherName = cls.teacherName || cls.teacher?.fullName || cls.teacher?.name || 'No teacher assigned';

        allActivities.push({
          id: cls.id || `class-${Date.now()}-${Math.random()}`,
          type: 'class',
          action: 'Class created',
          user: {
            name: className,
            detail: teacherName,
            avatar: className.charAt(0).toUpperCase(),
          },
          time: cls.createdAt,
          status: 'active',
        });
      });

      // Process Homeworks (only add if not already in activity logs)
      const loggedHomeworkIds = new Set(activityLogs.filter((l: any) => l.type === 'homework').map((l: any) => l.entityId));
      homeworks.forEach((homework: any) => {
        if (loggedHomeworkIds.has(homework.id)) return;

        const homeworkTitle = homework.title || 'Homework';
        const homeworkDetail = `${homework.className || 'Class'} - ${homework.subject || 'Subject'}`;

        allActivities.push({
          id: homework.id || `homework-${Date.now()}-${Math.random()}`,
          type: 'homework',
          action: 'Homework assigned',
          user: {
            name: homeworkTitle,
            detail: homeworkDetail,
            avatar: homeworkTitle.charAt(0).toUpperCase(),
          },
          time: homework.createdAt,
          status: homework.status || 'pending',
        });
      });

      // Process Quizzes (only add if not already in activity logs)
      const loggedQuizIds = new Set(activityLogs.filter((l: any) => l.type === 'quiz').map((l: any) => l.entityId));
      quizzes.forEach((quiz: any) => {
        if (loggedQuizIds.has(quiz.id)) return;

        const quizTitle = quiz.title || 'Quiz';
        const quizDetail = `${quiz.className || 'Class'} - ${quiz.totalMarks || 0} marks`;

        allActivities.push({
          id: quiz.id || `quiz-${Date.now()}-${Math.random()}`,
          type: 'quiz',
          action: 'Quiz created',
          user: {
            name: quizTitle,
            detail: quizDetail,
            avatar: quizTitle.charAt(0).toUpperCase(),
          },
          time: quiz.createdAt,
          status: quiz.status || 'pending',
        });
      });

      // Process Subjects (only add if not already in activity logs)
      const loggedSubjectIds = new Set(activityLogs.filter((l: any) => l.type === 'subject').map((l: any) => l.entityId));
      subjects.forEach((subject: any) => {
        if (loggedSubjectIds.has(subject.id)) return;

        const subjectName = subject.name || 'Subject';
        const subjectDetail = subject.code || 'No code';

        allActivities.push({
          id: subject.id || `subject-${Date.now()}-${Math.random()}`,
          type: 'subject',
          action: 'Subject added',
          user: {
            name: subjectName,
            detail: subjectDetail,
            avatar: subjectName.charAt(0).toUpperCase(),
          },
          time: subject.createdAt,
          status: 'active',
        });
      });

      // Sort by date descending (newest first)
      allActivities.sort((a, b) => {
        const dateA = parseDate(a.time);
        const dateB = parseDate(b.time);
        return dateB.getTime() - dateA.getTime();
      });

      // Take top 10 and format time string
      const recentActivities = allActivities.slice(0, 10).map(activity => ({
        ...activity,
        time: formatTime(activity.time)
      }));

      setActivities(recentActivities);
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateInput: any) => {
    const date = parseDate(dateInput);
    const now = new Date();

    // If date is invalid or epoch (from parseDate fallback), show generic
    if (date.getTime() === 0) return 'Just now';

    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    if (diffInDays < 30) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };



  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active': return 'status-badge active';
      case 'inactive': return 'status-badge inactive';
      case 'pending': return 'status-badge pending';
      case 'completed': return 'status-badge active';
      case 'available': return 'status-badge active';
      case 'cancelled': return 'status-badge inactive';
      case 'past_due': return 'status-badge inactive';
      default: return 'status-badge';
    }
  };

  const getStatusText = (status: string) => {
    if (status === 'past_due') return 'Past Due';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const fetchSchedules = async () => {
    try {
      const classesResponse = await getAllClasses();
      const classes = Array.isArray(classesResponse) ? classesResponse : (classesResponse as any)?.data || [];

      const scheduleData: ClassSchedule[] = classes.map((cls: any) => ({
        id: cls.id,
        className: cls.className,
        teacher: cls.teacherName || cls.teacher?.fullName || 'No Teacher',
        teacherId: cls.teacherId,
        grade: cls.gradeSections?.[0]?.grade || cls.grade || '',
        section: cls.gradeSections?.[0]?.section || cls.section || '',
        dayOfWeek: cls.dayOfWeek,
        startTime: cls.startTime,
        endTime: cls.endTime,
      }));

      // Apply filters
      const filtered = scheduleData.filter((schedule) => {
        if (selectedGrade !== 'all' && schedule.grade !== selectedGrade) return false;
        if (selectedSection !== 'all' && schedule.section !== selectedSection) return false;
        if (selectedTeacher !== 'all' && schedule.teacherId !== selectedTeacher) return false;
        return true;
      });

      setSchedules(filtered);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  const getScheduleForDay = (day: string) => {
    return schedules
      .filter((s) => s.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const formatWeekRange = () => {
    const start = new Date(currentWeekStart);
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);

    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  };

  const quickActions = [
    {
      title: 'Add Student',
      description: 'Enroll a new student',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8.5 11C10.7091 11 12.5 9.20914 12.5 7C12.5 4.79086 10.7091 3 8.5 3C6.29086 3 4.5 4.79086 4.5 7C4.5 9.20914 6.29086 11 8.5 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 8V14M17 11H23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      action: () => navigate('/dashboard/students'),
      color: '#3b82f6',
    },
    {
      title: 'Add Teacher',
      description: 'Register a new teacher',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8.5 11C10.7091 11 12.5 9.20914 12.5 7C12.5 4.79086 10.7091 3 8.5 3C6.29086 3 4.5 4.79086 4.5 7C4.5 9.20914 6.29086 11 8.5 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 8V14M17 11H23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      action: () => navigate('/dashboard/teachers'),
      color: '#8b5cf6',
    },
    {
      title: 'Create Class',
      description: 'Set up a new class',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 3H8C9.06087 3 10.0783 3.42143 10.8284 4.17157C11.5786 4.92172 12 5.93913 12 7V21C12 20.2044 11.6839 19.4413 11.1213 18.8787C10.5587 18.3161 9.79565 18 9 18H2V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M22 3H16C14.9391 3 13.9217 3.42143 13.1716 4.17157C12.4214 4.92172 12 5.93913 12 7V21C12 20.2044 12.3161 19.4413 12.8787 18.8787C13.4413 18.3161 14.2044 18 15 18H22V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      action: () => navigate('/dashboard/classes'),
      color: '#10b981',
    },
    {
      title: 'Create Quiz',
      description: 'Add a new quiz or test',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15848 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 17H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      action: () => navigate('/dashboard/tasks/quizzes'),
      color: '#f59e0b',
    },
    {
      title: 'Assign Homework',
      description: 'Create new homework task',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      action: () => navigate('/dashboard/tasks/homeworks'),
      color: '#ec4899',
    },
    {
      title: 'View Statistics',
      description: 'Check all metrics',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 20V10M12 20V4M6 20V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      action: () => navigate('/dashboard/statistics'),
      color: '#06b6d4',
    },
  ];

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="management-page">
      <div className="page-header">
        <h1 className="page-title">Dashboard Overview</h1>
        <p className="page-description">Welcome to your school management system</p>
      </div>

      {/* Hero Carousel Section */}
      <div className="hero-carousel-section">
        <div className="carousel-grid">
          <div className="carousel-tile large-tile">
            <img
              src="https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1200&h=800&fit=crop"
              alt="Students in classroom"
              className="tile-image"
            />
            <div className="tile-overlay">
              <h3 className="tile-title">Empower Education</h3>
              <p className="tile-description">Transform learning experiences with our comprehensive management system</p>
              <button className="tile-button" onClick={() => navigate('/dashboard/statistics')}>
                View Analytics
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
          <div className="carousel-tile small-tile">
            <img
              src="https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=600&h=400&fit=crop"
              alt="Student success"
              className="tile-image"
            />
            <div className="tile-overlay">
              <h3 className="tile-title">Student Success</h3>
              <p className="tile-description">Track progress and achievements</p>
            </div>
          </div>
          <div className="carousel-tile small-tile">
            <img
              src="https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&h=400&fit=crop"
              alt="Smart scheduling"
              className="tile-image"
            />
            <div className="tile-overlay">
              <h3 className="tile-title">Smart Scheduling</h3>
              <p className="tile-description">Efficient class management</p>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Schedule Calendar */}
      <div className="calendar-section">
        <div className="calendar-header">
          <h2 className="section-title">Weekly Schedule</h2>
          <div className="calendar-controls">
            <span className="calendar-week-range">{formatWeekRange()}</span>
          </div>
        </div>

        <div className="calendar-filters">
          <div className="filter-group">
            <label>Grade</label>
            <select
              className="calendar-filter-select"
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
            >
              <option value="all">All Grades</option>
              {GRADES.map(grade => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Section</label>
            <select
              className="calendar-filter-select"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
            >
              <option value="all">All Sections</option>
              {SECTIONS.map(section => (
                <option key={section} value={section}>Section {section}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Teacher</label>
            <select
              className="calendar-filter-select"
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
            >
              <option value="all">All Teachers</option>
              {Array.isArray(teachers) && teachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="calendar-grid">
          {DAYS.map((day) => {
            const daySchedules = getScheduleForDay(day);
            const isToday = day === new Date().toLocaleDateString('en-US', { weekday: 'long' });

            return (
              <div key={day} className={`calendar-day ${isToday ? 'today' : ''}`}>
                <div className="calendar-day-header">
                  <span className="day-name">{day}</span>
                  <span className="day-count">{daySchedules.length} {daySchedules.length === 1 ? 'class' : 'classes'}</span>
                </div>
                <div className="calendar-day-content">
                  {daySchedules.length === 0 ? (
                    <div className="no-classes">No classes scheduled</div>
                  ) : (
                    daySchedules.map((schedule) => (
                      <div key={schedule.id} className="calendar-event">
                        <div className="event-time">{schedule.startTime} - {schedule.endTime}</div>
                        <div className="event-title">{schedule.className}</div>
                        <div className="event-details">
                          <span className="event-grade">📚 {schedule.grade} {schedule.section}</span>
                          <span className="event-teacher">👨‍🏫 {schedule.teacher}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="quick-actions-section">
        <h2 className="section-title">Quick Actions</h2>
        <div className="quick-actions-grid">
          {quickActions.map((action, index) => (
            <button
              key={index}
              className="quick-action-card"
              onClick={action.action}
              style={{ '--action-color': action.color } as React.CSSProperties}
            >
              <div className="quick-action-icon" style={{ color: action.color }}>
                {action.icon}
              </div>
              <div className="quick-action-content">
                <h3 className="quick-action-title">{action.title}</h3>
                <p className="quick-action-description">{action.description}</p>
              </div>
              <div className="quick-action-arrow">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="data-table-container">
        <div style={{ padding: '24px', borderBottom: '1px solid rgba(148, 163, 184, 0.2)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#0c4a6e', margin: 0 }}>Recent Activities</h2>
        </div>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            <div className="loading-spinner"></div>
            <p>Loading activities...</p>
          </div>
        ) : activities.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            <p>No recent activities</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Activity</th>
                <th>User</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((activity) => (
                <tr key={activity.id}>
                  <td>{activity.action}</td>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">{activity.user.avatar}</div>
                      <div>
                        <div className="user-name">{activity.user.name}</div>
                        <div className="user-detail">{activity.user.detail}</div>
                      </div>
                    </div>
                  </td>
                  <td>{activity.time}</td>
                  <td>
                    <span className={getStatusBadgeClass(activity.status)}>
                      <span className="status-dot"></span>
                      {getStatusText(activity.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default DashboardHome;
