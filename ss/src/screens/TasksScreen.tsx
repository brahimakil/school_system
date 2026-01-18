import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { homeworkAPI, Homework, HomeworkStatus, submissionAPI, Submission } from '../services/api';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';

const TasksScreen: React.FC = () => {
  const { student } = useAuth();
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [submissions, setSubmissions] = useState<{ [homeworkId: string]: Submission }>({});
  const [loading, setLoading] = useState(true);
  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null);
  const [textContent, setTextContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'needsSubmission' | 'pastDue' | 'submitted'>('all');

  useFocusEffect(
    React.useCallback(() => {
      if (student) {
        fetchHomeworks();
      }
    }, [student])
  );

  const fetchHomeworks = async () => {
    if (!student) return;

    try {
      setLoading(true);
      const response = await homeworkAPI.getMyHomework(
        student.currentGrade.grade,
        student.currentGrade.section
      );

      if (response.success) {
        setHomeworks(response.data);

        // Fetch submissions for each homework
        const submissionsMap: { [homeworkId: string]: Submission } = {};
        await Promise.all(
          response.data.map(async (homework) => {
            const subResponse = await submissionAPI.getByHomeworkAndStudent(homework.id, student.uid);
            if (subResponse.success && subResponse.data) {
              submissionsMap[homework.id] = subResponse.data;
            }
          })
        );
        setSubmissions(submissionsMap);
      }
    } catch (error) {
      console.error('Failed to fetch homeworks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHomework = (homework: Homework) => {
    setSelectedHomework(homework);
    const submission = submissions[homework.id];
    if (submission) {
      setTextContent(submission.textContent || '');
      setFileName(submission.fileName || '');
      setFileUrl(submission.fileUrl || '');
    } else {
      setTextContent('');
      setFileName('');
      setFileUrl('');
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setFileName(file.name);

        // Upload file to backend
        Alert.alert('Uploading', 'Please wait while the file is being uploaded...');
        const uploadedUrl = await uploadFile(file);

        if (uploadedUrl) {
          setFileUrl(uploadedUrl);
          Alert.alert('Success', 'File uploaded successfully');
        } else {
          Alert.alert('Error', 'Failed to upload file');
        }
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const uploadFile = async (file: any): Promise<string | null> => {
    try {
      const formData = new FormData();

      // For React Native, we need to create a file blob
      const response = await fetch(file.uri);
      const blob = await response.blob();

      formData.append('file', {
        uri: file.uri,
        type: file.mimeType || 'application/octet-stream',
        name: file.name,
      } as any);

      const uploadResponse = await fetch('http://192.168.0.103:3000/uploads/file', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await uploadResponse.json();

      if (data.success && data.data.fileUrl) {
        return data.data.fileUrl;
      }

      return null;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!selectedHomework || !student) return;

    if (!textContent.trim() && !fileUrl) {
      Alert.alert('Error', 'Please provide either text content or upload a file');
      return;
    }

    try {
      setSubmitting(true);
      const existingSubmission = submissions[selectedHomework.id];

      if (existingSubmission) {
        // Update existing submission
        const response = await submissionAPI.update(existingSubmission.id, {
          textContent: textContent.trim() || undefined,
          fileUrl: fileUrl || undefined,
          fileName: fileName || undefined,
        });

        if (response.success) {
          setSubmissions({
            ...submissions,
            [selectedHomework.id]: response.data,
          });
          Alert.alert('Success', 'Submission updated successfully!');
          setSelectedHomework(null); // Close detail view
        }
      } else {
        // Create new submission
        const response = await submissionAPI.create({
          homeworkId: selectedHomework.id,
          studentId: student.uid,
          studentName: student.fullName,
          textContent: textContent.trim() || undefined,
          fileUrl: fileUrl || undefined,
          fileName: fileName || undefined,
        });

        if (response.success) {
          setSubmissions({
            ...submissions,
            [selectedHomework.id]: response.data,
          });
          Alert.alert('Success', 'Submission created successfully!');
          setSelectedHomework(null); // Close detail view
        }
      }
    } catch (error: any) {
      console.error('Failed to submit:', error);
      Alert.alert('Error', error.message || 'Failed to submit homework');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: HomeworkStatus) => {
    switch (status) {
      case HomeworkStatus.ACTIVE:
        return '#10b981';
      case HomeworkStatus.PENDING:
        return '#f59e0b';
      case HomeworkStatus.COMPLETED:
        return '#6b7280';
      case HomeworkStatus.PAST_DUE:
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = (status: HomeworkStatus) => {
    switch (status) {
      case HomeworkStatus.ACTIVE:
        return 'Active';
      case HomeworkStatus.PENDING:
        return 'Pending';
      case HomeworkStatus.COMPLETED:
        return 'Completed';
      case HomeworkStatus.PAST_DUE:
        return 'Past Due';
      default:
        return status;
    }
  };

  const isSubmissionAllowed = (homework: Homework, submission?: Submission) => {
    // Cannot submit if homework is not active
    if (homework.status !== HomeworkStatus.ACTIVE) {
      return false;
    }

    // Cannot edit if already graded
    if (submission && submission.grade !== null && submission.grade !== undefined) {
      return false;
    }

    // Cannot submit/edit if past due date
    const dueDate = new Date(homework.dueDate);
    if (new Date() > dueDate) {
      return false;
    }

    return true;
  };

  const canEditSubmission = (homework: Homework, submission?: Submission) => {
    if (!submission) return false;

    // Cannot edit if graded
    if (submission.grade !== null && submission.grade !== undefined) {
      return false;
    }

    // Can edit if homework is active and not past due
    return isSubmissionAllowed(homework, submission);
  };

  const getFilteredHomeworks = () => {
    return homeworks.filter((homework) => {
      const submission = submissions[homework.id];
      const isPastDue = new Date(homework.dueDate) < new Date();

      switch (filter) {
        case 'pending':
          return homework.status === HomeworkStatus.PENDING;
        case 'active':
          return homework.status === HomeworkStatus.ACTIVE && !isPastDue;
        case 'needsSubmission':
          return homework.status === HomeworkStatus.ACTIVE && !submission && !isPastDue;
        case 'pastDue':
          return isPastDue && !submission;
        case 'submitted':
          return !!submission;
        case 'all':
        default:
          return true;
      }
    });
  };

  const getFilterCount = (filterType: typeof filter) => {
    const count = homeworks.filter((homework) => {
      const submission = submissions[homework.id];
      const isPastDue = new Date(homework.dueDate) < new Date();

      switch (filterType) {
        case 'pending':
          return homework.status === HomeworkStatus.PENDING;
        case 'active':
          return homework.status === HomeworkStatus.ACTIVE && !isPastDue;
        case 'needsSubmission':
          return homework.status === HomeworkStatus.ACTIVE && !submission && !isPastDue;
        case 'pastDue':
          return isPastDue && !submission;
        case 'submitted':
          return !!submission;
        case 'all':
        default:
          return true;
      }
    }).length;
    return count;
  };

  if (selectedHomework) {
    const submission = submissions[selectedHomework.id];
    const canSubmit = isSubmissionAllowed(selectedHomework, submission);
    const canEdit = canEditSubmission(selectedHomework, submission);
    const isGraded = submission && submission.grade !== null && submission.grade !== undefined;
    const isPastDue = new Date(selectedHomework.dueDate) < new Date();

    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.detailsHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelectedHomework(null)}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.detailsTitle}>{selectedHomework.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedHomework.status) }]}>
              <Text style={styles.statusText}>{getStatusText(selectedHomework.status)}</Text>
            </View>
          </View>

          <View style={styles.detailsCard}>
            <View style={styles.detailsSection}>
              <Text style={styles.detailsLabel}>Class</Text>
              <Text style={styles.detailsValue}>{selectedHomework.className}</Text>
            </View>

            <View style={styles.detailsSection}>
              <Text style={styles.detailsLabel}>Subject</Text>
              <Text style={styles.detailsValue}>{selectedHomework.subject}</Text>
            </View>

            <View style={styles.detailsSection}>
              <Text style={styles.detailsLabel}>Description</Text>
              <Text style={styles.detailsValue}>{selectedHomework.description}</Text>
            </View>

            <View style={styles.detailsSection}>
              <Text style={styles.detailsLabel}>Due Date</Text>
              <View style={styles.dueDateRow}>
                <Ionicons name="calendar" size={18} color="#6366f1" />
                <Text style={styles.dueDate}>
                  {new Date(selectedHomework.dueDate).toLocaleString()}
                </Text>
              </View>
            </View>

            {selectedHomework.attachmentUrl && (
              <TouchableOpacity
                style={styles.attachmentButton}
                onPress={() => {
                  Linking.openURL(selectedHomework.attachmentUrl!).catch(() => {
                    Alert.alert('Error', 'Unable to open attachment');
                  });
                }}
              >
                <Ionicons name="document-attach" size={24} color="#fff" />
                <Text style={styles.attachmentButtonText}>VIEW ATTACHED MEDIA</Text>
              </TouchableOpacity>
            )}

            {!canSubmit && selectedHomework.status === HomeworkStatus.PENDING && (
              <View style={styles.infoBox}>
                <Ionicons name="hourglass-outline" size={18} color="#92400e" />
                <Text style={styles.infoText}>This task is pending and not yet accepting submissions</Text>
              </View>
            )}

            {isPastDue && !submission && (
              <View style={[styles.infoBox, { backgroundColor: '#fee2e2' }]}>
                <Ionicons name="alarm" size={18} color="#991b1b" />
                <Text style={[styles.infoText, { color: '#991b1b' }]}>Submission deadline has passed</Text>
              </View>
            )}

            {isGraded && (
              <View style={styles.gradeCard}>
                <View style={styles.gradeHeader}>
                  <Ionicons name="bar-chart" size={20} color="#065f46" />
                  <Text style={styles.gradeTitle}>Teacher's Feedback</Text>
                </View>
                <View style={styles.gradeRow}>
                  <Text style={styles.gradeLabel}>Grade:</Text>
                  <Text style={styles.gradeValue}>{submission?.grade}/100</Text>
                </View>
                {submission?.teacherFeedback && (
                  <View style={styles.feedbackSection}>
                    <Text style={styles.feedbackLabel}>Feedback:</Text>
                    <Text style={styles.feedbackText}>{submission.teacherFeedback}</Text>
                  </View>
                )}
                {submission?.gradedAt && (
                  <Text style={styles.gradedTime}>
                    Graded on: {new Date(submission.gradedAt._seconds * 1000).toLocaleString()}
                  </Text>
                )}
              </View>
            )}
          </View>

          <View style={styles.submissionSection}>
            <View style={styles.submissionTitleRow}>
              <Ionicons name={submission ? "checkmark-circle" : "create"} size={22} color={submission ? "#10b981" : "#6366f1"} />
              <Text style={styles.submissionTitle}>
                {submission ? 'Your Submission' : 'Submit Your Work'}
              </Text>
            </View>

            {isGraded && (
              <View style={styles.warningBox}>
                <Ionicons name="lock-closed" size={16} color="#92400e" />
                <Text style={styles.warningText}>This submission has been graded and can no longer be edited</Text>
              </View>
            )}

            {!isGraded && isPastDue && (
              <View style={styles.warningBox}>
                <Ionicons name="lock-closed" size={16} color="#92400e" />
                <Text style={styles.warningText}>Deadline has passed - no more edits allowed</Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Text Answer</Text>
              <TextInput
                style={[styles.textArea, (!canSubmit && !canEdit) && styles.disabledInput]}
                placeholder="Type your answer here..."
                value={textContent}
                onChangeText={setTextContent}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                editable={canSubmit || canEdit}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Upload Document (Optional)</Text>
              <TouchableOpacity
                style={[styles.uploadButton, (!canSubmit && !canEdit) && styles.disabledButton]}
                onPress={handlePickDocument}
                disabled={!canSubmit && !canEdit}
              >
                <Ionicons name={fileName ? "document-attach" : "cloud-upload"} size={20} color={(!canSubmit && !canEdit) ? "#9ca3af" : "#6366f1"} />
                <Text style={styles.uploadButtonText}>
                  {fileName ? fileName : 'Choose File'}
                </Text>
              </TouchableOpacity>
            </View>

            {(canSubmit || canEdit) && (
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {submission ? 'Update Submission' : 'Submit Homework'}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {submission && (
              <View style={styles.submissionInfo}>
                <Text style={styles.submissionInfoText}>
                  Last updated: {new Date(submission.updatedAt._seconds * 1000).toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Tasks</Text>
        <Text style={styles.headerSubtitle}>
          {student?.currentGrade.grade} - Section {student?.currentGrade.section}
        </Text>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading tasks...</Text>
        </View>
      )}

      {!loading && homeworks.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="clipboard-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No Tasks Yet</Text>
          <Text style={styles.emptyText}>
            Your homework assignments will appear here when teachers create them.
          </Text>
        </View>
      )}

      {!loading && homeworks.length > 0 && (
        <>
          {/* Statistics Overview */}
          <View style={styles.statsOverview}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{getFilterCount('needsSubmission')}</Text>
              <Text style={styles.statLabel}>To Submit</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#10b981' }]}>{getFilterCount('submitted')}</Text>
              <Text style={styles.statLabel}>Submitted</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#ef4444' }]}>{getFilterCount('pastDue')}</Text>
              <Text style={styles.statLabel}>Past Due</Text>
            </View>
          </View>

          {/* Filters */}
          <View style={styles.filtersWrapper}>
            <Text style={styles.filtersTitle}>Filter by:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterContent}
            >
              <TouchableOpacity
                style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
                onPress={() => setFilter('all')}
              >
                <Text style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>
                  All
                </Text>
                <View style={[styles.filterChipBadge, filter === 'all' && styles.filterChipBadgeActive]}>
                  <Text style={[styles.filterChipBadgeText, filter === 'all' && styles.filterChipBadgeTextActive]}>
                    {getFilterCount('all')}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, filter === 'needsSubmission' && styles.filterChipActive]}
                onPress={() => setFilter('needsSubmission')}
              >
                <Ionicons name="create" size={16} color={filter === 'needsSubmission' ? "#fff" : "#6b7280"} />
                <Text style={[styles.filterChipText, filter === 'needsSubmission' && styles.filterChipTextActive]}>
                  To Submit
                </Text>
                <View style={[styles.filterChipBadge, filter === 'needsSubmission' && styles.filterChipBadgeActive]}>
                  <Text style={[styles.filterChipBadgeText, filter === 'needsSubmission' && styles.filterChipBadgeTextActive]}>
                    {getFilterCount('needsSubmission')}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, filter === 'submitted' && styles.filterChipActive]}
                onPress={() => setFilter('submitted')}
              >
                <Ionicons name="checkmark-circle" size={16} color={filter === 'submitted' ? "#fff" : "#6b7280"} />
                <Text style={[styles.filterChipText, filter === 'submitted' && styles.filterChipTextActive]}>
                  Submitted
                </Text>
                <View style={[styles.filterChipBadge, filter === 'submitted' && styles.filterChipBadgeActive]}>
                  <Text style={[styles.filterChipBadgeText, filter === 'submitted' && styles.filterChipBadgeTextActive]}>
                    {getFilterCount('submitted')}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, filter === 'active' && styles.filterChipActive]}
                onPress={() => setFilter('active')}
              >
                <Ionicons name="radio-button-on" size={16} color={filter === 'active' ? "#fff" : "#10b981"} />
                <Text style={[styles.filterChipText, filter === 'active' && styles.filterChipTextActive]}>
                  Active
                </Text>
                <View style={[styles.filterChipBadge, filter === 'active' && styles.filterChipBadgeActive]}>
                  <Text style={[styles.filterChipBadgeText, filter === 'active' && styles.filterChipBadgeTextActive]}>
                    {getFilterCount('active')}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, filter === 'pastDue' && styles.filterChipActive]}
                onPress={() => setFilter('pastDue')}
              >
                <Ionicons name="alarm" size={16} color={filter === 'pastDue' ? "#fff" : "#ef4444"} />
                <Text style={[styles.filterChipText, filter === 'pastDue' && styles.filterChipTextActive]}>
                  Past Due
                </Text>
                <View style={[styles.filterChipBadge, filter === 'pastDue' && styles.filterChipBadgeActive]}>
                  <Text style={[styles.filterChipBadgeText, filter === 'pastDue' && styles.filterChipBadgeTextActive]}>
                    {getFilterCount('pastDue')}
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Tasks List */}
          <View style={styles.tasksContainer}>
            {getFilteredHomeworks().map((homework) => {
              const submission = submissions[homework.id];
              const isGraded = submission && submission.grade !== null && submission.grade !== undefined;
              const isPastDue = new Date(homework.dueDate) < new Date();

              return (
                <TouchableOpacity
                  key={homework.id}
                  style={styles.taskCard}
                  onPress={() => handleSelectHomework(homework)}
                  activeOpacity={0.7}
                >
                  {/* Card Header with Title and Status */}
                  <View style={styles.taskCardHeader}>
                    <View style={styles.taskTitleContainer}>
                      <Text style={styles.taskTitle} numberOfLines={2}>{homework.title}</Text>
                      {submission && (
                        <View style={styles.submissionStatusBadge}>
                          <Ionicons name={isGraded ? "star" : "checkmark-circle"} size={12} color="#065f46" />
                          <Text style={styles.submissionStatusText}>
                            {isGraded ? `Graded: ${submission.grade}/100` : 'Submitted'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Class and Subject Info */}
                  <View style={styles.taskMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="book" size={14} color="#6b7280" />
                      <Text style={styles.metaText}>{homework.className}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="reader" size={14} color="#6b7280" />
                      <Text style={styles.metaText}>{homework.subject}</Text>
                    </View>
                  </View>

                  {/* Description */}
                  <Text style={styles.taskDescription} numberOfLines={2}>
                    {homework.description}
                  </Text>

                  {/* Footer with Due Date and Action */}
                  <View style={styles.taskCardFooter}>
                    <View style={styles.dueDateContainer}>
                      <Text style={styles.dueDateLabel}>Due Date:</Text>
                      <Text style={[styles.dueDateValue, isPastDue && !submission && styles.overdueDateValue]}>
                        {new Date(homework.dueDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
                    <View style={styles.actionIndicator}>
                      <Text style={styles.actionArrow}>→</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  statsOverview: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 12,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  filtersWrapper: {
    backgroundColor: '#fff',
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  filtersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginRight: 6,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  filterChipBadge: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  filterChipBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterChipBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
  },
  filterChipBadgeTextActive: {
    color: '#fff',
  },
  tasksContainer: {
    padding: 20,
    paddingTop: 16,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  taskCardHeader: {
    marginBottom: 12,
  },
  taskTitleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  taskTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    lineHeight: 24,
  },
  submissionStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  submissionStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065f46',
  },
  taskMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  taskDescription: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  taskCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  dueDateContainer: {
    flex: 1,
  },
  dueDateLabel: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  dueDateValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366f1',
  },
  overdueDateValue: {
    color: '#ef4444',
  },
  actionIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionArrow: {
    fontSize: 18,
    color: '#6366f1',
    fontWeight: 'bold',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    paddingVertical: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  detailsHeader: {
    backgroundColor: '#fff',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '600',
  },
  detailsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  detailsCard: {
    backgroundColor: '#fff',
    margin: 24,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  detailsSection: {
    marginBottom: 16,
  },
  detailsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  detailsValue: {
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 22,
  },
  dueDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6366f1',
    marginLeft: 6,
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#92400e',
    textAlign: 'center',
  },
  submissionSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  submissionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  submissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 16,
  },
  uploadButtonText: {
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  submissionInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  submissionInfoText: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
  gradeCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
    borderColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  gradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  gradeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#065f46',
  },
  gradeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  gradeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065f46',
  },
  gradeValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
  },
  feedbackSection: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#d1fae5',
  },
  feedbackLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065f46',
    marginBottom: 6,
  },
  feedbackText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  gradedTime: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 14,
    color: '#92400e',
    textAlign: 'center',
    fontWeight: '600',
  },
  disabledInput: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
  disabledButton: {
    backgroundColor: '#f3f4f6',
    opacity: 0.6,
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 12,
    gap: 8,
  },
  attachmentButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default TasksScreen;
