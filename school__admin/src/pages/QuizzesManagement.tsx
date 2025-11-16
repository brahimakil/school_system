import React, { useState, useEffect } from 'react';
import { getAllQuizzes, deleteQuiz, type Quiz } from '../services/quizzes.api';
import { getAllClasses } from '../services/classes.api';
import { teachersAPI } from '../services/teachers.api';
import QuizModal from '../components/QuizModal';
import './ManagementPage.css';

const QuizzesManagement: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [viewMode, setViewMode] = useState(false);
  
  // Filters
  const [selectedTeacher, setSelectedTeacher] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedGrade, setSelectedGrade] = useState<string>('All');
  
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  useEffect(() => {
    fetchQuizzes();
    fetchClasses();
    fetchTeachers();
  }, []);

  useEffect(() => {
    filterQuizzes();
  }, [quizzes, selectedTeacher, selectedStatus, selectedGrade]);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const data = await getAllQuizzes();
      setQuizzes(data);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      alert('Failed to fetch quizzes');
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
      // Backend returns { success: true, data: [...] }
      const teachersArray = response?.data || [];
      setTeachers(teachersArray);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  const filterQuizzes = () => {
    let filtered = [...quizzes];

    if (selectedTeacher !== 'All') {
      // Filter quizzes by teacher - find classes belonging to this teacher
      const teacherClassIds = classes
        .filter(cls => cls.teacherId === selectedTeacher)
        .map(cls => cls.id);
      filtered = filtered.filter(quiz => teacherClassIds.includes(quiz.classId));
    }

    if (selectedStatus !== 'All') {
      filtered = filtered.filter(quiz => quiz.status === selectedStatus);
    }

    if (selectedGrade !== 'All') {
      filtered = filtered.filter(quiz => 
        quiz.gradeSections.some(gs => gs.startsWith(`Grade ${selectedGrade}`))
      );
    }

    setFilteredQuizzes(filtered);
  };

  const handleAddQuiz = () => {
    setEditingQuiz(null);
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
      fetchQuizzes();
      alert('Quiz deleted successfully');
    } catch (error) {
      console.error('Error deleting quiz:', error);
      alert('Failed to delete quiz');
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingQuiz(null);
    fetchQuizzes();
  };

  const clearFilters = () => {
    setSelectedTeacher('All');
    setSelectedStatus('All');
    setSelectedGrade('All');
  };

  const hasActiveFilters = selectedTeacher !== 'All' || selectedStatus !== 'All' || selectedGrade !== 'All';

  // Get unique grades from quizzes
  const uniqueGrades = Array.from(new Set(
    quizzes.flatMap(quiz => 
      quiz.gradeSections.map(gs => gs.split(' - ')[0].replace('Grade ', ''))
    )
  )).sort();

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="management-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quizzes Management</h1>
          <p className="page-description">Create and manage quizzes for your classes</p>
        </div>
        <button onClick={handleAddQuiz} className="add-btn">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span>Create Quiz</span>
        </button>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Teacher</label>
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="filter-select"
            >
              <option value="All">All Teachers</option>
              {teachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>
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

          <div className="filter-group">
            <label>Grade</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="filter-select"
            >
              <option value="All">All Grades</option>
              {uniqueGrades.map(grade => (
                <option key={grade} value={grade}>Grade {grade}</option>
              ))}
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
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15848 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 17H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
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
                <th>Start Date/Time</th>
                <th>End Date/Time</th>
                <th>Duration</th>
                <th>Questions</th>
                <th>Total Marks</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuizzes.map((quiz) => (
                <tr key={quiz.id}>
                  <td>
                    <div className="font-medium">{quiz.title}</div>
                    <div className="text-sm text-gray-500">{quiz.description.substring(0, 50)}{quiz.description.length > 50 ? '...' : ''}</div>
                  </td>
                  <td>{quiz.className}</td>
                  <td>
                    <div className="grade-sections-list">
                      {quiz.gradeSections.map((gs, idx) => (
                        <span key={idx} className="badge badge-primary">
                          {gs}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>{formatDateTime(quiz.startDateTime)}</td>
                  <td>{formatDateTime(quiz.endDateTime)}</td>
                  <td>{quiz.quizDurationMinutes} min</td>
                  <td className="text-center font-semibold">{quiz.questions.length}</td>
                  <td className="text-center font-semibold">{quiz.totalMarks}</td>
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
                        <svg viewBox="0 0 24 24" fill="none">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleEditQuiz(quiz)}
                        className="btn-edit"
                        title="Edit quiz"
                      >
                        <svg viewBox="0 0 24 24" fill="none">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => quiz.id && handleDeleteQuiz(quiz.id)}
                        className="btn-delete"
                        title="Delete quiz"
                      >
                        <svg viewBox="0 0 24 24" fill="none">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
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
        />
      )}
    </div>
  );
};

export default QuizzesManagement;
