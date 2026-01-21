import React, { useState, useEffect } from 'react';
import { createHomework, updateHomework, type Homework } from '../services/homeworks.api';
import { type Class } from '../services/classes.api';
import './Modal.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
    myClasses: Class[];
    subjectName: string;
    subjects?: string[]; // Array of subject names when teacher has multiple subjects
}

const HomeworkModal: React.FC<HomeworkModalProps> = ({ homework, onClose, viewMode = false, myClasses, subjectName, subjects }) => {
    const [loading, setLoading] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState<string>(subjectName);

    // Submissions state
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [gradingGrade, setGradingGrade] = useState<number>(0);
    const [gradingFeedback, setGradingFeedback] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'details' | 'submissions'>('details');

    // Form state
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedGradeSections, setSelectedGradeSections] = useState<string[]>([]);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [status, setStatus] = useState<'pending' | 'active' | 'completed' | 'past_due'>('active');
    const [totalMarks, setTotalMarks] = useState<number>(100);
    const [attachmentUrl, setAttachmentUrl] = useState('');
    const [attachmentType, setAttachmentType] = useState<'video' | 'pdf' | 'image' | 'other'>('other');
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
    const [attachmentFileName, setAttachmentFileName] = useState<string>('');

    useEffect(() => {
        if (homework && myClasses.length > 0) {
            setSelectedClassId(homework.classId || '');
            setSelectedGradeSections(homework.gradeSections || []);
            setTitle(homework.title || '');
            setDescription(homework.description || '');
            setDueDate(homework.dueDate || '');
            setStatus(homework.status || 'pending');
            setTotalMarks(homework.totalMarks || 100);
            setAttachmentUrl(homework.attachmentUrl || '');
            setAttachmentType(homework.attachmentType || 'other');
            if (homework.attachmentUrl) {
                const urlParts = homework.attachmentUrl.split('/');
                setAttachmentFileName(decodeURIComponent(urlParts[urlParts.length - 1].split('?')[0]));
            }
            // Fetch submissions for existing homework
            fetchSubmissions(homework.id);
        } else if (!homework) {
            // Set default due date for new homework (7 days from now)
            const now = new Date();
            const dueDateDefault = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

            const formatDateTime = (date: Date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${year}-${month}-${day}T${hours}:${minutes}`;
            };

            setDueDate(formatDateTime(dueDateDefault));
        }
    }, [homework, myClasses]);

    const fetchSubmissions = async (homeworkId: string) => {
        try {
            const token = localStorage.getItem('teacher_token');
            const response = await fetch(`${API_URL}/submissions/homework/${homeworkId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            const submissionsData = data?.data || [];
            setSubmissions(submissionsData);
        } catch (error) {
            console.error('Error fetching submissions:', error);
        }
    };

    const handleGradeSubmission = async () => {
        if (!selectedSubmission) return;

        if (gradingGrade < 0 || gradingGrade > (homework?.totalMarks || 100)) {
            alert(`Grade must be between 0 and ${homework?.totalMarks || 100}`);
            return;
        }

        try {
            const token = localStorage.getItem('teacher_token');
            const teacherUser = localStorage.getItem('teacher_user');
            let teacherName = 'Teacher';
            if (teacherUser) {
                try {
                    const parsed = JSON.parse(teacherUser);
                    teacherName = parsed.name || 'Teacher';
                } catch (e) {
                    console.error('Failed to parse teacher user:', e);
                }
            }
            
            const response = await fetch(`${API_URL}/submissions/${selectedSubmission.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    grade: gradingGrade,
                    teacherFeedback: gradingFeedback,
                    gradedBy: teacherName
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

    // Group classes by className and collect all schedules
    const classesWithSchedules = myClasses.reduce((acc, cls) => {
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

    const selectedClass = myClasses.find(c => c.id === selectedClassId);
    const availableGradeSections = selectedClass?.gradeSections || [];

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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAttachmentFile(file);
            setAttachmentFileName(file.name);

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

        const selectedClassName = myClasses.find(c => c.id === selectedClassId)?.className || '';

        // Validate subject selection when multiple subjects exist
        if (subjects && subjects.length > 1 && !selectedSubject) {
            alert('Please select a subject');
            return;
        }

        try {
            setLoading(true);

            const formData = new FormData();
            formData.append('classId', selectedClassId);
            formData.append('className', selectedClassName);
            formData.append('gradeSections', JSON.stringify(selectedGradeSections));
            formData.append('subject', selectedSubject || subjectName);
            formData.append('title', title);
            formData.append('description', description);
            formData.append('dueDate', dueDate);
            formData.append('status', status);
            formData.append('totalMarks', totalMarks.toString());
            formData.append('attachmentType', attachmentType);

            if (attachmentFile) {
                formData.append('attachment', attachmentFile);
            } else if (attachmentUrl) {
                formData.append('attachmentUrl', attachmentUrl);
            }

            if (homework) {
                await updateHomework(homework.id, formData);
                alert('Homework updated successfully!');
            } else {
                await createHomework(formData);
                alert('Homework created successfully!');
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
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                {/* Tabs - only show if editing/viewing existing homework */}
                {homework && (
                    <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
                        <button
                            type="button"
                            onClick={() => setActiveTab('details')}
                            style={{
                                padding: '12px 24px',
                                border: 'none',
                                background: activeTab === 'details' ? '#667eea' : 'transparent',
                                color: activeTab === 'details' ? 'white' : '#64748b',
                                fontWeight: activeTab === 'details' ? 'bold' : 'normal',
                                cursor: 'pointer',
                                borderBottom: activeTab === 'details' ? '2px solid #667eea' : 'none'
                            }}
                        >
                            Details
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('submissions')}
                            style={{
                                padding: '12px 24px',
                                border: 'none',
                                background: activeTab === 'submissions' ? '#667eea' : 'transparent',
                                color: activeTab === 'submissions' ? 'white' : '#64748b',
                                fontWeight: activeTab === 'submissions' ? 'bold' : 'normal',
                                cursor: 'pointer',
                                borderBottom: activeTab === 'submissions' ? '2px solid #667eea' : 'none'
                            }}
                        >
                            Submissions ({submissions.length})
                        </button>
                    </div>
                )}

                {/* Details Tab */}
                {activeTab === 'details' && (
                <form onSubmit={handleSubmit} className="modal-form">
                    {/* Subject Selection/Display */}
                    {subjects && subjects.length > 1 ? (
                        <div className="form-group">
                            <label className="form-label required">Subject</label>
                            <select
                                value={selectedSubject}
                                onChange={(e) => {
                                    setSelectedSubject(e.target.value);
                                    setSelectedClassId('');
                                    setSelectedGradeSections([]);
                                }}
                                required
                                disabled={viewMode}
                            >
                                <option value="">Choose a subject</option>
                                {subjects.map((subject, idx) => (
                                    <option key={idx} value={subject}>
                                        {subject}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : subjectName && (
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
                    <div className="form-row">
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
                                    padding: '10px 16px',
                                    background: 'rgba(102, 126, 234, 0.1)',
                                    border: '1px solid rgba(102, 126, 234, 0.3)',
                                    borderRadius: '8px',
                                    color: '#667eea',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}>
                                    Choose File
                                </label>
                            </div>
                        )}
                        {(attachmentFileName || attachmentUrl) && (
                            <div style={{
                                padding: '12px',
                                background: '#f8fafc',
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
                                    <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#667eea', fontSize: '14px' }}>
                                        View
                                    </a>
                                )}
                            </div>
                        )}
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
                                                        Graded: {submission.gradedAt ? new Date(submission.gradedAt).toLocaleString() : 'N/A'}
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
                                                        style={{
                                                            color: '#667eea',
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
                                                            backgroundColor: '#667eea',
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
                                            </div>
                                        )}

                                        {/* Teacher Feedback */}
                                        {submission.teacherFeedback && (
                                            <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#eff6ff', borderRadius: '4px' }}>
                                                <strong style={{ color: '#667eea' }}>Your Feedback:</strong>
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
                                                                backgroundColor: '#ffffff',
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
                                                                backgroundColor: '#ffffff',
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
                                                        backgroundColor: submission.grade !== undefined && submission.grade !== null ? '#f59e0b' : '#667eea',
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
