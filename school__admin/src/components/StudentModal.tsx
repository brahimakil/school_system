import React, { useState, useEffect } from 'react';
import './TeacherModal.css';
import { studentsAPI } from '../services/students.api';

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

interface StudentModalProps {
  student?: Student;
  onClose: () => void;
  onSuccess: () => void;
}

const GRADES = [
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5',
  'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'
];

const SECTIONS = ['A', 'B', 'C'];

const StudentModal: React.FC<StudentModalProps> = ({ student, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phoneNumber: '',
    currentGrade: { grade: '', section: '' },
    passedGrades: [] as GradeSection[],
    status: 'active' as 'active' | 'inactive' | 'pending',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassedGrades, setShowPassedGrades] = useState(false);

  useEffect(() => {
    if (student) {
      setFormData({
        fullName: student.fullName || '',
        email: student.email || '',
        password: '',
        phoneNumber: student.phoneNumber || '',
        currentGrade: student.currentGrade || { grade: '', section: '' },
        passedGrades: student.passedGrades || [],
        status: student.status || 'active',
      });
      setPhotoPreview(student.photoUrl || '');
    } else {
      resetForm();
    }
  }, [student]);

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      password: '',
      phoneNumber: '',
      currentGrade: { grade: '', section: '' },
      passedGrades: [],
      status: 'active'
    });
    setPhotoFile(null);
    setPhotoPreview('');
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const togglePassedGrade = (grade: string, section: string) => {
    setFormData(prev => {
      // Remove any existing section for this grade
      const withoutThisGrade = prev.passedGrades.filter(g => g.grade !== grade);

      // Check if this exact grade-section combo was already selected
      const wasSelected = prev.passedGrades.some(g => g.grade === grade && g.section === section);

      if (wasSelected) {
        // If it was selected, remove it (deselect)
        return {
          ...prev,
          passedGrades: withoutThisGrade
        };
      } else {
        // If it wasn't selected, add it (replacing any other section for this grade)
        return {
          ...prev,
          passedGrades: [...withoutThisGrade, { grade, section }]
        };
      }
    });
  };

  // Get grades that should be shown in passed grades (only grades before current grade)
  const getAvailablePassedGrades = () => {
    if (!formData.currentGrade.grade) return [];
    const currentIndex = GRADES.indexOf(formData.currentGrade.grade);
    if (currentIndex <= 0) return [];
    return GRADES.slice(0, currentIndex);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || (!student && !formData.password) || !formData.phoneNumber || !formData.currentGrade.grade || !formData.currentGrade.section) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      data.append('fullName', formData.fullName);
      data.append('email', formData.email);
      if (formData.password) data.append('password', formData.password);
      data.append('phoneNumber', formData.phoneNumber);
      data.append('currentGrade', JSON.stringify(formData.currentGrade));
      data.append('passedGrades', JSON.stringify(formData.passedGrades));
      data.append('status', formData.status);
      if (photoFile) data.append('photo', photoFile);

      if (student) {
        await studentsAPI.update(student.id, data);
      } else {
        await studentsAPI.create(data);
      }
      resetForm();
      onSuccess();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save student');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{student ? 'Edit Student' : 'Add New Student'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="photo-upload-section">
            <div className="photo-preview">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" />
              ) : (
                <div className="photo-placeholder">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21" stroke="currentColor" strokeWidth="2" />
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </div>
              )}
            </div>
            <label className="photo-upload-btn">
              Choose Photo
              <input type="file" accept="image/*" onChange={handlePhotoChange} />
            </label>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Full Name *</label>
              <input type="text" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Phone Number *</label>
              <input type="tel" value={formData.phoneNumber} onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Status *</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'pending' })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          {!student && (
            <div className="form-group">
              <label>Password *</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
                    let password = '';
                    for (let i = 0; i < 8; i++) {
                      password += chars.charAt(Math.floor(Math.random() * chars.length));
                    }
                    setFormData({ ...formData, password });
                  }}
                  style={{
                    padding: '8px 12px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '44px',
                  }}
                  title="Generate Random Password"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 4V9H4.582M4.582 9C5.24585 7.35812 6.43568 5.9829 7.96503 5.08985C9.49438 4.1968 11.2768 3.8364 13.033 4.06513C14.7891 4.29386 16.4198 5.09878 17.6694 6.35377C18.919 7.60875 19.7168 9.24285 19.938 11M4.582 9H9M20 20V15H19.418M19.418 15C18.7542 16.6419 17.5643 18.0171 16.035 18.9101C14.5056 19.8032 12.7232 20.1636 10.967 19.9349C9.21089 19.7061 7.58016 18.9012 6.33057 17.6462C5.08097 16.3913 4.28318 14.7572 4.062 13M19.418 15H15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {student && (
            <div className="form-group">
              <label>New Password (Leave empty to keep current)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  minLength={6}
                  placeholder="Enter new password to change"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
                    let password = '';
                    for (let i = 0; i < 8; i++) {
                      password += chars.charAt(Math.floor(Math.random() * chars.length));
                    }
                    setFormData({ ...formData, password });
                  }}
                  style={{
                    padding: '8px 12px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '44px',
                  }}
                  title="Generate Random Password"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 4V9H4.582M4.582 9C5.24585 7.35812 6.43568 5.9829 7.96503 5.08985C9.49438 4.1968 11.2768 3.8364 13.033 4.06513C14.7891 4.29386 16.4198 5.09878 17.6694 6.35377C18.919 7.60875 19.7168 9.24285 19.938 11M4.582 9H9M20 20V15H19.418M19.418 15C18.7542 16.6419 17.5643 18.0171 16.035 18.9101C14.5056 19.8032 12.7232 20.1636 10.967 19.9349C9.21089 19.7061 7.58016 18.9012 6.33057 17.6462C5.08097 16.3913 4.28318 14.7572 4.062 13M19.418 15H15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Current Grade *</label>
            <div className="form-row">
              <select
                value={formData.currentGrade.grade}
                onChange={e => {
                  const newGrade = e.target.value;
                  const newGradeIndex = GRADES.indexOf(newGrade);

                  // Filter out passed grades that are >= new current grade
                  const validPassedGrades = formData.passedGrades.filter(pg => {
                    const passedIndex = GRADES.indexOf(pg.grade);
                    return passedIndex < newGradeIndex;
                  });

                  setFormData({
                    ...formData,
                    currentGrade: { ...formData.currentGrade, grade: newGrade },
                    passedGrades: validPassedGrades
                  });
                }}
                required
              >
                <option value="">Select Grade</option>
                {GRADES.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
              <select
                value={formData.currentGrade.section}
                onChange={e => setFormData({ ...formData, currentGrade: { ...formData.currentGrade, section: e.target.value } })}
                required
              >
                <option value="">Section</option>
                {SECTIONS.map(section => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label>Passed Grades (Optional)</label>
              <button
                type="button"
                onClick={() => setShowPassedGrades(!showPassedGrades)}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  borderRadius: '6px',
                  color: '#3b82f6',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                {showPassedGrades ? 'Hide' : 'Add Passed Grades'} ({formData.passedGrades.length})
              </button>
            </div>

            {showPassedGrades && (
              <div style={{
                maxHeight: '200px',
                overflowY: 'auto',
                background: 'rgba(241, 245, 249, 0.5)',
                borderRadius: '8px',
                padding: '12px'
              }}>
                {getAvailablePassedGrades().map(grade => (
                  <div key={grade} style={{ marginBottom: '12px' }}>
                    <div style={{ color: '#475569', fontSize: '13px', marginBottom: '6px', fontWeight: '500' }}>{grade}</div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {SECTIONS.map(section => {
                        const isSelected = formData.passedGrades.some(g => g.grade === grade && g.section === section);
                        return (
                          <button
                            key={section}
                            type="button"
                            onClick={() => togglePassedGrade(grade, section)}
                            style={{
                              padding: '6px 12px',
                              background: isSelected ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.8)',
                              border: `1px solid ${isSelected ? '#3b82f6' : 'rgba(148, 163, 184, 0.4)'}`,
                              borderRadius: '6px',
                              color: isSelected ? '#3b82f6' : '#64748b',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            {section}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Saving...' : student ? 'Update Student' : 'Add Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentModal;
