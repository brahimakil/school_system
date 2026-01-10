import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import LoadingScreen from '../components/LoadingScreen';
import './DashboardHome.css';

interface ClassInfo {
  id: string;
  name: string;
  studentCount: number;
  schedule: string;
  day: string;
  grade?: string;
  section?: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DashboardHome: React.FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const classesRes = await api.get('/teachers/my-classes');

      if (classesRes.data.success) {
        setClasses(classesRes.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScheduleForDay = (day: string) => {
    return classes
      .filter((cls) => cls.day === day)
      .sort((a, b) => {
        // Sort by start time if schedule contains time
        const timeA = a.schedule.split(' - ')[0] || '';
        const timeB = b.schedule.split(' - ')[0] || '';
        return timeA.localeCompare(timeB);
      });
  };

  const formatWeekRange = () => {
    const now = new Date();
    const monday = new Date(now);
    const day = monday.getDay();
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);

    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${monday.toLocaleDateString('en-US', options)} - ${sunday.toLocaleDateString('en-US', options)}`;
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="dashboard-home">
      <div className="dashboard-header">
        <div>
          <h1>Welcome back, {user?.name}!</h1>
          <p>Here's what's happening with your classes today</p>
        </div>
      </div>

      {/* Hero Carousel Section */}
      <div className="hero-carousel-section">
        <div className="carousel-grid">
          <div className="carousel-tile large-tile">
            <img
              src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200&h=800&fit=crop"
              alt="Teacher in classroom"
              className="tile-image"
            />
            <div className="tile-overlay">
              <h3 className="tile-title">Inspire Learning</h3>
              <p className="tile-description">Manage your classes and empower students with knowledge</p>
            </div>
          </div>
          <div className="carousel-tile small-tile">
            <img
              src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=400&fit=crop"
              alt="Students studying"
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
              <h3 className="tile-title">Easy Scheduling</h3>
              <p className="tile-description">Organize classes efficiently</p>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Schedule Calendar */}
      <div className="calendar-section">
        <div className="calendar-header">
          <h2 className="section-title">My Weekly Schedule</h2>
          <div className="calendar-controls">
            <span className="calendar-week-range">{formatWeekRange()}</span>
          </div>
        </div>

        {classes.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 3H8C9.06087 3 10.0783 3.42143 10.8284 4.17157C11.5786 4.92172 12 5.93913 12 7V21C12 20.2044 11.6839 19.4413 11.1213 18.8787C10.5587 18.3161 9.79565 18 9 18H2V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M22 3H16C14.9391 3 13.9217 3.42143 13.1716 4.17157C12.4214 4.92172 12 5.93913 12 7V21C12 20.2044 12.3161 19.4413 12.8787 18.8787C13.4413 18.3161 14.2044 18 15 18H22V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p>No classes assigned yet</p>
          </div>
        ) : (
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
                      daySchedules.map((classInfo) => (
                        <div key={classInfo.id} className="calendar-event">
                          <div className="event-time">{classInfo.schedule}</div>
                          <div className="event-title">{classInfo.name}</div>
                          <div className="event-details">
                            {(classInfo.grade || classInfo.section) && (
                              <span className="event-grade">📚 {classInfo.grade} {classInfo.section}</span>
                            )}
                            <span className="event-students">👥 {classInfo.studentCount} students</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardHome;
