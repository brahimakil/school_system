import React, { useState, useEffect } from 'react';
import type { Class, CreateClassData, UpdateClassData } from '../services/classes.api';
import { deleteClass, createClass, updateClass } from '../services/classes.api';
import { teachersAPI } from '../services/teachers.api';
import './TeacherModal.css';

interface Teacher {
  id: string;
  fullName: string;
}

const GRADES = ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];
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

const ClassModal: React.FC<ClassModalProps> = ({ isOpen, onClose, onSubmit, classData, relatedClasses = [] }) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [showGradeSections, setShowGradeSections] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [originalSchedules, setOriginalSchedules] = useState<Schedule[]>([]); // Track original schedules
  const [formData, setFormData] = useState<CreateClassData>({
    className: '',
    teacherId: '',
    gradeSections: [],
    dayOfWeek: '',
    startTime: '',
    endTime: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadTeachers();
      if (classData) {
        setFormData({
          className: classData.className,
          teacherId: classData.teacherId,
          gradeSections: classData.gradeSections,
          dayOfWeek: classData.dayOfWeek,
          startTime: classData.startTime,
          endTime: classData.endTime,
        });
        
        // If we have related classes, load all their schedules
        if (relatedClasses && relatedClasses.length > 0) {
          console.log('=== LOADING RELATED SCHEDULES ===');
          const allSchedules = relatedClasses.map(c => ({
            id: c.id || Date.now().toString(),
            dayOfWeek: c.dayOfWeek,
            startTime: c.startTime,
            endTime: c.endTime,
          }));
          console.log('All schedules loaded:', allSchedules);
          setSchedules(allSchedules);
          setOriginalSchedules(allSchedules); // Store original for comparison
        } else {
          // Fallback to single schedule
          const schedule = {
            id: Date.now().toString(),
            dayOfWeek: classData.dayOfWeek,
            startTime: classData.startTime,
            endTime: classData.endTime,
          };
          setSchedules([schedule]);
          setOriginalSchedules([schedule]);
        }
        
        setShowGradeSections(classData.gradeSections.length > 0);
      } else {
        setFormData({
          className: '',
          teacherId: '',
          gradeSections: [],
          dayOfWeek: '',
          startTime: '',
          endTime: '',
        });
        setSchedules([]);
        setOriginalSchedules([]);
        setShowGradeSections(false);
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

  const toggleGradeSection = (grade: string, section: string) => {
    const exists = formData.gradeSections.some(gs => gs.grade === grade && gs.section === section);
    if (exists) {
      setFormData(prev => ({
        ...prev,
        gradeSections: prev.gradeSections.filter(gs => !(gs.grade === grade && gs.section === section))
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        gradeSections: [...prev.gradeSections, { grade, section }]
      }));
    }
  };

  const addSchedule = (day: string) => {
    setSchedules(prev => [...prev, { 
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, 
      dayOfWeek: day, 
      startTime: '08:00', 
      endTime: '09:00' 
    }]);
  };

  const removeSchedule = (id: string) => {
    setSchedules(prev => prev.filter(s => s.id !== id));
  };

  const updateScheduleTime = (id: string, field: 'startTime' | 'endTime', value: string) => {
    setSchedules(prev => prev.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('=== SUBMIT STARTED ===');
    console.log('Form Data:', formData);
    console.log('Schedules:', schedules);
    console.log('Is Editing?', !!classData);
    console.log('Related Classes:', relatedClasses);
    
    if (formData.gradeSections.length === 0) {
      alert('Please select at least one grade and section');
      return;
    }
    if (schedules.length === 0) {
      alert('Please add at least one schedule (day and time)');
      return;
    }

    // Validate all schedules have valid times
    for (const schedule of schedules) {
      if (!schedule.startTime || !schedule.endTime) {
        alert('Please fill in all time fields for each schedule');
        return;
      }
      if (schedule.startTime >= schedule.endTime) {
        alert(`Invalid time range for ${schedule.dayOfWeek}: Start time must be before end time`);
        return;
      }
    }

    try {
      if (classData && relatedClasses && relatedClasses.length > 0) {
        console.log('EDITING MODE - Comparing and updating schedules');
        console.log('Original schedules:', originalSchedules);
        console.log('Current schedules:', schedules);
        
        // Find schedules to delete (in original but not in current)
        const schedulesToDelete = originalSchedules.filter(orig => 
          !schedules.some(curr => curr.id === orig.id)
        );
        
        // Find schedules to update (in both, check if changed)
        const schedulesToUpdate = schedules.filter(curr => 
          originalSchedules.some(orig => orig.id === curr.id)
        );
        
        // Find schedules to create (in current but not in original)
        const schedulesToCreate = schedules.filter(curr => 
          !originalSchedules.some(orig => orig.id === curr.id)
        );
        
        console.log('To delete:', schedulesToDelete);
        console.log('To update:', schedulesToUpdate);
        console.log('To create:', schedulesToCreate);
        
        // Delete removed schedules
        for (const schedule of schedulesToDelete) {
          console.log('Deleting schedule:', schedule.id);
          await deleteClass(schedule.id);
        }
        
        // Update existing schedules
        for (const schedule of schedulesToUpdate) {
          const original = originalSchedules.find(o => o.id === schedule.id);
          // Only update if something changed
          if (original && (
            original.dayOfWeek !== schedule.dayOfWeek ||
            original.startTime !== schedule.startTime ||
            original.endTime !== schedule.endTime ||
            JSON.stringify(formData.gradeSections) !== JSON.stringify(classData.gradeSections) ||
            formData.className !== classData.className ||
            formData.teacherId !== classData.teacherId
          )) {
            console.log('Updating schedule:', schedule.id);
            await updateClass(schedule.id, {
              className: formData.className,
              teacherId: formData.teacherId,
              gradeSections: formData.gradeSections,
              dayOfWeek: schedule.dayOfWeek,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
            });
          } else {
            console.log('Schedule unchanged, skipping:', schedule.id);
          }
        }
        
        // Create new schedules
        for (const schedule of schedulesToCreate) {
          console.log('Creating new schedule:', schedule);
          await createClass({
            className: formData.className,
            teacherId: formData.teacherId,
            gradeSections: formData.gradeSections,
            dayOfWeek: schedule.dayOfWeek,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
          });
        }
        
        // Notify parent that we're done (just for refresh)
        onSubmit({});
      } else {
        console.log('CREATE MODE - Creating', schedules.length, 'class entries');
        // When creating, create one class entry for each schedule
        for (let i = 0; i < schedules.length; i++) {
          const schedule = schedules[i];
          const submitData = {
            className: formData.className,
            teacherId: formData.teacherId,
            gradeSections: formData.gradeSections,
            dayOfWeek: schedule.dayOfWeek,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
          };
          console.log(`Creating class ${i + 1}/${schedules.length}:`, submitData);
          await createClass(submitData);
          console.log(`Class ${i + 1} created successfully`);
        }
        
        // Notify parent that we're done (just for refresh)
        onSubmit({});
      }
      console.log('=== SUBMIT COMPLETED ===');
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
          <div className="form-group">
            <label>Class Name *</label>
            <input
              type="text"
              value={formData.className}
              onChange={e => setFormData({...formData, className: e.target.value})}
              placeholder="e.g., Chemistry, Mathematics, Physics"
              required
            />
          </div>

          <div className="form-group">
            <label>Teacher *</label>
            <select
              value={formData.teacherId}
              onChange={e => setFormData({...formData, teacherId: e.target.value})}
              required
            >
              <option value="">Select Teacher</option>
              {teachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>
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

          <div className="form-group">
            <label>Schedule * (Select days and add time slots)</label>
            <div className="schedule-builder">
              {DAYS_OF_WEEK.map(day => {
                const daySchedules = schedules.filter(s => s.dayOfWeek === day);
                return (
                  <div key={day} className="day-schedule-group">
                    <div className="day-header">
                      <span className="day-name">{day}</span>
                      <button
                        type="button"
                        onClick={() => addSchedule(day)}
                        className="add-time-btn"
                      >
                        + Add Time
                      </button>
                    </div>
                    {daySchedules.length > 0 && (
                      <div className="day-time-slots">
                        {daySchedules.map(schedule => (
                          <div key={schedule.id} className="time-slot">
                            <input
                              type="time"
                              value={schedule.startTime}
                              onChange={e => updateScheduleTime(schedule.id, 'startTime', e.target.value)}
                              required
                            />
                            <span>to</span>
                            <input
                              type="time"
                              value={schedule.endTime}
                              onChange={e => updateScheduleTime(schedule.id, 'endTime', e.target.value)}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => removeSchedule(schedule.id)}
                              className="remove-time-btn"
                            >
                              ×
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
