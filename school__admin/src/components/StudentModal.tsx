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
  'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5',
  'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'
];

const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];

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
                    <path d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
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
              <input type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Phone Number *</label>
              <input type="tel" value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Status *</label>
              <select 
                value={formData.status} 
                onChange={e => setFormData({...formData, status: e.target.value as 'active' | 'inactive' | 'pending'})}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid rgba(71, 85, 105, 0.5)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
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
              <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required minLength={6} />
            </div>
          )}

          {student && (
            <div className="form-group">
              <label>New Password (Leave empty to keep current)</label>
              <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} minLength={6} placeholder="Enter new password to change" />
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
                    currentGrade: {...formData.currentGrade, grade: newGrade},
                    passedGrades: validPassedGrades
                  });
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid rgba(71, 85, 105, 0.5)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '14px',
                  cursor: 'pointer',
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
                onChange={e => setFormData({...formData, currentGrade: {...formData.currentGrade, section: e.target.value}})}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid rgba(71, 85, 105, 0.5)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
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
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
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
                background: 'rgba(30, 41, 59, 0.3)',
                borderRadius: '8px',
                padding: '12px'
              }}>
                {getAvailablePassedGrades().map(grade => (
                  <div key={grade} style={{ marginBottom: '12px' }}>
                    <div style={{ color: '#cbd5e1', fontSize: '13px', marginBottom: '6px' }}>{grade}</div>
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
                              background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'rgba(71, 85, 105, 0.2)',
                              border: `1px solid ${isSelected ? '#3b82f6' : 'rgba(71, 85, 105, 0.5)'}`,
                              borderRadius: '6px',
                              color: isSelected ? '#3b82f6' : '#94a3b8',
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
