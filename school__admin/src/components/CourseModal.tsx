import React, { useState, useEffect } from 'react';
import { createCourse, updateCourse, type Course } from '../services/courses.api';
import { getAllClasses, type Class } from '../services/classes.api';
import { teachersAPI } from '../services/teachers.api';
import { subjectsAPI } from '../api/subjects.api';
import './TeacherModal.css';

interface CourseModalProps {
  course: Course | null;
  onClose: () => void;
  viewMode?: boolean;
}

const CourseModal: React.FC<CourseModalProps> = ({ course, onClose, viewMode = false }) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedGradeSections, setSelectedGradeSections] = useState<string[]>([]);
  const [subjectName, setSubjectName] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'pending' | 'active' | 'completed' | 'overdue'>('pending');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentType, setAttachmentType] = useState<'video' | 'pdf' | 'image' | 'other'>('other');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentFileName, setAttachmentFileName] = useState<string>('');

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (course && classes.length > 0) {
      const courseClass = classes.find(c => c.id === course.classId);
      if (courseClass) {
        setSelectedTeacherId(courseClass.teacherId);
      }
      setSelectedClassId(course.classId || '');
      setSelectedGradeSections(course.gradeSections || []);
      setSubjectName(course.subject || '');
      setTitle(course.title || '');
      setDescription(course.description || '');
      setStatus(course.status || 'pending');
      setAttachmentUrl(course.attachmentUrl || '');
      setAttachmentType(course.attachmentType || 'other');
      if (course.attachmentUrl) {
        const urlParts = course.attachmentUrl.split('/');
        setAttachmentFileName(decodeURIComponent(urlParts[urlParts.length - 1].split('?')[0]));
      }
    }
  }, [course, classes]);

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
      setTeachers(response?.data || []);
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

  // Filter classes based on selected teacher
  const teacherClasses = classes.filter(cls => cls.teacherId === selectedTeacherId);

  // Group classes by className and collect all schedules
  const classesWithSchedules = teacherClasses.reduce((acc, cls) => {
    const existing = acc.find(c => c.className === cls.className);
    const schedule = { id: cls.id, day: cls.dayOfWeek, start: cls.startTime, end: cls.endTime };
    if (existing) {
      existing.schedules.push(schedule);
    } else {
      acc.push({
        className: cls.className,
        gradeSections: cls.gradeSections,
        schedules: [schedule]
      });
    }
    return acc;
  }, [] as { className: string; gradeSections: any[]; schedules: { id: string; day: string; start: string; end: string }[] }[]);

  // Get available grade/sections from selected class
  const selectedClass = classes.find(c => c.id === selectedClassId);
  const availableGradeSections = selectedClass?.gradeSections || [];

  // Auto-set subject when teacher is selected
  useEffect(() => {
    if (selectedTeacherId && teachers.length > 0 && subjects.length > 0) {
      const teacher = teachers.find(t => t.id === selectedTeacherId);
      if (teacher && teacher.subjects && teacher.subjects.length > 0) {
        // If teacher has only one subject, auto-select it
        if (teacher.subjects.length === 1) {
          const subjectId = teacher.subjects[0];
          const subject = subjects.find(s => s.id === subjectId || s.name === subjectId);
          if (subject) {
            setSelectedSubjectId(subject.id);
            setSubjectName(subject.name);
          }
        } else {
          // Multiple subjects - require user to select (unless editing)
          if (!course) {
            setSelectedSubjectId('');
            setSubjectName('');
          }
        }
      } else {
        setSelectedSubjectId('');
        setSubjectName('');
      }
    } else if (!selectedTeacherId) {
      setSelectedSubjectId('');
      setSubjectName('');
    }
  }, [selectedTeacherId, teachers, subjects]);

  // Get teacher's available subjects
  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);
  const teacherSubjectIds = selectedTeacher?.subjects || [];
  const teacherAvailableSubjects = subjects.filter(s => 
    teacherSubjectIds.includes(s.id) || teacherSubjectIds.includes(s.name)
  );

  // Handle subject selection change
  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setSelectedClassId(''); // Reset class when subject changes
    setSelectedGradeSections([]); // Reset grade sections
    const subject = subjects.find(s => s.id === subjectId);
    if (subject) {
      setSubjectName(subject.name);
    }
  };

  const handleGradeSectionToggle = (gs: string) => {
    if (selectedGradeSections.includes(gs)) {
      setSelectedGradeSections(selectedGradeSections.filter(item => item !== gs));
    } else {
      setSelectedGradeSections([...selectedGradeSections, gs]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachmentFile(file);
      setAttachmentFileName(file.name);
      
      // Auto-detect file type
      const fileType = file.type;
      if (fileType.startsWith('video/')) {
        setAttachmentType('video');
      } else if (fileType === 'application/pdf') {
        setAttachmentType('pdf');
      } else if (fileType.startsWith('image/')) {
        setAttachmentType('image');
      } else {
        setAttachmentType('other');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || selectedGradeSections.length === 0 || !title || !subjectName) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('classId', selectedClassId);
      formData.append('className', selectedClass?.className || '');
      formData.append('gradeSections', JSON.stringify(selectedGradeSections));
      formData.append('subject', subjectName);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('status', status);
      formData.append('attachmentType', attachmentType);
      
      if (attachmentFile) {
        formData.append('attachment', attachmentFile);
        console.log('Appending file to FormData:', attachmentFile.name);
      } else if (attachmentUrl) {
        formData.append('attachmentUrl', attachmentUrl);
      }

      if (course) {
        await updateCourse(course.id, formData);
      } else {
        await createCourse(formData);
      }
      
      alert('Course saved successfully!');
      onClose();
    } catch (error) {
      console.error('Error saving course:', error);
      alert('Failed to save course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{viewMode ? 'Course Details' : course ? 'Edit Course' : 'Add New Course'}</h2>
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
                setSelectedSubjectId('');
                setSubjectName('');
              }}
              required
              disabled={viewMode || !!course}
            >
              <option value="">Choose a teacher</option>
              {teachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.fullName || teacher.name || 'Unnamed Teacher'}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Selection/Display */}
          {selectedTeacherId && teacherAvailableSubjects.length > 0 && (
            <div className="form-group">
              <label className="form-label required">Subject</label>
              {teacherAvailableSubjects.length === 1 ? (
                <input
                  type="text"
                  value={subjectName}
                  disabled
                  style={{ backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }}
                />
              ) : (
                <select
                  value={selectedSubjectId}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  required
                  disabled={viewMode}
                >
                  <option value="">Choose a subject</option>
                  {teacherAvailableSubjects.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Class Selection */}
          {selectedTeacherId && classesWithSchedules.length > 0 && (
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
                {classesWithSchedules.map(cls => (
                  <optgroup key={cls.className} label={cls.className}>
                    {cls.schedules.map(schedule => (
                      <option key={schedule.id} value={schedule.id}>
                        {schedule.day} {schedule.start} - {schedule.end}
                      </option>
                    ))}
                  </optgroup>
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

          {/* Course Title */}
          <div className="form-group">
            <label className="form-label required">Course Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Introduction to Algebra"
              required
              disabled={viewMode}
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter course description..."
              rows={4}
              disabled={viewMode}
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
              <option value="overdue">Overdue</option>
            </select>
          </div>

          {/* Attachment */}
          <div className="form-group">
            <label className="form-label">Attachment</label>
            {!viewMode && (
              <div style={{ marginBottom: '8px' }}>
                <input
                  type="file"
                  accept="video/*,image/*,application/pdf,.doc,.docx,.ppt,.pptx"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  id="attachment-upload"
                />
                <label htmlFor="attachment-upload" style={{
                  display: 'inline-block',
                  padding: '10px 20px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  borderRadius: '8px',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}>
                  Choose File
                </label>
              </div>
            )}
            {(attachmentFileName || attachmentUrl) && (
              <div style={{ 
                padding: '12px',
                background: 'rgba(241, 245, 249, 0.8)',
                borderRadius: '8px',
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ color: '#475569', fontSize: '14px' }}>
                  {attachmentFileName || 'Current attachment'}
                </span>
                {attachmentUrl && (
                  <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', fontSize: '14px' }}>
                    View
                  </a>
                )}
              </div>
            )}
            {attachmentType && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
                Type: {attachmentType.charAt(0).toUpperCase() + attachmentType.slice(1)}
              </div>
            )}
            
            {/* View Attached Media Button */}
            {(attachmentUrl || course?.attachmentUrl) && (
              <button 
                type="button" 
                onClick={() => window.open(attachmentUrl || course?.attachmentUrl || '', '_blank')}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontWeight: '700',
                  fontSize: '16px',
                  marginTop: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                }}
              >
                <span style={{ fontSize: '24px' }}>🎬</span>
                <span>VIEW ATTACHED MEDIA</span>
              </button>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              {viewMode ? 'Close' : 'Cancel'}
            </button>
            {!viewMode && (
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Saving...' : course ? 'Update Course' : 'Create Course'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CourseModal;
