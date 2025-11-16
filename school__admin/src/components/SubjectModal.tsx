import React, { useState, useEffect } from 'react';
import type { Subject, CreateSubjectData, UpdateSubjectData } from '../api/subjects.api';
import './TeacherModal.css';

interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateSubjectData | UpdateSubjectData) => void;
  subject?: Subject | null;
}

const SubjectModal: React.FC<SubjectModalProps> = ({ isOpen, onClose, onSubmit, subject }) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
  });

  useEffect(() => {
    if (subject) {
      setFormData({
        name: subject.name,
        code: subject.code,
        description: subject.description || '',
      });
    } else {
      setFormData({
        name: '',
        code: '',
        description: '',
      });
    }
  }, [subject]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{subject ? 'Edit Subject' : 'Add New Subject'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Subject Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., Mathematics, English, Science"
            />
          </div>
          <div className="form-group">
            <label>Subject Code *</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
              placeholder="e.g., MATH101, ENG-2A, sci-1a"
              maxLength={20}
              pattern="[A-Za-z0-9\-]+"
              title="Letters, numbers, and dashes only"
            />
          </div>
          <div className="form-group">
            <label>Description (Optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the subject"
              rows={3}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-submit">
              {subject ? 'Update Subject' : 'Add Subject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubjectModal;
