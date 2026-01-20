import React, { useState, useEffect } from 'react';
import { getAllCourses, deleteCourse, type Course } from '../services/courses.api';
import { getAllClasses, type Class } from '../services/classes.api';
import { useAuth } from '../context/AuthContext';
import CourseModal from '../components/CourseModal';
import LoadingScreen from '../components/LoadingScreen';
import './ManagementPage.css';

const CoursesManagement: React.FC = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
    const [myClasses, setMyClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [viewMode, setViewMode] = useState(false);

    // Filters
    const [selectedStatus, setSelectedStatus] = useState<string>('All');
    const [selectedClass, setSelectedClass] = useState<string>('All');

    // Teacher's subject (from user context)
    const subjectName = user?.subject || 'General';
    const teacherSubjects = user?.subjects || [subjectName];

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        filterCourses();
    }, [courses, selectedStatus, selectedClass, myClasses]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [allCourses, allClasses] = await Promise.all([
                getAllCourses(),
                getAllClasses()
            ]);

            // Filter classes to only those belonging to this teacher
            const teacherClasses = allClasses.filter(cls => cls.teacherId === user?.id);
            setMyClasses(teacherClasses);

            // Filter courses to only those for this teacher's classes
            const myClassIds = teacherClasses.map(c => c.id);
            const myCourses = allCourses.filter(c => myClassIds.includes(c.classId));
            setCourses(myCourses);
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const filterCourses = () => {
        let filtered = [...courses];

        if (selectedStatus !== 'All') {
            filtered = filtered.filter(c => c.status === selectedStatus);
        }

        if (selectedClass !== 'All') {
            filtered = filtered.filter(c => c.classId === selectedClass);
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
        if (!window.confirm('Are you sure you want to delete this course?')) return;

        try {
            await deleteCourse(id);
            fetchData();
            alert('Course deleted successfully');
        } catch (error) {
            console.error('Error deleting course:', error);
            alert('Failed to delete course');
        }
    };

    const clearFilters = () => {
        setSelectedStatus('All');
        setSelectedClass('All');
    };

    const hasActiveFilters = selectedStatus !== 'All' || selectedClass !== 'All';

    // Get unique class names for filter
    const uniqueClasses = Array.from(
        new Map(myClasses.map(cls => [cls.className, cls])).values()
    );

    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <div className="management-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Courses</h1>
                    <p className="page-description">Create and manage course materials for your classes</p>
                </div>
                <button onClick={handleAddCourse} className="add-btn">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <span>Add Course</span>
                </button>
            </div>

            {/* Filters */}
            <div className="filters-section">
                <div className="filters-grid">
                    <div className="filter-group">
                        <label>Class</label>
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="filter-select"
                        >
                            <option value="All">All Classes</option>
                            {uniqueClasses.map(cls => (
                                <option key={cls.id} value={cls.id}>{cls.className}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Status</label>
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

                    {hasActiveFilters && (
                        <div className="filter-group">
                            <label>&nbsp;</label>
                            <button onClick={clearFilters} className="clear-filters-btn">
                                Clear Filters
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Courses Table */}
            <div className="data-table-container">
                {filteredCourses.length === 0 ? (
                    <div className="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        <h3>No courses found</h3>
                        <p>Create your first course for your students</p>
                    </div>
                ) : (
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
                            {filteredCourses.map((course) => (
                                <tr key={course.id}>
                                    <td>
                                        <div className="font-medium">{course.title}</div>
                                    </td>
                                    <td>{course.subject}</td>
                                    <td>{course.className}</td>
                                    <td>
                                        <div className="grade-sections-tags">
                                            {course.gradeSections.slice(0, 2).map((gs, idx) => (
                                                <span key={idx} className="tag">{gs}</span>
                                            ))}
                                            {course.gradeSections.length > 2 && (
                                                <span className="tag">+{course.gradeSections.length - 2}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${course.status}`}>
                                            {course.status}
                                        </span>
                                    </td>
                                    <td>
                                        {course.attachmentUrl ? (
                                            <a href={course.attachmentUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
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
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </svg>
                                            </button>
                                            <button
                                                className="btn-edit"
                                                onClick={() => handleEditCourse(course)}
                                                title="Edit"
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                </svg>
                                            </button>
                                            <button
                                                className="btn-delete"
                                                onClick={() => handleDeleteCourse(course.id)}
                                                title="Delete"
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {isModalOpen && (
                <CourseModal
                    course={editingCourse}
                    onClose={() => {
                        setIsModalOpen(false);
                        fetchData();
                    }}
                    viewMode={viewMode}
                    myClasses={myClasses}
                    subjectName={subjectName}
                    subjects={teacherSubjects}
                />
            )}
        </div>
    );
};

export default CoursesManagement;
