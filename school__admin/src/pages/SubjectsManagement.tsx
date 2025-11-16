import React, { useState, useEffect } from 'react';
import './ManagementPage.css';
import { subjectsAPI } from '../api/subjects.api';
import { teachersAPI } from '../services/teachers.api';
import type { Subject } from '../api/subjects.api';
import SubjectModal from '../components/SubjectModal';

interface Teacher {
  id: string;
  fullName: string;
  email: string;
  subjects: string[];
}

const SubjectsManagement: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewTeachersSubjectId, setViewTeachersSubjectId] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  useEffect(() => {
    fetchSubjects();
    fetchTeachers();
  }, []);

  const fetchSubjects = async () => {
    try {
      const data = await subjectsAPI.getAll();
      setSubjects(data);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await teachersAPI.getAll();
      setTeachers(response.data || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  const handleViewTeachers = (subjectId: string) => {
    setViewTeachersSubjectId(subjectId);
  };

  const handleAddSubject = () => {
    setSelectedSubject(null);
    setIsModalOpen(true);
  };

  const handleEditSubject = (subject: Subject) => {
    setSelectedSubject(subject);
    setIsModalOpen(true);
  };

  const handleDeleteSubject = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this subject?')) {
      try {
        await subjectsAPI.delete(id);
        fetchSubjects();
      } catch (error) {
        console.error('Error deleting subject:', error);
        alert('Failed to delete subject');
      }
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      if (selectedSubject) {
        await subjectsAPI.update(selectedSubject.id, data);
      } else {
        await subjectsAPI.create(data);
      }
      fetchSubjects();
    } catch (error) {
      console.error('Error saving subject:', error);
      alert('Failed to save subject');
    }
  };

  const filteredSubjects = subjects.filter(
    (subject) =>
      subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="management-page">
        <div className="page-header">
          <h1 className="page-title">Subjects Management</h1>
          <p className="page-description">Loading subjects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="management-page">
      <div className="page-header">
        <h1 className="page-title">Subjects Management</h1>
        <p className="page-description">Manage all subjects in the school</p>
      </div>

      <div className="page-actions">
        <div className="search-box">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <input
            type="text"
            placeholder="Search subjects by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="add-btn" onClick={handleAddSubject}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span>Add Subject</span>
        </button>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Description</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubjects.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                  No subjects found
                </td>
              </tr>
            ) : (
              filteredSubjects.map((subject) => (
                <tr key={subject.id}>
                  <td>
                    <span className="subject-code">{subject.code}</span>
                  </td>
                  <td>{subject.name}</td>
                  <td>{subject.description || '-'}</td>
                  <td>{new Date(subject.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="action-btn"
                        title="View Teachers"
                        onClick={() => handleViewTeachers(subject.id)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2"/>
                          <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="currentColor" strokeWidth="2"/>
                          <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2"/>
                          <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      </button>
                      <button
                        className="action-btn"
                        title="Edit"
                        onClick={() => handleEditSubject(subject)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2"/>
                          <path d="M18.5 2.50023C18.8978 2.1024 19.4374 1.87891 20 1.87891C20.5626 1.87891 21.1022 2.1024 21.5 2.50023C21.8978 2.89805 22.1213 3.43762 22.1213 4.00023C22.1213 4.56284 21.8978 5.1024 21.5 5.50023L12 15.0002L8 16.0002L9 12.0002L18.5 2.50023Z" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      </button>
                      <button
                        className="action-btn delete"
                        title="Delete"
                        onClick={() => handleDeleteSubject(subject.id)}
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

      <SubjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        subject={selectedSubject}
      />

      {viewTeachersSubjectId && (
        <div className="modal-overlay" onClick={() => setViewTeachersSubjectId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Teachers for {subjects.find(s => s.id === viewTeachersSubjectId)?.name}</h2>
              <button className="modal-close" onClick={() => setViewTeachersSubjectId(null)}>×</button>
            </div>
            <div className="modal-form">
              {teachers.filter(t => t.subjects?.includes(viewTeachersSubjectId)).length === 0 ? (
                <p style={{ color: '#1e293b', textAlign: 'center', padding: '2rem' }}>No teachers assigned to this subject</p>
              ) : (
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {teachers
                    .filter(t => t.subjects?.includes(viewTeachersSubjectId))
                    .map(teacher => (
                      <div key={teacher.id} style={{
                        padding: '12px',
                        marginBottom: '8px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}>
                        <div style={{ fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>
                          {teacher.fullName}
                        </div>
                        <div style={{ fontSize: '14px', color: '#64748b' }}>
                          {teacher.email}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectsManagement;
