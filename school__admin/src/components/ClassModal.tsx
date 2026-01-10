import React, { useState, useEffect } from 'react';
import type { Class, CreateClassData, UpdateClassData } from '../services/classes.api';
import { deleteClass, createClass, updateClass, getAllClasses } from '../services/classes.api';
import { teachersAPI } from '../services/teachers.api';
import { subjectsAPI } from '../api/subjects.api';
import type { Subject } from '../api/subjects.api';
import './TeacherModal.css';

interface Teacher {
  id: string;
  fullName: string;
  subjects: string[];
}

const GRADES = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'];
const SECTIONS = ['A', 'B', 'C'];
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface ClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateClassData | UpdateClassData) => Promise<void>;
  classData?: Class | null;
  relatedClasses?: Class[];
}

interface Schedule {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

interface GradeSectionSchedule {
  grade: string;
  section: string;
  teacherId: string;
  schedules: Schedule[];
  expanded: boolean;
}

const ClassModal: React.FC<ClassModalProps> = ({ isOpen, onClose, onSubmit, classData, relatedClasses = [] }) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showGradeSections, setShowGradeSections] = useState(false);
  const [gradeSectionSchedules, setGradeSectionSchedules] = useState<GradeSectionSchedule[]>([]);
  const [formData, setFormData] = useState<CreateClassData>({
    className: '',
    teacherId: '',
    gradeSections: [],
    dayOfWeek: '',
    startTime: '',
    endTime: '',
  });
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  // Helper functions for teachers
  const getTeachersForSubject = (subjectId: string): Teacher[] => {
    if (!subjectId) return [];
    return teachers.filter(t => t.subjects?.includes(subjectId));
  };

  const setTeacherForGradeSection = (grade: string, section: string, teacherId: string) => {
    setGradeSectionSchedules(prev => {
      const existing = prev.find(gss => gss.grade === grade && gss.section === section);
      if (existing) {
        return prev.map(gss =>
          gss.grade === grade && gss.section === section
            ? { ...gss, teacherId }
            : gss
        );
      } else {
        return [...prev, { grade, section, teacherId, schedules: [], expanded: false }];
      }
    });
  };

  const toggleGradeSectionExpanded = (grade: string, section: string) => {
    setGradeSectionSchedules(prev => prev.map(gss =>
      gss.grade === grade && gss.section === section
        ? { ...gss, expanded: !gss.expanded }
        : gss
    ));
  };

  const addScheduleToGradeSection = (grade: string, section: string, day: string) => {
    setGradeSectionSchedules(prev => prev.map(gss =>
      gss.grade === grade && gss.section === section
        ? {
          ...gss,
          schedules: [...gss.schedules, {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            dayOfWeek: day,
            startTime: '08:00',
            endTime: '09:00'
          }]
        }
        : gss
    ));
  };

  const removeScheduleFromGradeSection = (grade: string, section: string, scheduleId: string) => {
    setGradeSectionSchedules(prev => prev.map(gss =>
      gss.grade === grade && gss.section === section
        ? { ...gss, schedules: gss.schedules.filter(s => s.id !== scheduleId) }
        : gss
    ));
  };

  const updateGradeSectionScheduleTime = (
    grade: string,
    section: string,
    scheduleId: string,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    setGradeSectionSchedules(prev => prev.map(gss =>
      gss.grade === grade && gss.section === section
        ? {
          ...gss,
          schedules: gss.schedules.map(s =>
            s.id === scheduleId ? { ...s, [field]: value } : s
          )
        }
        : gss
    ));
  };

  useEffect(() => {
    if (isOpen) {
      loadTeachers();
      loadSubjects();
      if (classData && relatedClasses && relatedClasses.length > 0) {
        // Editing mode: Load from related classes
        setFormData({
          className: classData.className,
          teacherId: classData.teacherId,
          gradeSections: classData.gradeSections,
          dayOfWeek: classData.dayOfWeek,
          startTime: classData.startTime,
          endTime: classData.endTime,
        });

        // Group related classes by grade/section
        const grouped = new Map<string, GradeSectionSchedule>();
        for (const cls of relatedClasses) {
          if (cls.gradeSections && cls.gradeSections.length > 0) {
            const gs = cls.gradeSections[0];
            const key = `${gs.grade}-${gs.section}`;
            if (!grouped.has(key)) {
              grouped.set(key, {
                grade: gs.grade,
                section: gs.section,
                teacherId: cls.teacherId,
                schedules: [],
                expanded: false
              });
            }
            grouped.get(key)!.schedules.push({
              id: cls.id || Date.now().toString(),
              dayOfWeek: cls.dayOfWeek,
              startTime: cls.startTime,
              endTime: cls.endTime
            });
          }
        }
        setGradeSectionSchedules(Array.from(grouped.values()));
        setShowGradeSections(classData.gradeSections.length > 0);
      } else {
        // New class mode
        setFormData({
          className: '',
          teacherId: '',
          gradeSections: [],
          dayOfWeek: '',
          startTime: '',
          endTime: '',
        });
        setGradeSectionSchedules([]);
        setShowGradeSections(false);
        setSelectedSubjectId('');
      }
    }
  }, [isOpen, classData, relatedClasses]);

  const loadTeachers = async () => {
    try {
      const response = await teachersAPI.getAll();
      setTeachers(response.data || []);
    } catch (error) {
      console.error('Failed to load teachers:', error);
      setTeachers([]);
    }
  };

  const loadSubjects = async () => {
    try {
      const data = await subjectsAPI.getAll();
      setSubjects(data);
    } catch (error) {
      console.error('Failed to load subjects:', error);
      setSubjects([]);
    }
  };

  const toggleGradeSection = (grade: string, section: string) => {
    const exists = formData.gradeSections.some(gs => gs.grade === grade && gs.section === section);
    if (exists) {
      // Remove from formData and from gradeSectionSchedules
      setFormData(prev => ({
        ...prev,
        gradeSections: prev.gradeSections.filter(gs => !(gs.grade === grade && gs.section === section))
      }));
      setGradeSectionSchedules(prev => prev.filter(gss => !(gss.grade === grade && gss.section === section)));
    } else {
      // Add to formData and create entry in gradeSectionSchedules
      setFormData(prev => ({
        ...prev,
        gradeSections: [...prev.gradeSections, { grade, section }]
      }));
      setGradeSectionSchedules(prev => [...prev, {
        grade,
        section,
        teacherId: '',
        schedules: [],
        expanded: false
      }]);
    }
  };

  // Helper function to check if two time ranges overlap
  const timeRangesOverlap = (start1: string, end1: string, start2: string, end2: string): boolean => {
    return start1 < end2 && start2 < end1;
  };

  // Check for scheduling conflicts
  const checkConflicts = async (gss: GradeSectionSchedule, schedule: Schedule, excludeClassIds: Set<string> = new Set()): Promise<string | null> => {
    try {
      const allClasses = await getAllClasses();

      for (const existingClass of allClasses) {
        // Skip if it's one of the classes we're currently editing
        if (excludeClassIds.has(existingClass.id || '')) continue;

        // Check if same day
        if (existingClass.dayOfWeek !== schedule.dayOfWeek) continue;

        // Check if times overlap
        if (!timeRangesOverlap(schedule.startTime, schedule.endTime, existingClass.startTime, existingClass.endTime)) continue;

        // CONFLICT 1: Same teacher teaching different classes at same time
        if (existingClass.teacherId === gss.teacherId) {
          const existingGS = existingClass.gradeSections[0];
          const isSameSection = existingGS.grade === gss.grade && existingGS.section === gss.section;

          if (!isSameSection || existingClass.className !== formData.className) {
            const teacher = teachers.find(t => t.id === gss.teacherId);
            return `Teacher ${teacher?.fullName || 'selected'} is already teaching "${existingClass.className}" to ${existingGS.grade} ${existingGS.section} on ${schedule.dayOfWeek} from ${existingClass.startTime} to ${existingClass.endTime}`;
          }
        }

        // CONFLICT 2: Same grade/section attending different classes at same time
        const existingGS = existingClass.gradeSections[0];
        if (existingGS.grade === gss.grade && existingGS.section === gss.section) {
          // Only conflict if it's a different class
          if (existingClass.className !== formData.className) {
            return `${gss.grade} Section ${gss.section} already has "${existingClass.className}" scheduled on ${schedule.dayOfWeek} from ${existingClass.startTime} to ${existingClass.endTime}`;
          }
        }
      }

      return null; // No conflicts
    } catch (error) {
      console.error('Error checking conflicts:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.gradeSections.length === 0) {
      alert('Please select at least one grade and section');
      return;
    }
    if (!selectedSubjectId) {
      alert('Please select a subject');
      return;
    }

    // Validate all grade/sections have assigned teachers and schedules
    for (const gradeSection of formData.gradeSections) {
      const gss = gradeSectionSchedules.find(g => g.grade === gradeSection.grade && g.section === gradeSection.section);
      if (!gss || !gss.teacherId) {
        alert(`Please assign a teacher for ${gradeSection.grade} - ${gradeSection.section}.`);
        return;
      }
      if (!gss.schedules || gss.schedules.length === 0) {
        alert(`Please add at least one schedule for ${gradeSection.grade} - ${gradeSection.section}.`);
        return;
      }
      // Validate times for each schedule
      for (const schedule of gss.schedules) {
        if (!schedule.startTime || !schedule.endTime) {
          alert(`Please fill in all time fields for ${gradeSection.grade} - ${gradeSection.section}`);
          return;
        }
        if (schedule.startTime >= schedule.endTime) {
          alert(`Invalid time range for ${gradeSection.grade} - ${gradeSection.section} on ${schedule.dayOfWeek}`);
          return;
        }
      }
    }

    // Check for conflicts with existing classes
    const excludeIds = relatedClasses ? new Set(relatedClasses.map(c => c.id || '')) : new Set<string>();
    for (const gss of gradeSectionSchedules) {
      if (!gss.teacherId) continue;

      for (const schedule of gss.schedules) {
        const conflict = await checkConflicts(gss, schedule, excludeIds);
        if (conflict) {
          alert(`Scheduling Conflict:\n\n${conflict}`);
          return;
        }
      }
    }

    try {
      if (classData && relatedClasses && relatedClasses.length > 0) {
        // EDITING MODE
        const existingClassIds = new Set(relatedClasses.map(c => c.id));
        const currentClassIds = new Set<string>();

        // Create or update classes for each grade/section × schedule combination
        for (const gss of gradeSectionSchedules) {
          const { grade, section, teacherId, schedules } = gss;
          if (!teacherId) continue;

          for (const schedule of schedules) {
            // Find matching existing class
            const matchingClass = relatedClasses.find(c =>
              c.dayOfWeek === schedule.dayOfWeek &&
              c.startTime === schedule.startTime &&
              c.endTime === schedule.endTime &&
              c.teacherId === teacherId &&
              c.gradeSections.length === 1 &&
              c.gradeSections[0].grade === grade &&
              c.gradeSections[0].section === section
            );

            if (matchingClass) {
              currentClassIds.add(matchingClass.id!);
              // Update if className changed
              if (matchingClass.className !== formData.className) {
                await updateClass(matchingClass.id!, {
                  className: formData.className,
                  teacherId,
                  gradeSections: [{ grade, section }],
                  dayOfWeek: schedule.dayOfWeek,
                  startTime: schedule.startTime,
                  endTime: schedule.endTime
                });
              }
            } else {
              // Create new class
              await createClass({
                className: formData.className,
                teacherId,
                gradeSections: [{ grade, section }],
                dayOfWeek: schedule.dayOfWeek,
                startTime: schedule.startTime,
                endTime: schedule.endTime
              });
            }
          }
        }

        // Delete classes that are no longer in the current configuration
        for (const classId of existingClassIds) {
          if (classId && !currentClassIds.has(classId)) {
            await deleteClass(classId);
          }
        }

        onSubmit({});
      } else {
        // CREATE MODE - Creating one class for each grade/section × schedule combination
        for (const gss of gradeSectionSchedules) {
          const { grade, section, teacherId, schedules } = gss;
          if (!teacherId) continue;

          for (const schedule of schedules) {
            const submitData = {
              className: formData.className,
              teacherId,
              gradeSections: [{ grade, section }],
              dayOfWeek: schedule.dayOfWeek,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
            };
            await createClass(submitData);
          }
        }

        onSubmit({});
      }
      onClose();
    } catch (error: any) {
      console.error('Submit error:', error);
      alert(error.response?.data?.message || 'Failed to save class');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{classData ? 'Edit Class' : 'Add New Class'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {classData && (
            <div style={{
              marginBottom: '16px',
              padding: '10px 16px',
              backgroundColor: '#f0f9ff',
              border: '2px solid #3b82f6',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 600,
              color: '#1e40af',
              textAlign: 'center'
            }}>
              Editing: {classData.className}
            </div>
          )}

          <div className="form-group">
            <label>Class Name *</label>
            <input
              type="text"
              value={formData.className}
              onChange={e => setFormData({ ...formData, className: e.target.value })}
              placeholder="e.g., Chemistry 101, Math Advanced"
              required
            />
          </div>

          <div className="form-group">
            <label>Subject *</label>
            <select
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value)}
              required
            >
              <option value="">Select Subject</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Grade & Section * (Select one or more)</label>
            <div className="grade-sections-toggle">
              <button
                type="button"
                onClick={() => setShowGradeSections(!showGradeSections)}
                className="toggle-btn"
              >
                {showGradeSections ? '▼ Hide Grades' : '▶ Show Grades'} ({formData.gradeSections.length} selected)
              </button>
            </div>

            {showGradeSections && (
              <div className="grade-sections-container">
                {GRADES.map(grade => (
                  <div key={grade} className="grade-section-group">
                    <div className="grade-label">{grade}</div>
                    <div className="sections-grid">
                      {SECTIONS.map(section => {
                        const isSelected = formData.gradeSections.some(gs => gs.grade === grade && gs.section === section);
                        return (
                          <button
                            key={section}
                            type="button"
                            onClick={() => toggleGradeSection(grade, section)}
                            className={`section-tag ${isSelected ? 'selected' : ''}`}
                          >
                            {section}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {formData.gradeSections.length > 0 && (
              <div className="selected-badges">
                {formData.gradeSections.map((gs, index) => (
                  <span key={index} className="selected-badge">
                    {gs.grade} - {gs.section}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Teacher Assignment and Schedules per Grade/Section */}
          {selectedSubjectId && gradeSectionSchedules.length > 0 && (
            <div className="form-group">
              <label>Assign Teachers and Schedules by Grade/Section *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {gradeSectionSchedules.map((gss, index) => {
                  const availableTeachers = getTeachersForSubject(selectedSubjectId);
                  const teacher = teachers.find(t => t.id === gss.teacherId);

                  return (
                    <div key={index} style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}>
                      {/* Header */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          backgroundColor: '#f9fafb',
                          cursor: 'pointer'
                        }}
                        onClick={() => toggleGradeSectionExpanded(gss.grade, gss.section)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '18px' }}>{gss.expanded ? '▼' : '▶'}</span>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '15px' }}>
                              {formData.className || 'New Class'} - {gss.grade} - {gss.section}
                            </div>
                            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                              {teacher ? `Teacher: ${teacher.fullName}` : 'No teacher assigned'} • {gss.schedules.length} schedule(s)
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {gss.expanded && (
                        <div style={{ padding: '16px', backgroundColor: '#ffffff' }}>
                          {/* Grade Header */}
                          <div style={{
                            marginBottom: '20px',
                            padding: '12px 16px',
                            backgroundColor: '#eff6ff',
                            borderLeft: '4px solid #3b82f6',
                            borderRadius: '4px'
                          }}>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e40af' }}>
                              {gss.grade}
                            </div>
                            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                              Section {gss.section} • {formData.className || 'New Class'}
                            </div>
                          </div>

                          {/* Teacher Selection */}
                          <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px', color: '#374151' }}>
                              Assign Teacher *
                            </label>
                            <select
                              value={gss.teacherId || ''}
                              onChange={(e) => setTeacherForGradeSection(gss.grade, gss.section, e.target.value)}
                              style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '2px solid #e5e7eb',
                                borderRadius: '8px',
                                fontSize: '14px',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                              }}
                              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                              required
                            >
                              <option value="">Select Teacher</option>
                              {availableTeachers.map(t => (
                                <option key={t.id} value={t.id}>{t.fullName}</option>
                              ))}
                            </select>
                          </div>

                          {/* Schedules */}
                          <div>
                            <label style={{ display: 'block', marginBottom: '12px', fontWeight: 600, fontSize: '14px', color: '#374151' }}>
                              Schedules (Day & Time) *
                            </label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {DAYS_OF_WEEK.map(day => {
                                const daySchedules = gss.schedules.filter(s => s.dayOfWeek === day);
                                return (
                                  <div key={day} style={{
                                    padding: '12px',
                                    backgroundColor: '#f9fafb',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e7eb'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: daySchedules.length > 0 ? '10px' : '0' }}>
                                      <span style={{ fontWeight: 600, fontSize: '14px', color: '#1f2937' }}>{day}</span>
                                      <button
                                        type="button"
                                        onClick={() => addScheduleToGradeSection(gss.grade, gss.section, day)}
                                        style={{
                                          padding: '6px 16px',
                                          fontSize: '13px',
                                          fontWeight: 500,
                                          backgroundColor: '#3b82f6',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '6px',
                                          cursor: 'pointer',
                                          transition: 'background-color 0.2s'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                                      >
                                        + Add Time
                                      </button>
                                    </div>
                                    {daySchedules.length > 0 && (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {daySchedules.map(schedule => (
                                          <div key={schedule.id} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '8px 12px',
                                            backgroundColor: '#ffffff',
                                            borderRadius: '6px',
                                            border: '1px solid #e5e7eb'
                                          }}>
                                            <input
                                              type="time"
                                              value={schedule.startTime}
                                              onChange={e => updateGradeSectionScheduleTime(gss.grade, gss.section, schedule.id, 'startTime', e.target.value)}
                                              required
                                              style={{
                                                padding: '8px 12px',
                                                border: '2px solid #e5e7eb',
                                                borderRadius: '6px',
                                                fontSize: '14px',
                                                outline: 'none'
                                              }}
                                            />
                                            <span style={{ fontWeight: 500, color: '#6b7280' }}>to</span>
                                            <input
                                              type="time"
                                              value={schedule.endTime}
                                              onChange={e => updateGradeSectionScheduleTime(gss.grade, gss.section, schedule.id, 'endTime', e.target.value)}
                                              required
                                              style={{
                                                padding: '8px 12px',
                                                border: '2px solid #e5e7eb',
                                                borderRadius: '6px',
                                                fontSize: '14px',
                                                outline: 'none'
                                              }}
                                            />
                                            <button
                                              type="button"
                                              onClick={() => removeScheduleFromGradeSection(gss.grade, gss.section, schedule.id)}
                                              style={{
                                                padding: '6px 10px',
                                                fontSize: '18px',
                                                fontWeight: 600,
                                                color: '#ffffff',
                                                backgroundColor: '#ef4444',
                                                border: 'none',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                transition: 'background-color 0.2s',
                                                lineHeight: 1
                                              }}
                                              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                                              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-submit">
              {classData ? 'Update Class' : 'Add Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClassModal;
