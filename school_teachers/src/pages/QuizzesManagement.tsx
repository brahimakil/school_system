import React, { useState, useEffect } from 'react';
import { getAllQuizzes, deleteQuiz, type Quiz } from '../services/quizzes.api';
import { getAllClasses, type Class } from '../services/classes.api';
import { useAuth } from '../context/AuthContext';
import QuizModal from '../components/QuizModal';
import LoadingScreen from '../components/LoadingScreen';
import './ManagementPage.css';

const QuizzesManagement: React.FC = () => {
    const { user } = useAuth();
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [filteredQuizzes, setFilteredQuizzes] = useState<Quiz[]>([]);
    const [myClasses, setMyClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
    const [viewMode, setViewMode] = useState(false);

    // Filters
    const [selectedStatus, setSelectedStatus] = useState<string>('All');
    const [selectedClass, setSelectedClass] = useState<string>('All');

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        filterQuizzes();
    }, [quizzes, selectedStatus, selectedClass, myClasses]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [allQuizzes, allClasses] = await Promise.all([
                getAllQuizzes(),
                getAllClasses()
            ]);

            // Filter classes to only those belonging to this teacher
            const teacherClasses = allClasses.filter(cls => cls.teacherId === user?.id);
            setMyClasses(teacherClasses);

            // Filter quizzes to only those for this teacher's classes
            const myClassIds = teacherClasses.map(c => c.id);
            const myQuizzes = allQuizzes.filter(q => myClassIds.includes(q.classId));
            setQuizzes(myQuizzes);
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const filterQuizzes = () => {
        let filtered = [...quizzes];

        if (selectedStatus !== 'All') {
            filtered = filtered.filter(quiz => quiz.status === selectedStatus);
        }

        if (selectedClass !== 'All') {
            filtered = filtered.filter(quiz => quiz.classId === selectedClass);
        }

        setFilteredQuizzes(filtered);
    };

    const handleAddQuiz = () => {
        setEditingQuiz(null);
        setViewMode(false);
        setIsModalOpen(true);
    };

    const handleEditQuiz = (quiz: Quiz) => {
        setEditingQuiz(quiz);
        setViewMode(false);
        setIsModalOpen(true);
    };

    const handleViewQuiz = (quiz: Quiz) => {
        setEditingQuiz(quiz);
        setViewMode(true);
        setIsModalOpen(true);
    };

    const handleDeleteQuiz = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this quiz?')) return;

        try {
            await deleteQuiz(id);
            fetchData();
            alert('Quiz deleted successfully');
        } catch (error) {
            console.error('Error deleting quiz:', error);
            alert('Failed to delete quiz');
        }
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingQuiz(null);
        fetchData();
    };

    const clearFilters = () => {
        setSelectedStatus('All');
        setSelectedClass('All');
    };

    const hasActiveFilters = selectedStatus !== 'All' || selectedClass !== 'All';

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

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
                    <h1 className="page-title">Quizzes</h1>
                    <p className="page-description">Create and manage quizzes for your classes</p>
                </div>
                <button onClick={handleAddQuiz} className="add-btn">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <span>Create Quiz</span>
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
                            <option value="available">Available</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
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

            {/* Quizzes Table */}
            <div className="data-table-container">
                {filteredQuizzes.length === 0 ? (
                    <div className="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                            <path d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15848 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13" stroke="currentColor" strokeWidth="2" />
                            <path d="M12 17H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <h3>No quizzes found</h3>
                        <p>Create your first quiz for your students</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Class</th>
                                <th>Grades/Sections</th>
                                <th>Start</th>
                                <th>End</th>
                                <th>Duration</th>
                                <th>Questions</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredQuizzes.map((quiz) => (
                                <tr key={quiz.id}>
                                    <td>
                                        <div className="font-medium">{quiz.title}</div>
                                        <div className="text-sm text-gray-500">{quiz.description?.substring(0, 40)}{quiz.description?.length > 40 ? '...' : ''}</div>
                                    </td>
                                    <td>{quiz.className}</td>
                                    <td>
                                        <div className="grade-sections-list">
                                            {quiz.gradeSections.slice(0, 2).map((gs, idx) => (
                                                <span key={idx} className="badge badge-primary">
                                                    {gs}
                                                </span>
                                            ))}
                                            {quiz.gradeSections.length > 2 && (
                                                <span className="badge badge-primary">+{quiz.gradeSections.length - 2}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>{formatDateTime(quiz.startDateTime)}</td>
                                    <td>{formatDateTime(quiz.endDateTime)}</td>
                                    <td>{quiz.quizDurationMinutes} min</td>
                                    <td className="text-center font-semibold">{quiz.questions.length}</td>
                                    <td>
                                        <span className={`status-badge status-${quiz.status}`}>
                                            {quiz.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                onClick={() => handleViewQuiz(quiz)}
                                                className="btn-view"
                                                title="View quiz"
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleEditQuiz(quiz)}
                                                className="btn-edit"
                                                title="Edit quiz"
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => quiz.id && handleDeleteQuiz(quiz.id)}
                                                className="btn-delete"
                                                title="Delete quiz"
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
                <QuizModal
                    quiz={editingQuiz}
                    onClose={handleModalClose}
                    viewMode={viewMode}
                    myClasses={myClasses}
                />
            )}
        </div>
    );
};

export default QuizzesManagement;
