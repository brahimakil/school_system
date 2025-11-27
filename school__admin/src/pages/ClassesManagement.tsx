import React, { useState, useEffect } from 'react';
import type { Class } from '../services/classes.api';
import { getAllClasses, deleteClass, getClassStudents } from '../services/classes.api';
import ClassModal from '../components/ClassModal';
import './ManagementPage.css';
import LoadingScreen from '../components/LoadingScreen';

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const ClassesManagement: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedClassGroup, setSelectedClassGroup] = useState<Class[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('All');
  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('All');
  const [viewingStudents, setViewingStudents] = useState<{ classId: string; students: any[] } | null>(null);
  const [viewingSchedule, setViewingSchedule] = useState<Class[] | null>(null);

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    filterClasses();
  }, [classes, searchTerm, selectedDays, selectedGrade, selectedSection, selectedTeacher]);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const data = await getAllClasses();
      setClasses(data);
    } catch (error) {
      console.error('Failed to load classes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group classes by className, teacherId, and gradeSections
  const groupClasses = (classList: Class[]) => {
    const groups = new Map<string, Class[]>();
    
    classList.forEach(classItem => {
      const key = `${classItem.className}-${classItem.teacherId}-${JSON.stringify(classItem.gradeSections)}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(classItem);
    });
    
    return Array.from(groups.values());
  };

  const filterClasses = () => {
    let filtered = classes;

    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.teacherName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedDays.length > 0) {
      filtered = filtered.filter(c => selectedDays.includes(c.dayOfWeek));
    }

    if (selectedGrade !== 'All') {
      filtered = filtered.filter(c => 
        c.gradeSections.some(gs => gs.grade === selectedGrade)
      );
    }

    if (selectedSection !== 'All') {
      filtered = filtered.filter(c => 
        c.gradeSections.some(gs => gs.section === selectedSection)
      );
    }

    if (selectedTeacher !== 'All') {
      filtered = filtered.filter(c => c.teacherName === selectedTeacher);
    }

    setFilteredClasses(filtered);
  };

  // Get unique grades, sections, and teachers for filter dropdowns
  const uniqueGrades = Array.from(new Set(classes.flatMap(c => c.gradeSections.map(gs => gs.grade)))).sort();
  const uniqueSections = Array.from(new Set(classes.flatMap(c => c.gradeSections.map(gs => gs.section)))).sort();
  const uniqueTeachers = Array.from(new Set(classes.map(c => c.teacherName).filter(Boolean))).sort();

  const handleAddClass = () => {
    setSelectedClass(null);
    setSelectedClassGroup([]);
    setIsModalOpen(true);
  };

  const handleEditClass = (classItem: Class) => {
    // Find all class entries with the same className, teacherId, and gradeSections
    const relatedClasses = classes.filter(c => 
      c.className === classItem.className && 
      c.teacherId === classItem.teacherId &&
      JSON.stringify(c.gradeSections) === JSON.stringify(classItem.gradeSections)
    );
    
    console.log('=== EDIT CLASS ===');
    console.log('Clicked class:', classItem);
    console.log('Related classes found:', relatedClasses);
    
    setSelectedClass(classItem); // Use first one as template
    setSelectedClassGroup(relatedClasses); // Pass all related schedules
    setIsModalOpen(true);
  };

  const handleDeleteClass = async (id: string) => {
    // Find the class being deleted
    const classItem = classes.find(c => c.id === id);
    if (!classItem) return;

    // Find all related classes (same name, teacher, and grade/sections)
    const relatedClasses = classes.filter(c => 
      c.className === classItem.className && 
      c.teacherId === classItem.teacherId &&
      JSON.stringify(c.gradeSections) === JSON.stringify(classItem.gradeSections)
    );

    const scheduleCount = relatedClasses.length;
    const confirmMsg = scheduleCount > 1 
      ? `This will delete "${classItem.className}" and all its ${scheduleCount} schedules. Continue?`
      : `Are you sure you want to delete this class?`;

    if (window.confirm(confirmMsg)) {
      try {
        // Delete all related classes
        for (const relatedClass of relatedClasses) {
          if (relatedClass.id) {
            await deleteClass(relatedClass.id);
          }
        }
        loadClasses();
      } catch (error) {
        console.error('Failed to delete class:', error);
      }
    }
  };

  const handleViewStudents = async (classId: string) => {
    try {
      const students = await getClassStudents(classId);
      setViewingStudents({ classId, students });
    } catch (error) {
      console.error('Failed to load students:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      // Modal already handles all creation/deletion, just refresh the list
      loadClasses();
      setIsModalOpen(false);
    } catch (error: any) {
      throw error;
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const stats = {
    total: classes.length,
    byDay: DAYS_ORDER.reduce((acc, day) => {
      acc[day] = classes.filter(c => c.dayOfWeek === day).length;
      return acc;
    }, {} as Record<string, number>),
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="management-page">
      <div className="page-header">
        <h1 className="page-title">Classes Management</h1>
        <p className="page-description">Manage school classes and schedules</p>
      </div>

      <div className="days-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
        gap: '16px', 
        marginBottom: '32px' 
      }}>
        {DAYS_ORDER.map(day => {
          const isSelected = selectedDays.includes(day);
          return (
            <div 
              key={day} 
              className="stat-card"
              onClick={() => {
                setSelectedDays(prev => 
                  prev.includes(day) 
                    ? prev.filter(d => d !== day) 
                    : [...prev, day]
                );
              }}
              style={{ 
                cursor: 'pointer',
                padding: '20px',
                border: isSelected ? '2px solid #3b82f6' : '1px solid rgba(59, 130, 246, 0.2)',
                backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'rgba(255, 255, 255, 0.9)',
                transform: isSelected ? 'translateY(-4px)' : 'none',
                transition: 'all 0.2s ease',
                boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.15)' : 'none'
              }}
            >
              <div className="stat-header" style={{ marginBottom: '12px' }}>
                <span className="stat-title" style={{ 
                  fontSize: '15px', 
                  fontWeight: 600,
                  color: isSelected ? '#2563eb' : '#64748b'
                }}>{day.substring(0, 3)}</span>
                <div className="stat-icon" style={{ 
                  width: '32px', 
                  height: '32px',
                  backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)'
                }}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '18px', height: '18px' }}>
                    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M16 2V6M8 2V6M3 10H21" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
              </div>
              <div className="stat-value" style={{ fontSize: '24px', marginBottom: '0' }}>{stats.byDay[day] || 0}</div>
              <div className="stat-change positive" style={{ fontSize: '12px', marginTop: '4px' }}>
                <span>Classes</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="page-actions">
        <div className="search-box">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <input
            type="text"
            placeholder="Search by class name or teacher..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button onClick={handleAddClass} className="add-btn">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <span>Add Class</span>
        </button>
      </div>

      {/* Filters Row */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '24px',
        flexWrap: 'wrap',
        padding: '16px',
        backgroundColor: '#f9fafb',
        borderRadius: '12px',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ flex: '1', minWidth: '150px' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '13px', 
            fontWeight: 600, 
            color: '#374151',
            marginBottom: '6px'
          }}>
            Day
          </label>
          <select
            value={selectedDays.length === 1 ? selectedDays[0] : (selectedDays.length === 0 ? 'All' : 'Multiple')}
            onChange={e => {
              const val = e.target.value;
              if (val === 'All') setSelectedDays([]);
              else if (val !== 'Multiple') setSelectedDays([val]);
            }}
            className="filter-select"
            style={{ width: '100%' }}
          >
            <option value="All">All Days</option>
            {selectedDays.length > 1 && <option value="Multiple">Multiple Selected</option>}
            {DAYS_ORDER.map(day => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
        </div>

        <div style={{ flex: '1', minWidth: '150px' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '13px', 
            fontWeight: 600, 
            color: '#374151',
            marginBottom: '6px'
          }}>
            Grade
          </label>
          <select
            value={selectedGrade}
            onChange={e => setSelectedGrade(e.target.value)}
            className="filter-select"
            style={{ width: '100%' }}
          >
            <option value="All">All Grades</option>
            {uniqueGrades.map(grade => (
              <option key={grade} value={grade}>{grade}</option>
            ))}
          </select>
        </div>

        <div style={{ flex: '1', minWidth: '150px' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '13px', 
            fontWeight: 600, 
            color: '#374151',
            marginBottom: '6px'
          }}>
            Section
          </label>
          <select
            value={selectedSection}
            onChange={e => setSelectedSection(e.target.value)}
            className="filter-select"
            style={{ width: '100%' }}
          >
            <option value="All">All Sections</option>
            {uniqueSections.map(section => (
              <option key={section} value={section}>{section}</option>
            ))}
          </select>
        </div>

        <div style={{ flex: '1', minWidth: '200px' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '13px', 
            fontWeight: 600, 
            color: '#374151',
            marginBottom: '6px'
          }}>
            Teacher
          </label>
          <select
            value={selectedTeacher}
            onChange={e => setSelectedTeacher(e.target.value)}
            className="filter-select"
            style={{ width: '100%' }}
          >
            <option value="All">All Teachers</option>
            {uniqueTeachers.map(teacher => (
              <option key={teacher} value={teacher}>{teacher}</option>
            ))}
          </select>
        </div>

        {(selectedDays.length > 0 || selectedGrade !== 'All' || selectedSection !== 'All' || selectedTeacher !== 'All') && (
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={() => {
                setSelectedDays([]);
                setSelectedGrade('All');
                setSelectedSection('All');
                setSelectedTeacher('All');
              }}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#6b7280',
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.borderColor = '#9ca3af';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.borderColor = '#d1d5db';
              }}
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Class Name</th>
              <th>Teacher</th>
              <th>Grades & Sections</th>
              <th>Schedule</th>
              <th>Students</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {groupClasses(filteredClasses).map(classGroup => {
              const mainClass = classGroup[0]; // Use first entry as template
              
              // Get unique student IDs across all schedules
              const uniqueStudentIds = new Set<string>();
              classGroup.forEach(c => {
                if (c.studentIds) {
                  c.studentIds.forEach(id => uniqueStudentIds.add(id));
                }
              });
              const totalStudents = uniqueStudentIds.size;
              
              return (
                <tr key={`${mainClass.className}-${mainClass.teacherId}`}>
                  <td>
                    <div className="table-cell-content">
                      <span className="primary-text">{mainClass.className}</span>
                    </div>
                  </td>
                  <td>
                    <div className="table-cell-content">
                      <span className="secondary-text">{mainClass.teacherName}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {mainClass.gradeSections.map((gs, idx) => (
                        <span
                          key={idx}
                          className="badge badge-info"
                        >
                          {gs.grade} - {gs.section}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <button
                      onClick={() => setViewingSchedule(classGroup)}
                      className="badge badge-purple"
                      style={{ cursor: 'pointer', border: 'none' }}
                    >
                      View Schedule ({classGroup.length})
                    </button>
                  </td>
                  <td>
                    <button
                      onClick={() => handleViewStudents(mainClass.id!)}
                      className="badge badge-success"
                      style={{ cursor: 'pointer', border: 'none' }}
                    >
                      {totalStudents} Students
                    </button>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button onClick={() => handleEditClass(mainClass)} className="action-btn edit-btn">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2"/>
                          <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      </button>
                      <button onClick={() => handleDeleteClass(mainClass.id!)} className="action-btn delete-btn">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2"/>
                          <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredClasses.length === 0 && (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 3H8C9.06087 3 10.0783 3.42143 10.8284 4.17157C11.5786 4.92172 12 5.93913 12 7V21C12 20.2044 11.6839 19.4413 11.1213 18.8787C10.5587 18.3161 9.79565 18 9 18H2V3Z" stroke="currentColor" strokeWidth="2"/>
              <path d="M22 3H16C14.9391 3 13.9217 3.42143 13.1716 4.17157C12.4214 4.92172 12 5.93913 12 7V21C12 20.2044 12.3161 19.4413 12.8787 18.8787C13.4413 18.3161 14.2044 18 15 18H22V3Z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <h3>No classes found</h3>
            <p>Create your first class to get started</p>
          </div>
        )}
      </div>

      <ClassModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        classData={selectedClass}
        relatedClasses={selectedClassGroup}
      />

      {viewingStudents && (
        <div className="modal-overlay" onClick={() => setViewingStudents(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Enrolled Students ({viewingStudents.students.length})</h2>
              <button className="modal-close" onClick={() => setViewingStudents(null)}>×</button>
            </div>
            
            <div className="modal-form" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {viewingStudents.students.length === 0 ? (
                <div className="empty-state">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2"/>
                    <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <h3>No students enrolled yet</h3>
                  <p>Students will appear here once they match the grade and section</p>
                </div>
              ) : (
                <div className="students-list">
                  {viewingStudents.students.map((student: any) => (
                    <div key={student.id} className="student-item">
                      {student.photoURL ? (
                        <img
                          src={student.photoURL}
                          alt={student.fullName}
                          className="student-avatar"
                        />
                      ) : (
                        <div className="student-avatar-placeholder">
                          {student.fullName.charAt(0)}
                        </div>
                      )}
                      <div className="student-info">
                        <div className="student-name">{student.fullName}</div>
                        <div className="student-grade">
                          {student.currentGrade.grade} - {student.currentGrade.section}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="modal-actions">
              <button onClick={() => setViewingStudents(null)} className="btn-cancel">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingSchedule && (
        <div className="modal-overlay" onClick={() => setViewingSchedule(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Class Schedule - {viewingSchedule[0].className}</h2>
              <button className="modal-close" onClick={() => setViewingSchedule(null)}>×</button>
            </div>
            
            <div className="modal-form" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <div className="schedule-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {DAYS_ORDER.map(day => {
                  const daySchedules = viewingSchedule.filter(s => s.dayOfWeek === day);
                  if (daySchedules.length === 0) return null;
                  
                  return (
                    <div key={day} style={{ 
                      padding: '12px', 
                      border: '1px solid #e0e0e0', 
                      borderRadius: '8px',
                      backgroundColor: '#f8f9fa'
                    }}>
                      <div style={{ 
                        fontWeight: '600', 
                        marginBottom: '8px', 
                        color: '#6366f1',
                        fontSize: '1rem'
                      }}>
                        {day}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {daySchedules.map((schedule, idx) => (
                          <div key={idx} style={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            padding: '8px 12px',
                            backgroundColor: '#ffffff',
                            borderRadius: '6px',
                            border: '1px solid #e0e0e0'
                          }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginRight: '8px', flexShrink: 0 }}>
                              <circle cx="12" cy="12" r="10" stroke="#6366f1" strokeWidth="2"/>
                              <path d="M12 6V12L16 14" stroke="#6366f1" strokeWidth="2"/>
                            </svg>
                            <span style={{ fontSize: '0.95rem', color: '#333' }}>
                              {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="modal-actions">
              <button onClick={() => setViewingSchedule(null)} className="btn-cancel">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassesManagement;
