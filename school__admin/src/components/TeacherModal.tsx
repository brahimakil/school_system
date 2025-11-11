import React, { useState, useEffect } from 'react';
import './TeacherModal.css';
import { teachersAPI } from '../services/teachers.api';

interface Teacher {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  professions: string[];
  status: 'active' | 'inactive' | 'pending';
  photoUrl?: string;
}

interface TeacherModalProps {
  teacher?: Teacher;
  onClose: () => void;
  onSuccess: () => void;
}

const PROFESSIONS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 
  'History', 'Geography', 'Computer Science', 'Physical Education',
  'Art', 'Music', 'Economics'
];

const TeacherModal: React.FC<TeacherModalProps> = ({ teacher, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phoneNumber: '',
    professions: [] as string[],
    status: 'active' as 'active' | 'inactive' | 'pending',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (teacher) {
      setFormData({
        fullName: teacher.fullName || '',
        email: teacher.email || '',
        password: '',
        phoneNumber: teacher.phoneNumber || '',
        professions: teacher.professions || [],
        status: teacher.status || 'active',
      });
      setPhotoPreview(teacher.photoUrl || '');
    } else {
      resetForm();
    }
  }, [teacher]);

  const resetForm = () => {
    setFormData({ fullName: '', email: '', password: '', phoneNumber: '', professions: [], status: 'active' });
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

  const toggleProfession = (profession: string) => {
    setFormData(prev => ({
      ...prev,
      professions: prev.professions.includes(profession)
        ? prev.professions.filter(p => p !== profession)
        : [...prev.professions, profession]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || (!teacher && !formData.password) || !formData.phoneNumber || formData.professions.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      if (teacher) {
        // Edit mode
        const data = new FormData();
        data.append('fullName', formData.fullName);
        data.append('email', formData.email);
        if (formData.password) data.append('password', formData.password);
        data.append('phoneNumber', formData.phoneNumber);
        data.append('professions', JSON.stringify(formData.professions));
        data.append('status', formData.status);
        if (photoFile) data.append('photo', photoFile);

        await teachersAPI.update(teacher.id, data);
      } else {
        // Add mode
        const data = new FormData();
        data.append('fullName', formData.fullName);
        data.append('email', formData.email);
        data.append('password', formData.password);
        data.append('phoneNumber', formData.phoneNumber);
        data.append('professions', JSON.stringify(formData.professions));
        data.append('status', formData.status);
        if (photoFile) data.append('photo', photoFile);

        await teachersAPI.create(data);
      }
      resetForm();
      onSuccess();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save teacher');
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

          <div className="form-group">
            <label>Professions * (Select one or more)</label>
            <div className="professions-grid">
              {PROFESSIONS.map(prof => (
                <button key={prof} type="button" className={`profession-tag ${formData.professions.includes(prof) ? 'selected' : ''}`} onClick={() => toggleProfession(prof)}>
                  {prof}
                </button>
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn-submit" disabled={loading || formData.professions.length === 0}>
              {loading ? 'Saving...' : teacher ? 'Update Teacher' : 'Add Teacher'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeacherModal;
