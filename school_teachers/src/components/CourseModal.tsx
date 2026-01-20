import React, { useState, useEffect } from 'react';
import { createCourse, updateCourse, type Course } from '../services/courses.api';
import { type Class } from '../services/classes.api';
import './Modal.css';

interface CourseModalProps {
    course: Course | null;
    onClose: () => void;
    viewMode?: boolean;
    myClasses: Class[];
    subjectName: string;
    subjects?: string[]; // Array of subject names when teacher has multiple subjects
}

const CourseModal: React.FC<CourseModalProps> = ({ course, onClose, viewMode = false, myClasses, subjectName, subjects }) => {
    const [loading, setLoading] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState<string>(subjectName);

    // Form state
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedGradeSections, setSelectedGradeSections] = useState<string[]>([]);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<'pending' | 'active' | 'completed' | 'overdue'>('pending');
    const [attachmentUrl, setAttachmentUrl] = useState('');
    const [attachmentType, setAttachmentType] = useState<'video' | 'pdf' | 'image' | 'other'>('other');
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
    const [attachmentFileName, setAttachmentFileName] = useState<string>('');

    useEffect(() => {
        if (course && myClasses.length > 0) {
            setSelectedClassId(course.classId || '');
            setSelectedGradeSections(course.gradeSections || []);
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
    }, [course, myClasses]);


    // Group classes by className and collect all schedules
    const classesWithSchedules = subjectFilteredClasses.reduce((acc, cls) => {
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
        
        // Validate subject selection when multiple subjects exist
        const subjectToUse = selectedSubject || subjectName;
        if (subjects && subjects.length > 1 && !selectedSubject) {
            alert('Please select a subject');
            return;
        }
        
        if (!selectedClassId || selectedGradeSections.length === 0 || !title || !subjectToUse) {
            alert('Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('classId', selectedClassId);
            formData.append('className', selectedClass?.className || '');
            formData.append('gradeSections', JSON.stringify(selectedGradeSections));
            formData.append('subject', subjectToUse);
            formData.append('title', title);
            formData.append('description', description);
            formData.append('status', status);
            formData.append('attachmentType', attachmentType);

            if (attachmentFile) {
                formData.append('attachment', attachmentFile);
            } else if (attachmentUrl) {
                formData.append('attachmentUrl', attachmentUrl);
            }

            if (course) {
                await updateCourse(course.id, formData);
                alert('Course updated successfully!');
            } else {
                await createCourse(formData);
                alert('Course created successfully!');
            }

            onClose();
        } catch (error) {
            console.error('Error saving course:', error);
            alert('Failed to save course');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{viewMode ? 'Course Details' : course ? 'Edit Course' : 'Add New Course'}</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

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
                                style={{ backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }}
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
