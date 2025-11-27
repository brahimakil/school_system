import React, { useState, useEffect } from 'react';
import { getAllHomeworks, deleteHomework, type Homework } from '../services/homeworks.api';
import { getAllClasses } from '../services/classes.api';
import { teachersAPI } from '../services/teachers.api';
import HomeworkModal from '../components/HomeworkModal';
import LoadingScreen from '../components/LoadingScreen';
import './ManagementPage.css';

const HomeworksManagement: React.FC = () => {
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [filteredHomeworks, setFilteredHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHomework, setEditingHomework] = useState<Homework | null>(null);
  const [viewMode, setViewMode] = useState(false);
  
  // Filters
  const [selectedTeacher, setSelectedTeacher] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedGrade, setSelectedGrade] = useState<string>('All');
  
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  useEffect(() => {
    fetchHomeworks();
    fetchClasses();
    fetchTeachers();
  }, []);

  useEffect(() => {
    filterHomeworks();
  }, [homeworks, selectedTeacher, selectedStatus, selectedGrade]);

  const fetchHomeworks = async () => {
    try {
      setLoading(true);
      const data = await getAllHomeworks();
      setHomeworks(data);
    } catch (error) {
      console.error('Error fetching homeworks:', error);
      alert('Failed to fetch homeworks');
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
      const teachersArray = response?.data || [];
      setTeachers(teachersArray);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  const filterHomeworks = () => {
    let filtered = [...homeworks];

    if (selectedTeacher !== 'All') {
      const teacherClassIds = classes
        .filter(cls => cls.teacherId === selectedTeacher)
        .map(cls => cls.id);
      filtered = filtered.filter(hw => teacherClassIds.includes(hw.classId));
    }

    if (selectedStatus !== 'All') {
      filtered = filtered.filter(hw => hw.status === selectedStatus);
    }

    if (selectedGrade !== 'All') {
      filtered = filtered.filter(hw => 
        hw.gradeSections.some(gs => gs.startsWith(`Grade ${selectedGrade}`))
      );
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
    if (window.confirm('Are you sure you want to delete this homework?')) {
      try {
        await deleteHomework(id);
        fetchHomeworks();
      } catch (error) {
        console.error('Error deleting homework:', error);
        alert('Failed to delete homework');
      }
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

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="management-page">
      <div className="page-header">
        <h1 className="page-title">Homeworks Management</h1>
        <button className="add-btn" onClick={handleAddHomework}>
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span>Add New Homework</span>
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
                  {teacher.fullName || teacher.name || 'Unnamed Teacher'}
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
              <option value="past_due">Past Due</option>
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
              <th>Due Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredHomeworks.length === 0 ? (
              <tr>
                <td colSpan={6} className="no-data">No homeworks found</td>
              </tr>
            ) : (
              filteredHomeworks.map((homework) => (
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
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      <button 
                        className="btn-edit"
                        onClick={() => handleEditHomework(homework)}
                        title="Edit"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button 
                        className="btn-delete"
                        onClick={() => handleDeleteHomework(homework.id)}
                        title="Delete"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
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
        <HomeworkModal
          homework={editingHomework}
          onClose={() => {
            setIsModalOpen(false);
            fetchHomeworks();
          }}
          viewMode={viewMode}
        />
      )}
    </div>
  );
};

export default HomeworksManagement;
