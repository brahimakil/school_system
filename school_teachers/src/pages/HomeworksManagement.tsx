import React, { useState, useEffect } from 'react';
import { getAllHomeworks, deleteHomework, type Homework } from '../services/homeworks.api';
import { getAllClasses, type Class } from '../services/classes.api';
import { useAuth } from '../context/AuthContext';
import HomeworkModal from '../components/HomeworkModal';
import LoadingScreen from '../components/LoadingScreen';
import './ManagementPage.css';

const HomeworksManagement: React.FC = () => {
    const { user } = useAuth();
    const [homeworks, setHomeworks] = useState<Homework[]>([]);
    const [filteredHomeworks, setFilteredHomeworks] = useState<Homework[]>([]);
    const [myClasses, setMyClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingHomework, setEditingHomework] = useState<Homework | null>(null);
    const [viewMode, setViewMode] = useState(false);

    // Filters
    const [selectedStatus, setSelectedStatus] = useState<string>('All');
    const [selectedClass, setSelectedClass] = useState<string>('All');

    // Teacher's subject (from user context)
    const subjectName = user?.subject || 'General';

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        filterHomeworks();
    }, [homeworks, selectedStatus, selectedClass, myClasses]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [allHomeworks, allClasses] = await Promise.all([
                getAllHomeworks(),
                getAllClasses()
            ]);

            // Filter classes to only those belonging to this teacher
            const teacherClasses = allClasses.filter(cls => cls.teacherId === user?.id);
            setMyClasses(teacherClasses);

            // Filter homeworks to only those for this teacher's classes
            const myClassIds = teacherClasses.map(c => c.id);
            const myHomeworks = allHomeworks.filter(h => myClassIds.includes(h.classId));
            setHomeworks(myHomeworks);
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const filterHomeworks = () => {
        let filtered = [...homeworks];

        if (selectedStatus !== 'All') {
            filtered = filtered.filter(hw => hw.status === selectedStatus);
        }

        if (selectedClass !== 'All') {
            filtered = filtered.filter(hw => hw.classId === selectedClass);
        }

        setFilteredHomeworks(filtered);
    };

    const handleAddHomework = () => {
        setEditingHomework(null);
        setViewMode(false);
        setIsModalOpen(true);
    };

    const handleEditHomework = (homework: Homework) => {
        setEditingHomework(homework);
        setViewMode(false);
        setIsModalOpen(true);
    };

    const handleViewHomework = (homework: Homework) => {
        setEditingHomework(homework);
        setViewMode(true);
        setIsModalOpen(true);
    };

    const handleDeleteHomework = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this homework?')) return;

        try {
            await deleteHomework(id);
            fetchData();
            alert('Homework deleted successfully');
        } catch (error) {
            console.error('Error deleting homework:', error);
            alert('Failed to delete homework');
        }
    };

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'active': return 'status-badge active';
            case 'completed': return 'status-badge completed';
            case 'pending': return 'status-badge pending';
            case 'past_due': return 'status-badge inactive';
            default: return 'status-badge';
        }
    };

    const formatStatus = (status: string) => {
        return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
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
                    <h1 className="page-title">Homeworks</h1>
                    <p className="page-description">Assign and manage homework for your classes</p>
                </div>
                <button onClick={handleAddHomework} className="add-btn">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <span>Add Homework</span>
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
                            <option value="past_due">Past Due</option>
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

            {/* Homeworks Table */}
            <div className="data-table-container">
                {filteredHomeworks.length === 0 ? (
                    <div className="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="currentColor" strokeWidth="2" />
                            <rect x="9" y="3" width="6" height="4" rx="2" stroke="currentColor" strokeWidth="2" />
                            <path d="M9 12h6M9 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <h3>No homeworks found</h3>
                        <p>Create your first homework assignment</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Subject</th>
                                <th>Class</th>
                                <th>Due Date</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredHomeworks.map((homework) => (
                                <tr key={homework.id}>
                                    <td>
                                        <div className="fw-bold">{homework.title}</div>
                                        <div className="text-muted small">{homework.gradeSections.join(', ')}</div>
                                    </td>
                                    <td>{homework.subject || '-'}</td>
                                    <td>{homework.className}</td>
                                    <td>{new Date(homework.dueDate).toLocaleString()}</td>
                                    <td>
                                        <span className={getStatusBadgeClass(homework.status)}>
                                            {formatStatus(homework.status)}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                className="btn-view"
                                                onClick={() => handleViewHomework(homework)}
                                                title="View Details"
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </svg>
                                            </button>
                                            <button
                                                className="btn-edit"
                                                onClick={() => handleEditHomework(homework)}
                                                title="Edit"
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                </svg>
                                            </button>
                                            <button
                                                className="btn-delete"
                                                onClick={() => handleDeleteHomework(homework.id)}
                                                title="Delete"
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                    <line x1="10" y1="11" x2="10" y2="17" />
                                                    <line x1="14" y1="11" x2="14" y2="17" />
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
                <HomeworkModal
                    homework={editingHomework}
                    onClose={() => {
                        setIsModalOpen(false);
                        fetchData();
                    }}
                    viewMode={viewMode}
                    myClasses={myClasses}
                    subjectName={subjectName}
                />
            )}
        </div>
    );
};

export default HomeworksManagement;
