import React, { useState, useEffect } from 'react';
import './ManagementPage.css';
import { studentsAPI } from '../services/students.api';
import StudentModal from '../components/StudentModal';

interface GradeSection {
  grade: string;
  section: string;
}

interface Student {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  currentGrade: GradeSection;
  passedGrades: GradeSection[];
  status: 'active' | 'inactive' | 'pending';
  photoUrl?: string;
}

const StudentsManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | undefined>(undefined);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await studentsAPI.getAll();
      setStudents(response.data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = () => {
    setSelectedStudent(undefined);
    setIsModalOpen(true);
  };

  const handleEditStudent = (student: Student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  const handleDeleteStudent = async (id: string) => {
    try {
      await studentsAPI.delete(id);
      await fetchStudents();
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting student:', error);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedStudent(undefined);
  };

  const handleModalSuccess = () => {
    fetchStudents();
    handleModalClose();
  };

  const filteredStudents = students.filter(student =>
    student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.currentGrade.grade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="management-page">
        <div className="page-header">
          <h1 className="page-title">Students Management</h1>
          <p className="page-description">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="management-page">
        <div className="page-header">
          <h1 className="page-title">Students Management</h1>
          <p className="page-description">Manage all students and their information</p>
        </div>

     
        <div className="page-actions">
          <div className="search-box">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
              <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <input
              type="text"
              placeholder="Search students by name, email, or grade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="add-btn" onClick={handleAddStudent}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>Add Student</span>
          </button>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Current Grade</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    {searchTerm ? 'No students found matching your search' : 'No students added yet'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <div className="user-cell">
                        {student.photoUrl ? (
                          <img src={student.photoUrl} alt={student.fullName} className="user-avatar" style={{ borderRadius: '8px', objectFit: 'cover' }} />
                        ) : (
                          <div className="user-avatar">
                            {student.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                          </div>
                        )}
                        <div className="user-info">
                          <div className="user-name">{student.fullName}</div>
                          <div className="user-detail">ID: {student.id.substring(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          padding: '6px 12px',
                          background: 'rgba(59, 130, 246, 0.1)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#3b82f6'
                        }}>
                          {student.currentGrade.grade} - {student.currentGrade.section}
                        </span>
                        {student.passedGrades.length > 0 && (
                          <span style={{
                            padding: '4px 8px',
                            background: 'rgba(100, 116, 139, 0.1)',
                            border: '1px solid rgba(100, 116, 139, 0.3)',
                            borderRadius: '4px',
                            fontSize: '11px',
                            color: '#64748b'
                          }} title={`Passed: ${student.passedGrades.map(g => `${g.grade}-${g.section}`).join(', ')}`}>
                            +{student.passedGrades.length} passed
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{student.email}</td>
                    <td>{student.phoneNumber}</td>
                    <td>
                      <span className={`status-badge ${student.status}`}>
                        <span className="status-dot"></span>
                        {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="action-btn" title="Edit" onClick={() => handleEditStudent(student)}>
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2"/>
                            <path d="M18.5 2.50023C18.8978 2.1024 19.4374 1.87891 20 1.87891C20.5626 1.87891 21.1022 2.1024 21.5 2.50023C21.8978 2.89805 22.1213 3.43762 22.1213 4.00023C22.1213 4.56284 21.8978 5.1024 21.5 5.50023L12 15.0002L8 16.0002L9 12.0002L18.5 2.50023Z" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                        </button>
                        <button 
                          className="action-btn delete" 
                          title="Delete"
                          onClick={() => setDeleteConfirmId(student.id)}
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
        <StudentModal
          student={selectedStudent}
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
                Are you sure you want to delete this student? This action cannot be undone.
              </p>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setDeleteConfirmId(null)}>
                  Cancel
                </button>
                <button 
                  className="btn-submit" 
                  style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                  onClick={() => handleDeleteStudent(deleteConfirmId)}
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

export default StudentsManagement;
