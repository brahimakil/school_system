import React, { useState, useEffect } from 'react';
import './TeacherModal.css';
import { teachersAPI } from '../services/teachers.api';
import { subjectsAPI } from '../api/subjects.api';
import type { Subject } from '../api/subjects.api';

interface Teacher {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  subjects: string[];
  status: 'active' | 'inactive' | 'pending';
  photoUrl?: string;
}

interface TeacherModalProps {
  teacher?: Teacher;
  onClose: () => void;
  onSuccess: () => void;
}

const TeacherModal: React.FC<TeacherModalProps> = ({ teacher, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phoneNumber: '',
    subjects: [] as string[],
    status: 'active' as 'active' | 'inactive' | 'pending',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const subjects = await subjectsAPI.getAll();
      setAvailableSubjects(subjects);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  useEffect(() => {
    if (teacher) {
      setFormData({
        fullName: teacher.fullName || '',
        email: teacher.email || '',
        password: '',
        phoneNumber: teacher.phoneNumber || '',
        subjects: teacher.subjects || [],
        status: teacher.status || 'active',
      });
      setPhotoPreview(teacher.photoUrl || '');
    } else {
      resetForm();
    }
  }, [teacher]);

  const resetForm = () => {
    setFormData({ fullName: '', email: '', password: '', phoneNumber: '', subjects: [], status: 'active' });
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

  const toggleSubject = (subjectId: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subjectId)
        ? prev.subjects.filter(s => s !== subjectId)
        : [...prev.subjects, subjectId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.email || (!teacher && !formData.password) || !formData.phoneNumber || formData.subjects.length === 0) {
      alert('Please fill in all required fields and select at least one subject');
      return;
    }

    setLoading(true);
    try {
      if (teacher) {
        const data = new FormData();
        data.append('fullName', formData.fullName);
        data.append('email', formData.email);
        if (formData.password) data.append('password', formData.password);
        data.append('phoneNumber', formData.phoneNumber);
        data.append('subjects', JSON.stringify(formData.subjects));
        data.append('status', formData.status);
        if (photoFile) data.append('photo', photoFile);

        await teachersAPI.update(teacher.id, data);
      } else {
        const data = new FormData();
        data.append('fullName', formData.fullName);
        data.append('email', formData.email);
        data.append('password', formData.password);
        data.append('phoneNumber', formData.phoneNumber);
        data.append('subjects', JSON.stringify(formData.subjects));
        data.append('status', formData.status);
        if (photoFile) data.append('photo', photoFile);

        await teachersAPI.create(data);
      }
      resetForm();
      onSuccess();
    } catch (error: any) {
      console.error('Error saving teacher:', error);
      const errorMessage = 
        error.response?.data?.message || 
        error.response?.data?.error ||
        error.message || 
        'Failed to save teacher';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{teacher ? 'Edit Teacher' : 'Add New Teacher'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="photo-upload-section">
            <div className="photo-preview">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" />
              ) : (
                <div className="photo-placeholder">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
              )}
            </div>
            <label className="photo-upload-btn">
              <input type="file" accept="image/*" onChange={handlePhotoChange} />
              Choose Photo
            </label>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Full Name *</label>
              <input type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email *</label>
              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Phone Number *</label>
              <input type="tel" value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} required />
            </div>
          </div>

          {!teacher && (
            <div className="form-group">
              <label>Password *</label>
              <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required minLength={6} />
            </div>
          )}

          {teacher && (
            <div className="form-group">
              <label>New Password (Leave empty to keep current)</label>
              <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} minLength={6} placeholder="Enter new password to change" />
            </div>
          )}

          <div className="form-group">
            <label>Status *</label>
            <select 
              value={formData.status} 
              onChange={e => setFormData({...formData, status: e.target.value as 'active' | 'inactive' | 'pending'})}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div className="form-group">
            <label>Subjects * (Select one or more)</label>
            {availableSubjects.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '14px' }}>Loading subjects...</p>
            ) : (
              <div className="subjects-grid">
                {availableSubjects.map(subject => (
                  <button 
                    key={subject.id} 
                    type="button" 
                    className={`subject-tag ${formData.subjects.includes(subject.id) ? 'selected' : ''}`} 
                    onClick={() => toggleSubject(subject.id)}
                  >
                    {subject.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn-submit" disabled={loading || formData.subjects.length === 0}>
              {loading ? 'Saving...' : teacher ? 'Update Teacher' : 'Add Teacher'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeacherModal;
