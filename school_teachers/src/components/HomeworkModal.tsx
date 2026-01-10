import React, { useState, useEffect } from 'react';
import { createHomework, updateHomework, type Homework } from '../services/homeworks.api';
import { type Class } from '../services/classes.api';
import './Modal.css';

interface HomeworkModalProps {
    homework: Homework | null;
    onClose: () => void;
    viewMode?: boolean;
    myClasses: Class[];
    subjectName: string;
}

const HomeworkModal: React.FC<HomeworkModalProps> = ({ homework, onClose, viewMode = false, myClasses, subjectName }) => {
    const [loading, setLoading] = useState(false);

    // Form state
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedGradeSections, setSelectedGradeSections] = useState<string[]>([]);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [status, setStatus] = useState<'pending' | 'active' | 'completed' | 'past_due'>('pending');
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

    // Get unique classes for dropdown
    const uniqueClasses = Array.from(
        new Map(myClasses.map(cls => [cls.className, cls])).values()
    );

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

        try {
            setLoading(true);

            const formData = new FormData();
            formData.append('classId', selectedClassId);
            formData.append('className', selectedClassName);
            formData.append('gradeSections', JSON.stringify(selectedGradeSections));
            formData.append('subject', subjectName);
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

                <form onSubmit={handleSubmit} className="modal-form">
                    {/* Subject Display (auto from teacher) */}
                    {subjectName && (
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
                            {uniqueClasses.map(cls => (
                                <option key={cls.id} value={cls.id}>
                                    {cls.className}
                                </option>
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
            </div>
        </div>
    );
};

export default HomeworkModal;
