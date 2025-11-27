import React, { useState, useEffect } from 'react';
import { studentsAPI } from '../services/students.api';
import { teachersAPI } from '../services/teachers.api';
import { getAllClasses } from '../services/classes.api';
import { getAllQuizzes } from '../services/quizzes.api';
import { subjectsAPI } from '../api/subjects.api';
import LoadingScreen from '../components/LoadingScreen';
import './ManagementPage.css';
import './Statistics.css';

interface Stats {
  students: { total: number; active: number; inactive: number; byGrade: Record<string, number> };
  teachers: { total: number; active: number; inactive: number; bySubject: Record<string, number> };
  classes: { total: number; gradeDistribution: Record<string, number> };
  quizzes: { total: number; pending: number; available: number; completed: number };
  subjects: { total: number };
}

const Statistics: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    students: { total: 0, active: 0, inactive: 0, byGrade: {} },
    teachers: { total: 0, active: 0, inactive: 0, bySubject: {} },
    classes: { total: 0, gradeDistribution: {} },
    quizzes: { total: 0, pending: 0, available: 0, completed: 0 },
    subjects: { total: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllStats();
  }, []);

  const fetchAllStats = async () => {
    try {
      setLoading(true);
      const [studentsRes, teachersRes, classesRes, quizzesRes, subjectsRes] = await Promise.all([
        studentsAPI.getAll(),
        teachersAPI.getAll(),
        getAllClasses(),
        getAllQuizzes(),
        subjectsAPI.getAll()
      ]);

      const students = Array.isArray(studentsRes) ? studentsRes : (studentsRes as any)?.data || [];
      const teachers = Array.isArray(teachersRes) ? teachersRes : (teachersRes as any)?.data || [];
      const classes = Array.isArray(classesRes) ? classesRes : (classesRes as any)?.data || [];
      const quizzes = Array.isArray(quizzesRes) ? quizzesRes : (quizzesRes as any)?.data || [];
      const subjects = Array.isArray(subjectsRes) ? subjectsRes : (subjectsRes as any)?.data || [];

      // Calculate student stats
      const studentsByGrade: Record<string, number> = {};
      students.forEach((s: any) => {
        const grade = s.currentGrade?.grade || 'Unknown';
        studentsByGrade[grade] = (studentsByGrade[grade] || 0) + 1;
      });

      // Calculate teacher stats by subject
      const teachersBySubject: Record<string, number> = {};
      teachers.forEach((t: any) => {
        (t.subjects || []).forEach((subId: string) => {
          const subject = subjects.find((s: any) => s.id === subId);
          if (subject) {
            teachersBySubject[subject.name] = (teachersBySubject[subject.name] || 0) + 1;
          }
        });
      });

      // Calculate class distribution
      const gradeDistribution: Record<string, number> = {};
      classes.forEach((c: any) => {
        if (c.gradeSections && Array.isArray(c.gradeSections)) {
          const uniqueGrades = new Set(c.gradeSections.map((gs: any) => gs.grade));
          uniqueGrades.forEach((grade) => {
            const gradeKey = `Grade ${grade}`;
            gradeDistribution[gradeKey] = (gradeDistribution[gradeKey] || 0) + 1;
          });
        }
      });

      setStats({
        students: {
          total: students.length,
          active: students.filter((s: any) => s.status === 'active').length,
          inactive: students.filter((s: any) => s.status === 'inactive').length,
          byGrade: studentsByGrade
        },
        teachers: {
          total: teachers.length,
          active: teachers.filter((t: any) => t.status === 'active').length,
          inactive: teachers.filter((t: any) => t.status === 'inactive').length,
          bySubject: teachersBySubject
        },
        classes: {
          total: classes.length,
          gradeDistribution
        },
        quizzes: {
          total: quizzes.length,
          pending: quizzes.filter((q: any) => q.status === 'pending').length,
          available: quizzes.filter((q: any) => q.status === 'available').length,
          completed: quizzes.filter((q: any) => q.status === 'completed').length
        },
        subjects: {
          total: subjects.length
        }
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="management-page stats-page">
      <div className="page-header">
        <h1 className="page-title">School Analytics</h1>
        <p className="page-description">Real-time insights into your school's performance</p>
      </div>

      {/* Main Overview Cards */}
      <div className="stats-overview">
        <div className="stats-card students-card">
          <div className="card-visual">
            <div className="circle-progress" style={{ '--progress': `${(stats.students.active / stats.students.total * 100) || 0}%` } as React.CSSProperties}>
              <span className="progress-number">{stats.students.total}</span>
            </div>
          </div>
          <div className="card-content">
            <h3>Students</h3>
            <div className="stat-row">
              <span className="label">Active:</span>
              <span className="value active">{stats.students.active}</span>
            </div>
            <div className="stat-row">
              <span className="label">Inactive:</span>
              <span className="value inactive">{stats.students.inactive}</span>
            </div>
          </div>
        </div>

        <div className="stats-card teachers-card">
          <div className="card-visual">
            <div className="circle-progress" style={{ '--progress': `${(stats.teachers.active / stats.teachers.total * 100) || 0}%` } as React.CSSProperties}>
              <span className="progress-number">{stats.teachers.total}</span>
            </div>
          </div>
          <div className="card-content">
            <h3>Teachers</h3>
            <div className="stat-row">
              <span className="label">Active:</span>
              <span className="value active">{stats.teachers.active}</span>
            </div>
            <div className="stat-row">
              <span className="label">Inactive:</span>
              <span className="value inactive">{stats.teachers.inactive}</span>
            </div>
          </div>
        </div>

        <div className="stats-card classes-card">
          <div className="card-visual">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="10" />
              <circle 
                cx="50" 
                cy="50" 
                r="40" 
                fill="none" 
                stroke="#3b82f6" 
                strokeWidth="10"
                strokeDasharray={`${(stats.classes.total / 50 * 251.2)} 251.2`}
                transform="rotate(-90 50 50)"
              />
              <text x="50" y="55" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#0c4a6e">{stats.classes.total}</text>
            </svg>
          </div>
          <div className="card-content">
            <h3>Classes</h3>
            <div className="stat-row">
              <span className="label">Subjects:</span>
              <span className="value">{stats.subjects.total}</span>
            </div>
          </div>
        </div>

        <div className="stats-card quizzes-card">
          <div className="card-visual">
            <div className="mini-stats">
              <div className="mini-stat">
                <span className="mini-value">{stats.quizzes.pending}</span>
                <span className="mini-label">Pending</span>
              </div>
              <div className="mini-stat">
                <span className="mini-value">{stats.quizzes.available}</span>
                <span className="mini-label">Active</span>
              </div>
              <div className="mini-stat">
                <span className="mini-value">{stats.quizzes.completed}</span>
                <span className="mini-label">Done</span>
              </div>
            </div>
          </div>
          <div className="card-content">
            <h3>Quizzes</h3>
            <div className="stat-row">
              <span className="label">Total:</span>
              <span className="value">{stats.quizzes.total}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Breakdowns */}
      <div className="stats-details">
        <div className="detail-section">
          <h2 className="section-title">Students by Grade</h2>
          <div className="bars-container">
            {Object.entries(stats.students.byGrade).length === 0 ? (
              <p className="no-data">No student data available</p>
            ) : (
              Object.entries(stats.students.byGrade)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([grade, count], index) => {
                  const maxCount = Math.max(...Object.values(stats.students.byGrade));
                  const percentage = (count / maxCount) * 100;
                  return (
                    <div key={`student-grade-${index}`} className="stat-bar">
                      <div className="bar-label">{grade}</div>
                      <div className="bar-track">
                        <div 
                          className="bar-fill students-fill" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <div className="bar-value">{count}</div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        <div className="detail-section">
          <h2 className="section-title">Teachers by Subject</h2>
          <div className="bars-container">
            {Object.entries(stats.teachers.bySubject).length === 0 ? (
              <p className="no-data">No teacher subject data available</p>
            ) : (
              Object.entries(stats.teachers.bySubject)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([subject, count], index) => {
                  const maxCount = Math.max(...Object.values(stats.teachers.bySubject));
                  const percentage = (count / maxCount) * 100;
                  return (
                    <div key={`teacher-subject-${index}`} className="stat-bar">
                      <div className="bar-label">{subject}</div>
                      <div className="bar-track">
                        <div 
                          className="bar-fill teachers-fill" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <div className="bar-value">{count}</div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        <div className="detail-section">
          <h2 className="section-title">Class Distribution</h2>
          <div className="bars-container">
            {Object.entries(stats.classes.gradeDistribution).length === 0 ? (
              <p className="no-data">No class data available</p>
            ) : (
              Object.entries(stats.classes.gradeDistribution)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([grade, count], index) => {
                  const maxCount = Math.max(...Object.values(stats.classes.gradeDistribution));
                  const percentage = (count / maxCount) * 100;
                  return (
                    <div key={`class-grade-${index}`} className="stat-bar">
                      <div className="bar-label">{grade}</div>
                      <div className="bar-track">
                        <div 
                          className="bar-fill classes-fill" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <div className="bar-value">{count}</div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
