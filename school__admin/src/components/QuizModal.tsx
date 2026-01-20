import React, { useState, useEffect } from 'react';
import { createQuiz, updateQuiz, type Quiz, type QuizQuestion } from '../services/quizzes.api';
import { getAllClasses, type Class } from '../services/classes.api';
import { teachersAPI } from '../services/teachers.api';
import { subjectsAPI } from '../api/subjects.api';
import './TeacherModal.css';

interface QuizResult {
  id: string;
  quizId: string;
  studentId: string;
  studentName: string;
  totalScore: number;
  totalMarks: number;
  percentage: number;
  submittedAt: any;
  answers: {
    questionIndex: number;
    selectedAnswer: string | null;
    correctAnswer: string;
    isCorrect: boolean;
    marksAwarded: number;
    maxMarks: number;
  }[];
}

interface QuizModalProps {
  quiz: Quiz | null;
  onClose: () => void;
  viewMode?: boolean;
}

const QuizModal: React.FC<QuizModalProps> = ({ quiz, onClose, viewMode = false }) => {
  console.log('QuizModal mounted');
  
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<QuizResult | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'results'>('details');

  // Form state
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedGradeSections, setSelectedGradeSections] = useState<string[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [subjectName, setSubjectName] = useState<string>('');
  const [subjectCode, setSubjectCode] = useState<string>('');
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
    console.log('Initial useEffect triggered');
    fetchClasses();
    fetchTeachers();
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (quiz && classes.length > 0) {
      // Populate form with existing quiz data
      const quizClass = classes.find(c => c.id === quiz.classId);
      if (quizClass) {
        setSelectedTeacherId(quizClass.teacherId);
      }
      setSelectedClassId(quiz.classId);
      setSelectedGradeSections(quiz.gradeSections);
      setTitle(quiz.title);
      setDescription(quiz.description);
      setStartDateTime(quiz.startDateTime);
      setEndDateTime(quiz.endDateTime);
      setQuizDurationMinutes(quiz.quizDurationMinutes);
      setQuestions(quiz.questions);
      setStatus(quiz.status);
      
      // Fetch results if viewing/editing existing quiz
      if (quiz.id) {
        fetchResults(quiz.id);
      }
    }
  }, [quiz, classes]);

  const fetchResults = async (quizId: string) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/quiz-results/quiz/${quizId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      const resultsData = data?.data || [];
      setResults(resultsData);
    } catch (error) {
      console.error('Error fetching results:', error);
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
    console.log('fetchTeachers called');
    try {
      const response = await teachersAPI.getAll();
      console.log('Teachers response:', response);
      
      // Backend returns { success: true, data: [...] }
      const teachersArray = response?.data || [];
      console.log('Teachers array:', teachersArray);
      console.log('First teacher:', teachersArray[0]);
      
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

  // Filter classes by selected teacher
  const teacherClasses = selectedTeacherId 
    ? classes.filter(c => c.teacherId === selectedTeacherId)
    : [];

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

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const availableGradeSections = selectedClass?.gradeSections || [];

  // Get selected teacher
  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);
  
  // Get teacher's available subjects (filtered from all subjects)
  const teacherSubjectIds = selectedTeacher?.subjects || [];
  const teacherAvailableSubjects = subjects.filter(s => 
    teacherSubjectIds.includes(s.id) || teacherSubjectIds.includes(s.name)
  );
  
  // Update subject when teacher is selected or subject selection changes
  useEffect(() => {
    if (selectedTeacher && subjects.length > 0) {
      const teacherSubjects = selectedTeacher.subjects || [];
      
      if (teacherSubjects.length > 0) {
        // If teacher has only one subject, auto-select it
        if (teacherSubjects.length === 1) {
          const subjectId = teacherSubjects[0];
          const subject = subjects.find(s => s.id === subjectId || s.name === subjectId);
          
          if (subject) {
            setSelectedSubjectId(subject.id);
            setSubjectName(subject.name);
            setSubjectCode(subject.code || '');
          }
        } else if (!selectedSubjectId) {
          // Multiple subjects but none selected - clear fields
          setSubjectName('');
          setSubjectCode('');
        }
      }
    } else {
      // Clear subject when no teacher selected
      setSelectedSubjectId('');
      setSubjectName('');
      setSubjectCode('');
    }
  }, [selectedTeacher, subjects]);

  // Handle subject selection change
  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setSelectedClassId(''); // Reset class when subject changes
    setSelectedGradeSections([]); // Reset grade sections
    const subject = subjects.find(s => s.id === subjectId);
    if (subject) {
      setSubjectName(subject.name);
      setSubjectCode(subject.code || '');
    } else {
      setSubjectName('');
      setSubjectCode('');
    }
  };

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

    // Validation
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

    // Validate questions
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

    const selectedClassName = classes.find(c => c.id === selectedClassId)?.className || '';

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

        {/* Tabs - only show if editing/viewing existing quiz */}
        {quiz && (
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <button
              type="button"
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
              type="button"
              onClick={() => setActiveTab('results')}
              style={{
                padding: '12px 24px',
                border: 'none',
                background: activeTab === 'results' ? '#3b82f6' : 'transparent',
                color: activeTab === 'results' ? 'white' : '#64748b',
                fontWeight: activeTab === 'results' ? 'bold' : 'normal',
                cursor: 'pointer',
                borderBottom: activeTab === 'results' ? '2px solid #3b82f6' : 'none'
              }}
            >
              Results ({results.length})
            </button>
          </div>
        )}

        {/* Details Tab */}
        {activeTab === 'details' && (
          <form onSubmit={handleSubmit} className="modal-form">
          {/* Teacher Selection */}
          <div className="form-group">
            <label className="form-label required">Select Teacher (Count: {teachers.length})</label>
            <select
              value={selectedTeacherId}
              onChange={(e) => {
                console.log('Teacher selected:', e.target.value);
                setSelectedTeacherId(e.target.value);
                setSelectedClassId('');
                setSelectedGradeSections([]);
                setSelectedSubjectId('');
                setSubjectName('');
                setSubjectCode('');
              }}
              required
              disabled={viewMode}
            >
              <option value="">Choose a teacher</option>
              {teachers.map(teacher => {
                console.log('Mapping teacher:', teacher);
                return (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.fullName || 'Unnamed Teacher'}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Subject Display (greyed out, auto-populated after teacher selection) */}
          {selectedTeacherId && teacherAvailableSubjects.length > 0 && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Subject</label>
                {teacherAvailableSubjects.length === 1 ? (
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
                ) : (
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    required
                    disabled={viewMode}
                  >
                    <option value="">Select a subject</option>
                    {teacherAvailableSubjects.map(subject => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {subjectCode && (
                <div className="form-group">
                  <label className="form-label">Subject Code</label>
                  <input
                    type="text"
                    value={subjectCode}
                    disabled
                    style={{ 
                      backgroundColor: '#f1f5f9', 
                      color: '#64748b',
                      cursor: 'not-allowed'
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Class Selection (only for selected teacher) */}
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
          </div>

          {/* Status */}
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
                    <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
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
                        <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Question Text */}
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

                  {/* Answer Options */}
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

                  {/* Correct Answer & Marks */}
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
        )}

        {/* Results Tab */}
        {activeTab === 'results' && (
          <div className="results-container" style={{ padding: '20px' }}>
            {results.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px', 
                color: '#64748b',
                fontSize: '16px'
              }}>
                No submissions yet
              </div>
            ) : (
              <div className="results-list">
                {results.map((result) => (
                  <div 
                    key={result.id} 
                    className="result-item"
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '16px',
                      marginBottom: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      backgroundColor: selectedResult?.id === result.id ? '#f8fafc' : 'white'
                    }}
                    onClick={() => setSelectedResult(selectedResult?.id === result.id ? null : result)}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: selectedResult?.id === result.id ? '16px' : '0'
                    }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px', color: '#1e293b' }}>
                          {result.studentName}
                        </div>
                        <div style={{ fontSize: '14px', color: '#64748b' }}>
                          Submitted: {result.submittedAt?.toDate ? result.submittedAt.toDate().toLocaleString() : new Date(result.submittedAt).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ 
                          fontSize: '24px', 
                          fontWeight: 'bold',
                          color: result.percentage >= 60 ? '#10b981' : '#ef4444'
                        }}>
                          {result.percentage.toFixed(1)}%
                        </div>
                        <div style={{ fontSize: '14px', color: '#64748b' }}>
                          {result.totalScore}/{result.totalMarks} points
                        </div>
                      </div>
                    </div>

                    {/* Detailed Answer Review */}
                    {selectedResult?.id === result.id && (
                      <div style={{ 
                        borderTop: '1px solid #e2e8f0', 
                        paddingTop: '16px',
                        marginTop: '8px'
                      }}>
                        <h4 style={{ 
                          fontSize: '16px', 
                          fontWeight: 'bold', 
                          marginBottom: '12px',
                          color: '#1e293b'
                        }}>
                          Answer Details
                        </h4>
                        {result.answers.map((answer: any, index: number) => {
                          const questionText = quiz?.questions[answer.questionIndex]?.question || `Question ${answer.questionIndex + 1}`;
                          return (
                          <div 
                            key={index}
                            style={{
                              backgroundColor: answer.isCorrect ? '#f0fdf4' : '#fef2f2',
                              border: `1px solid ${answer.isCorrect ? '#86efac' : '#fca5a5'}`,
                              borderRadius: '6px',
                              padding: '12px',
                              marginBottom: '12px'
                            }}
                          >
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between',
                              marginBottom: '8px'
                            }}>
                              <span style={{ fontWeight: 'bold', color: '#1e293b' }}>
                                Question {answer.questionIndex + 1}
                              </span>
                              <span style={{
                                fontWeight: 'bold',
                                color: answer.isCorrect ? '#10b981' : '#ef4444'
                              }}>
                                {answer.isCorrect ? '✓' : '✗'} {answer.marksAwarded}/{answer.maxMarks} points
                              </span>
                            </div>
                            <div style={{ 
                              fontSize: '14px', 
                              color: '#475569',
                              marginBottom: '8px'
                            }}>
                              <strong>Question:</strong> {questionText}
                            </div>
                            <div style={{ 
                              fontSize: '14px', 
                              marginBottom: '4px'
                            }}>
                              <strong style={{ color: '#1e293b' }}>Student Answer:</strong>{' '}
                              <span style={{ 
                                color: answer.isCorrect ? '#10b981' : '#ef4444',
                                fontWeight: 'bold'
                              }}>
                                {answer.selectedAnswer || 'No answer'}
                              </span>
                            </div>
                            {!answer.isCorrect && (
                              <div style={{ 
                                fontSize: '14px',
                                color: '#10b981'
                              }}>
                                <strong>Correct Answer:</strong> {answer.correctAnswer}
                              </div>
                            )}
                          </div>
                        )})}
                      </div>
                    )}
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

export default QuizModal;
