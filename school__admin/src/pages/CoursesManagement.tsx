import React, { useState, useEffect } from 'react';
import { getAllCourses, deleteCourse, type Course } from '../services/courses.api';
import { getAllClasses } from '../services/classes.api';
import { teachersAPI } from '../services/teachers.api';
import CourseModal from '../components/CourseModal';
import LoadingScreen from '../components/LoadingScreen';
import './ManagementPage.css';

const CoursesManagement: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [viewMode, setViewMode] = useState(false);
  
  // Filters
  const [selectedTeacher, setSelectedTeacher] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedGrade, setSelectedGrade] = useState<string>('All');
  
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  useEffect(() => {
    fetchCourses();
    fetchClasses();
    fetchTeachers();
  }, []);

  useEffect(() => {
    filterCourses();
  }, [courses, selectedTeacher, selectedStatus, selectedGrade]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const data = await getAllCourses();
      setCourses(data);
    } catch (error) {
      console.error('Error fetching courses:', error);
      alert('Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const data = await getAllClasses();
      setClasses(data);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await teachersAPI.getAll();
      setTeachers(response?.data || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  const filterCourses = () => {
    let filtered = [...courses];

    if (selectedTeacher !== 'All') {
      const teacherClassIds = classes
        .filter(cls => cls.teacherId === selectedTeacher)
        .map(cls => cls.id);
      filtered = filtered.filter(c => teacherClassIds.includes(c.classId));
    }

    if (selectedStatus !== 'All') {
      filtered = filtered.filter(c => c.status === selectedStatus);
    }

    if (selectedGrade !== 'All') {
      filtered = filtered.filter(c => 
        c.gradeSections.some(gs => gs.startsWith(`Grade ${selectedGrade}`))
      );
    }

    setFilteredCourses(filtered);
  };

  const handleAddCourse = () => {
    setEditingCourse(null);
    setViewMode(false);
    setIsModalOpen(true);
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setViewMode(false);
    setIsModalOpen(true);
  };

  const handleViewCourse = (course: Course) => {
    setEditingCourse(course);
    setViewMode(true);
    setIsModalOpen(true);
  };

  const handleDeleteCourse = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      try {
        await deleteCourse(id);
        fetchCourses();
      } catch (error) {
        console.error('Error deleting course:', error);
        alert('Failed to delete course');
      }
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="management-page">
      <div className="page-header">
        <h1 className="page-title">Courses Management</h1>
        <button className="add-btn" onClick={handleAddCourse}>
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span>Add New Course</span>
        </button>
      </div>

      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Filter by Teacher:</label>
            <select 
              value={selectedTeacher} 
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="filter-select"
            >
              <option value="All">All Teachers</option>
              {teachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.fullName || teacher.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Filter by Status:</label>
            <select 
              value={selectedStatus} 
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="filter-select"
            >
              <option value="All">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Filter by Grade:</label>
            <select 
              value={selectedGrade} 
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="filter-select"
            >
              <option value="All">All Grades</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(grade => (
                <option key={grade} value={grade}>Grade {grade}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Subject</th>
              <th>Class</th>
              <th>Grades/Sections</th>
              <th>Status</th>
              <th>Attachment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCourses.length === 0 ? (
              <tr>
                <td colSpan={7} className="no-data">No courses found</td>
              </tr>
            ) : (
              filteredCourses.map((course) => (
                <tr key={course.id}>
                  <td>{course.title}</td>
                  <td>{course.subject}</td>
                  <td>{course.className}</td>
                  <td>
                    <div className="grade-sections-tags">
                      {course.gradeSections.map((gs, idx) => (
                        <span key={idx} className="tag">{gs}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${course.status}`}>
                      {course.status}
                    </span>
                  </td>
                  <td>
                    {course.attachmentUrl ? (
                      <a href={course.attachmentUrl} target="_blank" rel="noopener noreferrer">
                        {course.attachmentType || 'View'}
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn-view"
                        onClick={() => handleViewCourse(course)}
                        title="View Details"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      <button 
                        className="btn-edit"
                        onClick={() => handleEditCourse(course)}
                        title="Edit"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button 
                        className="btn-delete"
                        onClick={() => handleDeleteCourse(course.id)}
                        title="Delete"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <CourseModal
          course={editingCourse}
          onClose={() => setIsModalOpen(false)}
          viewMode={viewMode}
        />
      )}
    </div>
  );
};

export default CoursesManagement;
