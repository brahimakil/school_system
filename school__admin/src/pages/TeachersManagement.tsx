import React, { useState, useEffect } from 'react';
import './ManagementPage.css';
import { teachersAPI } from '../services/teachers.api';
import { subjectsAPI } from '../api/subjects.api';
import type { Subject } from '../api/subjects.api';
import TeacherModal from '../components/TeacherModal';

interface Teacher {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  subjects: string[];
  status: 'active' | 'inactive' | 'pending';
  photoUrl?: string;
}

const TeachersManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsMap, setSubjectsMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | undefined>(undefined);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [teachersResponse, subjectsResponse] = await Promise.all([
        teachersAPI.getAll(),
        subjectsAPI.getAll()
      ]);
      setTeachers(teachersResponse.data || []);
      setSubjects(subjectsResponse);
      
      // Create a map of subject ID to subject name
      const map = new Map<string, string>();
      subjectsResponse.forEach((subject: Subject) => {
        map.set(subject.id, subject.name);
      });
      setSubjectsMap(map);
    } catch (error) {
      console.error('Error fetching data:', error);
      setTeachers([]);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    await fetchData();
  };

  const handleAddTeacher = () => {
    setSelectedTeacher(undefined);
    setIsModalOpen(true);
  };

  const handleEditTeacher = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsModalOpen(true);
  };

  const handleDeleteTeacher = async (id: string) => {
    try {
      await teachersAPI.delete(id);
      await fetchTeachers();
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting teacher:', error);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedTeacher(undefined);
  };

  const handleModalSuccess = () => {
    fetchTeachers();
    handleModalClose();
  };

  const filteredTeachers = teachers.filter(teacher => {
    const searchLower = searchTerm.toLowerCase();
    const teacherSubjects = teacher.subjects?.map(subId => subjectsMap.get(subId) || '').filter(Boolean) || [];
    return (
      teacher.fullName.toLowerCase().includes(searchLower) ||
      teacher.email.toLowerCase().includes(searchLower) ||
      teacherSubjects.some(subName => subName.toLowerCase().includes(searchLower))
    );
  });

  if (loading) {
    return (
      <div className="management-page">
        <div className="page-header">
          <h1 className="page-title">Teachers Management</h1>
          <p className="page-description">Loading teachers...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="management-page">
        <div className="page-header">
          <h1 className="page-title">Teachers Management</h1>
          <p className="page-description">Manage all teachers and their information</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-title">Total Teachers</span>
              <div className="stat-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2"/>
                  <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
            </div>
            <div className="stat-value">{teachers.length}</div>
            <div className="stat-change positive">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 19V5M5 12L12 5L19 12" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <span>Total registered</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-title">Active Teachers</span>
              <div className="stat-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
            </div>
            <div className="stat-value">
              {teachers.filter(t => t.status === 'active').length}
            </div>
            <div className="stat-change positive">
              <span>Currently teaching</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-title">Subjects</span>
              <div className="stat-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="2"/>
                  <path d="M6.5 2H20V22H6.5A2.5 2.5 0 0 1 4 19.5V4.5A2.5 2.5 0 0 1 6.5 2Z" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
            </div>
            <div className="stat-value">
              {subjects.length}
            </div>
            <div className="stat-change positive">
              <span>Total subjects</span>
            </div>
          </div>
        </div>

        <div className="page-actions">
          <div className="search-box">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
              <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <input
              type="text"
              placeholder="Search teachers by name, email, or subjects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="add-btn" onClick={handleAddTeacher}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>Add Teacher</span>
          </button>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Teacher</th>
                <th>Subjects</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    {searchTerm ? 'No teachers found matching your search' : 'No teachers added yet'}
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher) => (
                  <tr key={teacher.id}>
                    <td>
                      <div className="user-cell">
                        {teacher.photoUrl ? (
                          <img src={teacher.photoUrl} alt={teacher.fullName} className="user-avatar" style={{ borderRadius: '8px', objectFit: 'cover' }} />
                        ) : (
                          <div className="user-avatar">
                            {teacher.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                          </div>
                        )}
                        <div className="user-info">
                          <div className="user-name">{teacher.fullName}</div>
                          <div className="user-detail">ID: {teacher.id.substring(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {teacher.subjects?.slice(0, 2).map((subjectId, idx) => (
                          <span key={idx} style={{
                            padding: '4px 8px',
                            background: 'rgba(125, 211, 252, 0.2)',
                            border: '1px solid rgba(125, 211, 252, 0.4)',
                            borderRadius: '4px',
                            fontSize: '12px',
                            color: '#0c4a6e',
                            fontWeight: '500'
                          }}>
                            {subjectsMap.get(subjectId) || 'Unknown'}
                          </span>
                        ))}
                        {(teacher.subjects?.length || 0) > 2 && (
                          <span style={{
                            padding: '4px 8px',
                            background: 'rgba(100, 116, 139, 0.1)',
                            border: '1px solid rgba(100, 116, 139, 0.3)',
                            borderRadius: '4px',
                            fontSize: '12px',
                            color: '#64748b'
                          }}>
                            +{(teacher.subjects?.length || 0) - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{teacher.email}</td>
                    <td>{teacher.phoneNumber}</td>
                    <td>
                      <span className={`status-badge ${teacher.status}`}>
                        <span className="status-dot"></span>
                        {teacher.status.charAt(0).toUpperCase() + teacher.status.slice(1)}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="action-btn" title="Edit" onClick={() => handleEditTeacher(teacher)}>
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2"/>
                            <path d="M18.5 2.50023C18.8978 2.1024 19.4374 1.87891 20 1.87891C20.5626 1.87891 21.1022 2.1024 21.5 2.50023C21.8978 2.89805 22.1213 3.43762 22.1213 4.00023C22.1213 4.56284 21.8978 5.1024 21.5 5.50023L12 15.0002L8 16.0002L9 12.0002L18.5 2.50023Z" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                        </button>
                        <button 
                          className="action-btn delete" 
                          title="Delete"
                          onClick={() => setDeleteConfirmId(teacher.id)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
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
      </div>

      {isModalOpen && (
        <TeacherModal
          teacher={selectedTeacher}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}

      {deleteConfirmId && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Confirm Delete</h2>
              <button className="modal-close" onClick={() => setDeleteConfirmId(null)}>×</button>
            </div>
            <div className="modal-form">
              <p style={{ color: '#cbd5e1', marginBottom: '24px' }}>
                Are you sure you want to delete this teacher? This action cannot be undone.
              </p>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setDeleteConfirmId(null)}>
                  Cancel
                </button>
                <button 
                  className="btn-submit" 
                  style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                  onClick={() => handleDeleteTeacher(deleteConfirmId)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TeachersManagement;
