import React, { useState, useEffect } from 'react';
import { createQuiz, updateQuiz, type Quiz, type QuizQuestion } from '../services/quizzes.api';
import { type Class } from '../services/classes.api';
import './Modal.css';

interface QuizModalProps {
    quiz: Quiz | null;
    onClose: () => void;
    viewMode?: boolean;
    myClasses: Class[];
}

const QuizModal: React.FC<QuizModalProps> = ({ quiz, onClose, viewMode = false, myClasses }) => {
    const [loading, setLoading] = useState(false);

    // Form state
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedGradeSections, setSelectedGradeSections] = useState<string[]>([]);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDateTime, setStartDateTime] = useState('');
    const [endDateTime, setEndDateTime] = useState('');
    const [quizDurationMinutes, setQuizDurationMinutes] = useState<number>(30);
    const [questions, setQuestions] = useState<QuizQuestion[]>([
        {
            question: '',
            answers: ['', '', '', ''],
            correctAnswer: 'A',
            marks: 1
        }
    ]);
    const [status, setStatus] = useState<'pending' | 'available' | 'completed' | 'cancelled'>('pending');

    useEffect(() => {
        if (quiz && myClasses.length > 0) {
            setSelectedClassId(quiz.classId);
            setSelectedGradeSections(quiz.gradeSections);
            setTitle(quiz.title);
            setDescription(quiz.description);
            setStartDateTime(quiz.startDateTime);
            setEndDateTime(quiz.endDateTime);
            setQuizDurationMinutes(quiz.quizDurationMinutes);
            setQuestions(quiz.questions);
            setStatus(quiz.status);
        } else if (!quiz) {
            // Set default date/time values for new quiz
            const now = new Date();
            const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
            const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days later

            const formatDateTime = (date: Date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${year}-${month}-${day}T${hours}:${minutes}`;
            };

            setStartDateTime(formatDateTime(startDate));
            setEndDateTime(formatDateTime(endDate));
        }
    }, [quiz, myClasses]);

    // Get unique classes for dropdown
    const uniqueClasses = Array.from(
        new Map(myClasses.map(cls => [cls.className, cls])).values()
    );

    const selectedClass = myClasses.find(c => c.id === selectedClassId);
    const availableGradeSections = selectedClass?.gradeSections || [];

    const handleGradeSectionToggle = (gradeSection: string) => {
        if (selectedGradeSections.includes(gradeSection)) {
            setSelectedGradeSections(selectedGradeSections.filter(gs => gs !== gradeSection));
        } else {
            setSelectedGradeSections([...selectedGradeSections, gradeSection]);
        }
    };

    const handleAddQuestion = () => {
        setQuestions([
            ...questions,
            {
                question: '',
                answers: ['', '', '', ''],
                correctAnswer: 'A',
                marks: 1
            }
        ]);
    };

    const handleRemoveQuestion = (index: number) => {
        if (questions.length > 1) {
            setQuestions(questions.filter((_, i) => i !== index));
        }
    };

    const handleQuestionChange = (index: number, field: keyof QuizQuestion, value: any) => {
        const updated = [...questions];
        updated[index] = { ...updated[index], [field]: value };
        setQuestions(updated);
    };

    const handleAnswerChange = (questionIndex: number, answerIndex: number, value: string) => {
        const updated = [...questions];
        const newAnswers = [...updated[questionIndex].answers];
        newAnswers[answerIndex] = value;
        updated[questionIndex] = { ...updated[questionIndex], answers: newAnswers };
        setQuestions(updated);
    };

    const calculateTotalMarks = () => {
        return questions.reduce((sum, q) => sum + (q.marks || 0), 0);
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
            alert('Please enter a quiz title');
            return;
        }

        if (!startDateTime || !endDateTime) {
            alert('Please set start and end date/time');
            return;
        }

        if (new Date(endDateTime) <= new Date(startDateTime)) {
            alert('End date/time must be after start date/time');
            return;
        }

        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.question.trim()) {
                alert(`Question ${i + 1}: Please enter a question`);
                return;
            }
            if (q.answers.some(a => !a.trim())) {
                alert(`Question ${i + 1}: All answer options must be filled`);
                return;
            }
            if (q.marks <= 0) {
                alert(`Question ${i + 1}: Marks must be greater than 0`);
                return;
            }
        }

        const selectedClassName = myClasses.find(c => c.id === selectedClassId)?.className || '';

        const quizData = {
            classId: selectedClassId,
            className: selectedClassName,
            gradeSections: selectedGradeSections,
            title,
            description,
            startDateTime,
            endDateTime,
            quizDurationMinutes,
            questions,
            status
        };

        try {
            setLoading(true);
            if (quiz?.id) {
                await updateQuiz(quiz.id, quizData);
                alert('Quiz updated successfully');
            } else {
                await createQuiz(quizData);
                alert('Quiz created successfully');
            }
            onClose();
        } catch (error) {
            console.error('Error saving quiz:', error);
            alert('Failed to save quiz');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{viewMode ? 'View Quiz' : quiz ? 'Edit Quiz' : 'Create New Quiz'}</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
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

                    {/* Quiz Title */}
                    <div className="form-group">
                        <label className="form-label required">Quiz Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Midterm Exam - Chemistry"
                            required
                            readOnly={viewMode}
                        />
                    </div>

                    {/* Quiz Description */}
                    <div className="form-group">
                        <label className="form-label">Quiz Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            placeholder="Brief description of the quiz..."
                            readOnly={viewMode}
                        />
                    </div>

                    {/* Date/Time Settings */}
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Start Date/Time</label>
                            <input
                                type="datetime-local"
                                value={startDateTime}
                                onChange={(e) => setStartDateTime(e.target.value)}
                                required
                                disabled={viewMode}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label required">End Date/Time</label>
                            <input
                                type="datetime-local"
                                value={endDateTime}
                                onChange={(e) => setEndDateTime(e.target.value)}
                                required
                                disabled={viewMode}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Quiz Duration (minutes)</label>
                            <input
                                type="number"
                                value={quizDurationMinutes}
                                onChange={(e) => setQuizDurationMinutes(Number(e.target.value))}
                                min="1"
                                required
                                disabled={viewMode}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label required">Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as any)}
                                disabled={viewMode}
                            >
                                <option value="pending">Pending</option>
                                <option value="available">Available</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>

                    {/* Questions */}
                    <div className="form-group">
                        <div className="questions-header">
                            <label className="form-label required">Questions</label>
                            {!viewMode && (
                                <button
                                    type="button"
                                    onClick={handleAddQuestion}
                                    className="btn-add-question"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                                        <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                    Add Question
                                </button>
                            )}
                        </div>

                        <div className="questions-list">
                            {questions.map((q, qIdx) => (
                                <div key={qIdx} className="question-card">
                                    <div className="question-card-header">
                                        <h4>Question {qIdx + 1}</h4>
                                        {!viewMode && questions.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveQuestion(qIdx)}
                                                className="btn-remove-question"
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                                                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                </svg>
                                                Remove
                                            </button>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Question Text</label>
                                        <textarea
                                            value={q.question}
                                            onChange={(e) => handleQuestionChange(qIdx, 'question', e.target.value)}
                                            rows={2}
                                            placeholder="Enter the question..."
                                            required
                                            readOnly={viewMode}
                                        />
                                    </div>

                                    <div className="answers-grid">
                                        {['A', 'B', 'C', 'D'].map((letter, aIdx) => (
                                            <div key={letter} className="form-group">
                                                <label className="form-label">Option {letter}</label>
                                                <input
                                                    type="text"
                                                    value={q.answers[aIdx]}
                                                    onChange={(e) => handleAnswerChange(qIdx, aIdx, e.target.value)}
                                                    placeholder={`Answer ${letter}`}
                                                    required
                                                    readOnly={viewMode}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Correct Answer</label>
                                            <select
                                                value={q.correctAnswer}
                                                onChange={(e) => handleQuestionChange(qIdx, 'correctAnswer', e.target.value)}
                                                disabled={viewMode}
                                            >
                                                <option value="A">A</option>
                                                <option value="B">B</option>
                                                <option value="C">C</option>
                                                <option value="D">D</option>
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Marks</label>
                                            <input
                                                type="number"
                                                value={q.marks}
                                                onChange={(e) => handleQuestionChange(qIdx, 'marks', Number(e.target.value))}
                                                min="0"
                                                step="0.5"
                                                required
                                                disabled={viewMode}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Total Marks Display */}
                    <div className="quiz-summary">
                        <div className="summary-item">
                            <span className="summary-label">Total Questions:</span>
                            <span className="summary-value">{questions.length}</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">Total Marks:</span>
                            <span className="summary-value">{calculateTotalMarks()}</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="modal-footer">
                        {viewMode ? (
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn-submit"
                            >
                                Close
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="btn-cancel"
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-submit"
                                    disabled={loading}
                                >
                                    {loading ? 'Saving...' : quiz ? 'Update Quiz' : 'Create Quiz'}
                                </button>
                            </>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default QuizModal;
