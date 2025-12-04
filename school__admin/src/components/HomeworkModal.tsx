import React, { useState, useEffect } from 'react';
import { createHomework, updateHomework, type Homework } from '../services/homeworks.api';
import { getAllClasses, type Class } from '../services/classes.api';
import { teachersAPI } from '../services/teachers.api';
import { subjectsAPI } from '../api/subjects.api';
import './TeacherModal.css';

interface Submission {
  id: string;
  studentId: string;
  studentName: string;
  textContent?: string;
  fileUrl?: string;
  fileName?: string;
  grade?: number;
  teacherFeedback?: string;
  gradedBy?: string;
  gradedAt?: any;
  submittedAt: any;
  updatedAt: any;
}

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
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [gradingGrade, setGradingGrade] = useState<number>(0);
  const [gradingFeedback, setGradingFeedback] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'details' | 'submissions'>('details');

  // Form state
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedGradeSections, setSelectedGradeSections] = useState<string[]>([]);
  const [subjectName, setSubjectName] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<'pending' | 'active' | 'completed' | 'past_due'>('pending');
  const [totalMarks, setTotalMarks] = useState<number>(100);

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (homework && classes.length > 0) {
      console.log('Populating homework form:', homework);
      console.log('Classes available:', classes);
      // Populate form with existing homework data
      const homeworkClass = classes.find(c => c.id === homework.classId);
      if (homeworkClass) {
        setSelectedTeacherId(homeworkClass.teacherId);
      }
      setSelectedClassId(homework.classId || '');
      setSelectedGradeSections(homework.gradeSections || []);
      setSubjectName(homework.subject || '');
      setTitle(homework.title || '');
      setDescription(homework.description || '');
      setDueDate(homework.dueDate || '');
      setStatus(homework.status || 'pending');
      setTotalMarks(homework.totalMarks || 100);
      
      // Fetch submissions if viewing/editing existing homework
      fetchSubmissions(homework.id);
    } else {
      console.log('Not populating - homework:', homework, 'classes:', classes.length);
    }
  }, [homework, classes]);

  const fetchSubmissions = async (homeworkId: string) => {
    try {
      const API_URL = 'http://192.168.0.103:3000';
      const response = await fetch(`${API_URL}/submissions/homework/${homeworkId}`);
      const data = await response.json();
      const submissionsData = data?.data || [];
      setSubmissions(submissionsData);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };

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

  const handleGradeSubmission = async () => {
    if (!selectedSubmission) return;
    
    if (gradingGrade < 0 || gradingGrade > (homework?.totalMarks || 100)) {
      alert(`Grade must be between 0 and ${homework?.totalMarks || 100}`);
      return;
    }

    try {
      const API_URL = 'http://192.168.0.103:3000';
      const response = await fetch(`${API_URL}/submissions/${selectedSubmission.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade: gradingGrade,
          teacherFeedback: gradingFeedback,
          gradedBy: 'teacher' // In real app, use actual teacher ID
        })
      });
      
      if (response.ok) {
        alert('Submission graded successfully');
        // Refresh submissions
        if (homework) {
          await fetchSubmissions(homework.id);
        }
        setSelectedSubmission(null);
        setGradingGrade(0);
        setGradingFeedback('');
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to grade submission');
      }
    } catch (error) {
      console.error('Error grading submission:', error);
      alert('Failed to grade submission');
    }
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
      status,
      totalMarks
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

        {/* Tabs - only show if editing/viewing existing homework */}
        {homework && (
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <button
              onClick={() => setActiveTab('details')}
              style={{
                padding: '12px 24px',
                border: 'none',
                background: activeTab === 'details' ? '#3b82f6' : 'transparent',
                color: activeTab === 'details' ? 'white' : '#64748b',
                fontWeight: activeTab === 'details' ? 'bold' : 'normal',
                cursor: 'pointer',
                borderBottom: activeTab === 'details' ? '2px solid #3b82f6' : 'none'
              }}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('submissions')}
              style={{
                padding: '12px 24px',
                border: 'none',
                background: activeTab === 'submissions' ? '#3b82f6' : 'transparent',
                color: activeTab === 'submissions' ? 'white' : '#64748b',
                fontWeight: activeTab === 'submissions' ? 'bold' : 'normal',
                cursor: 'pointer',
                borderBottom: activeTab === 'submissions' ? '2px solid #3b82f6' : 'none'
              }}
            >
              Submissions ({submissions.length})
            </button>
          </div>
        )}

        {/* Details Tab */}
        {activeTab === 'details' && (
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

          {/* Total Marks */}
          <div className="form-group">
            <label className="form-label required">Total Marks</label>
            <input
              type="number"
              min="1"
              value={totalMarks}
              onChange={(e) => setTotalMarks(Number(e.target.value))}
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
        )}

        {/* Submissions Tab */}
        {activeTab === 'submissions' && homework && (
          <div style={{ padding: '20px', color: '#1e293b' }}>
            {submissions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                <p style={{ color: '#64748b' }}>No submissions yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {submissions.map((submission) => (
                  <div
                    key={submission.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '16px',
                      backgroundColor: submission.grade !== undefined ? '#f0fdf4' : 'white',
                      color: '#1e293b'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div>
                        <h4 style={{ margin: 0, marginBottom: '4px', color: '#1e293b' }}>{submission.studentName}</h4>
                        <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                          Submitted: {new Date(submission.submittedAt).toLocaleString()}
                        </p>
                      </div>
                      {submission.grade !== undefined && submission.grade !== null && (
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>
                            {submission.grade}/{homework?.totalMarks || 100}
                          </div>
                          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                            Graded: {new Date(submission.gradedAt).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Submission Content */}
                    {submission.textContent && (
                      <div style={{ marginBottom: '12px' }}>
                        <strong style={{ color: '#1e293b' }}>Submission:</strong>
                        <p style={{ margin: '8px 0', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '4px', color: '#1e293b' }}>
                          {submission.textContent}
                        </p>
                      </div>
                    )}

                    {submission.fileUrl && (
                      <div style={{ marginBottom: '12px' }}>
                        <strong style={{ color: '#1e293b' }}>Attached File:</strong>
                        <div style={{ margin: '8px 0', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <a 
                            href={submission.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            onClick={() => {
                              console.log('File URL:', submission.fileUrl);
                              // If it's a Firebase Storage URL, it should open directly
                            }}
                            style={{ 
                              color: '#3b82f6',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 12px',
                              backgroundColor: '#eff6ff',
                              borderRadius: '4px',
                              border: '1px solid #bfdbfe',
                              cursor: 'pointer'
                            }}
                          >
                            📎 {submission.fileName || 'View Document'}
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              window.open(submission.fileUrl, '_blank');
                            }}
                            style={{
                              padding: '8px 12px',
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                          >
                            Open File
                          </button>
                        </div>
                        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                          URL: {submission.fileUrl}
                        </p>
                      </div>
                    )}

                    {/* Teacher Feedback */}
                    {submission.teacherFeedback && (
                      <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#eff6ff', borderRadius: '4px' }}>
                        <strong style={{ color: '#3b82f6' }}>Teacher Feedback:</strong>
                        <p style={{ margin: '8px 0', color: '#1e293b' }}>{submission.teacherFeedback}</p>
                      </div>
                    )}

                    {/* Grading Form */}
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                      {selectedSubmission?.id === submission.id ? (
                        <div>
                          <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#1e293b' }}>
                              Grade (0-{homework?.totalMarks || 100})
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={homework?.totalMarks || 100}
                              value={gradingGrade}
                              onChange={(e) => setGradingGrade(Number(e.target.value))}
                              style={{ 
                                width: '100%', 
                                padding: '8px', 
                                border: '1px solid #e2e8f0', 
                                borderRadius: '4px',
                                color: '#1e293b',
                                fontSize: '16px'
                              }}
                            />
                          </div>
                          <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#1e293b' }}>
                              Feedback
                            </label>
                            <textarea
                              value={gradingFeedback}
                              onChange={(e) => setGradingFeedback(e.target.value)}
                              rows={3}
                              style={{ 
                                width: '100%', 
                                padding: '8px', 
                                border: '1px solid #e2e8f0', 
                                borderRadius: '4px',
                                color: '#1e293b',
                                fontSize: '14px'
                              }}
                              placeholder="Enter feedback for the student..."
                            />
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={handleGradeSubmission}
                              style={{
                                padding: '10px 20px',
                                backgroundColor: '#16a34a',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '14px'
                              }}
                            >
                              Submit Grade
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSubmission(null);
                                setGradingGrade(0);
                                setGradingFeedback('');
                              }}
                              style={{
                                padding: '10px 20px',
                                backgroundColor: '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '14px'
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSubmission(submission);
                            setGradingGrade(submission.grade || 0);
                            setGradingFeedback(submission.teacherFeedback || '');
                          }}
                          style={{
                            padding: '10px 20px',
                            backgroundColor: submission.grade !== undefined && submission.grade !== null ? '#f59e0b' : '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '14px'
                          }}
                        >
                          {submission.grade !== undefined && submission.grade !== null ? 'Edit Grade' : 'Grade This Submission'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeworkModal;
