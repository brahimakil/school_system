import React, { useState, useEffect } from 'react';
import { createHomework, updateHomework, type Homework } from '../services/homeworks.api';
import { getAllClasses, type Class } from '../services/classes.api';
import { teachersAPI } from '../services/teachers.api';
import { subjectsAPI } from '../api/subjects.api';
import './TeacherModal.css';

interface HomeworkModalProps {
  homework: Homework | null;
  onClose: () => void;
  viewMode?: boolean;
}

const HomeworkModal: React.FC<HomeworkModalProps> = ({ homework, onClose, viewMode = false }) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedGradeSections, setSelectedGradeSections] = useState<string[]>([]);
  const [subjectName, setSubjectName] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<'pending' | 'active' | 'completed' | 'past_due'>('pending');

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (homework && classes.length > 0) {
      // Populate form with existing homework data
      const homeworkClass = classes.find(c => c.id === homework.classId);
      if (homeworkClass) {
        setSelectedTeacherId(homeworkClass.teacherId);
      }
      setSelectedClassId(homework.classId);
      setSelectedGradeSections(homework.gradeSections);
      setSubjectName(homework.subject);
      setTitle(homework.title);
      setDescription(homework.description);
      setDueDate(homework.dueDate);
      setStatus(homework.status);
    }
  }, [homework, classes]);

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

  const fetchSubjects = async () => {
    try {
      const data = await subjectsAPI.getAll();
      setSubjects(data);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  // Auto-populate subject when teacher is selected
  useEffect(() => {
    if (selectedTeacherId && teachers.length > 0 && subjects.length > 0) {
      const teacher = teachers.find(t => t.id === selectedTeacherId);
      if (teacher && teacher.subjects && teacher.subjects.length > 0) {
        // Assuming teacher has one main subject or we pick the first one
        // In a real app, we might need a dropdown if teacher has multiple subjects
        const subjectId = teacher.subjects[0];
        const subject = subjects.find(s => s.id === subjectId);
        if (subject) {
          setSubjectName(subject.name);
        }
      } else {
        setSubjectName('');
      }
    } else if (!selectedTeacherId) {
      setSubjectName('');
    }
  }, [selectedTeacherId, teachers, subjects]);

  // Filter classes by selected teacher
  const teacherClasses = selectedTeacherId 
    ? classes.filter(c => c.teacherId === selectedTeacherId)
    : [];

  // Group teacher's classes by className to avoid duplicates
  const uniqueTeacherClasses = Array.from(
    new Map(teacherClasses.map(cls => [
      cls.className,
      cls
    ])).values()
  );

  // Get grade/sections for selected class
  const availableGradeSections = selectedClassId 
    ? classes.find(c => c.id === selectedClassId)?.gradeSections || []
    : [];

  const handleGradeSectionToggle = (gsString: string) => {
    if (viewMode) return;
    setSelectedGradeSections(prev => {
      if (prev.includes(gsString)) {
        return prev.filter(gs => gs !== gsString);
      } else {
        return [...prev, gsString];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClassId) {
      alert('Please select a class');
      return;
    }

    if (selectedGradeSections.length === 0) {
      alert('Please select at least one grade/section');
      return;
    }

    if (!title.trim()) {
      alert('Please enter a homework title');
      return;
    }

    if (!dueDate) {
      alert('Please set a due date');
      return;
    }

    const selectedClassName = classes.find(c => c.id === selectedClassId)?.className || '';

    const homeworkData = {
      classId: selectedClassId,
      className: selectedClassName,
      gradeSections: selectedGradeSections,
      subject: subjectName,
      title,
      description,
      dueDate,
      status
    };

    try {
      setLoading(true);
      if (homework) {
        await updateHomework(homework.id, homeworkData);
      } else {
        await createHomework(homeworkData);
      }
      onClose();
    } catch (error) {
      console.error('Error saving homework:', error);
      alert('Failed to save homework');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{viewMode ? 'View Homework' : (homework ? 'Edit Homework' : 'Add New Homework')}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Teacher Selection */}
          <div className="form-group">
            <label className="form-label required">Select Teacher</label>
            <select
              value={selectedTeacherId}
              onChange={(e) => {
                setSelectedTeacherId(e.target.value);
                setSelectedClassId('');
                setSelectedGradeSections([]);
              }}
              required
              disabled={viewMode || !!homework} // Disable if editing existing homework (to simplify)
            >
              <option value="">Choose a teacher</option>
              {teachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.fullName || teacher.name || 'Unnamed Teacher'}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Display */}
          {selectedTeacherId && subjectName && (
            <div className="form-group">
              <label className="form-label">Subject</label>
              <input
                type="text"
                value={subjectName}
                disabled
                style={{ 
                  backgroundColor: '#f1f5f9', 
                  color: '#64748b',
                  cursor: 'not-allowed'
                }}
              />
            </div>
          )}

          {/* Class Selection */}
          {selectedTeacherId && uniqueTeacherClasses.length > 0 && (
            <div className="form-group">
              <label className="form-label required">Select Class</label>
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedGradeSections([]);
                }}
                required
                disabled={viewMode}
              >
                <option value="">Choose a class</option>
                {uniqueTeacherClasses.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.className}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Grade/Section Selection */}
          {selectedClassId && availableGradeSections.length > 0 && (
            <div className="form-group">
              <label className="form-label required">Select Grades/Sections</label>
              <div className="grade-section-checkboxes">
                {availableGradeSections.map((gs, idx) => {
                  const gsString = `Grade ${gs.grade} - Section ${gs.section}`;
                  return (
                    <label key={idx} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedGradeSections.includes(gsString)}
                        onChange={() => handleGradeSectionToggle(gsString)}
                        disabled={viewMode}
                      />
                      <span>{gsString}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Homework Title */}
          <div className="form-group">
            <label className="form-label required">Homework Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Chapter 5 Exercises"
              required
              readOnly={viewMode}
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Description / Instructions</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter detailed instructions..."
              rows={4}
              readOnly={viewMode}
            />
          </div>

          {/* Due Date */}
          <div className="form-group">
            <label className="form-label required">Due Date</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              readOnly={viewMode}
            />
          </div>

          {/* Status */}
          <div className="form-group">
            <label className="form-label required">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              required
              disabled={viewMode}
            >
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="past_due">Past Due</option>
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              {viewMode ? 'Close' : 'Cancel'}
            </button>
            {!viewMode && (
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Saving...' : (homework ? 'Update Homework' : 'Create Homework')}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default HomeworkModal;
