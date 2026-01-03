import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { quizAPI, quizResultAPI, Quiz, QuizResult, QuizQuestion } from '../services/api';
import { useFocusEffect } from '@react-navigation/native';

const QuizzesScreen: React.FC = () => {
  const { student } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [results, setResults] = useState<{ [quizId: string]: QuizResult }>({});
  const [loading, setLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [questionIndex: number]: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [quizStartTime, setQuizStartTime] = useState<Date | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      if (student) {
        fetchQuizzes();
      }
    }, [student])
  );

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (selectedQuiz && quizStartTime && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedQuiz, quizStartTime, timeRemaining]);

  const fetchQuizzes = async () => {
    if (!student) return;

    try {
      setLoading(true);
      const response = await quizAPI.getMyQuizzes(
        student.currentGrade.grade,
        student.currentGrade.section
      );
      
      if (response.success) {
        const availableQuizzes = response.data.filter(q => q.status === 'available');
        setQuizzes(availableQuizzes);
        
        // Fetch results for each quiz
        const resultsMap: { [quizId: string]: QuizResult } = {};
        await Promise.all(
          availableQuizzes.map(async (quiz) => {
            const resultResponse = await quizResultAPI.getByQuizAndStudent(quiz.id, student.uid);
            if (resultResponse.success && resultResponse.data) {
              resultsMap[quiz.id] = resultResponse.data;
            }
          })
        );
        setResults(resultsMap);
      }
    } catch (error: any) {
      console.error('Error fetching quizzes:', error);
      Alert.alert('Error', error.message || 'Failed to fetch quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = async (quiz: Quiz) => {
    try {
      const fullQuiz = await quizAPI.getQuizById(quiz.id);
      setSelectedQuiz(fullQuiz);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setQuizStartTime(new Date());
      setTimeRemaining(fullQuiz.quizDurationMinutes * 60); // Convert to seconds
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load quiz');
    }
  };

  const handleAnswerSelect = (answer: string) => {
    setAnswers({
      ...answers,
      [currentQuestionIndex]: answer,
    });
  };

  const handleNext = () => {
    if (selectedQuiz && currentQuestionIndex < selectedQuiz.questions!.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleAutoSubmit = () => {
    Alert.alert('Time Up!', 'Your quiz time has expired. Submitting your answers...');
    handleSubmitQuiz();
  };

  const handleSubmitQuiz = async () => {
    if (!selectedQuiz || !student) return;

    const unansweredCount = selectedQuiz.questions!.length - Object.keys(answers).length;
    if (unansweredCount > 0) {
      Alert.alert(
        'Incomplete Quiz',
        `You have ${unansweredCount} unanswered question(s). Do you want to submit anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit', onPress: () => submitQuiz() }
        ]
      );
    } else {
      submitQuiz();
    }
  };

  const submitQuiz = async () => {
    if (!selectedQuiz || !student) return;

    try {
      setSubmitting(true);
      const formattedAnswers = Object.entries(answers).map(([index, answer]) => {
        const question = selectedQuiz.questions?.[parseInt(index)];
        // Convert answer text to letter (A, B, C, D)
        const answerIndex = question?.answers.indexOf(answer);
        const answerLetter = answerIndex !== undefined && answerIndex !== -1 
          ? String.fromCharCode(65 + answerIndex) // 65 is 'A' in ASCII
          : answer;
        
        return {
          questionIndex: parseInt(index),
          selectedAnswer: answerLetter,
        };
      });

      const response = await quizResultAPI.submit({
        quizId: selectedQuiz.id,
        studentId: student.uid,
        studentName: student.fullName,
        answers: formattedAnswers,
      });

      if (response.success) {
        setQuizResult(response.data);
        setShowResults(true);
        setSelectedQuiz(null);
        await fetchQuizzes(); // Refresh to update results
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderQuizCard = (quiz: Quiz) => {
    const result = results[quiz.id];
    const hasCompleted = !!result;

    return (
      <View key={quiz.id} style={styles.quizCard}>
        <View style={styles.quizHeader}>
          <Text style={styles.quizTitle}>{quiz.title}</Text>
          <View style={[styles.statusBadge, hasCompleted ? styles.completedBadge : styles.availableBadge]}>
            <Text style={styles.statusText}>{hasCompleted ? 'Completed' : 'Available'}</Text>
          </View>
        </View>
        
        <Text style={styles.className}>{quiz.className}</Text>
        <Text style={styles.description}>{quiz.description}</Text>
        
        <View style={styles.quizInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="#6b7280" />
            <Text style={styles.infoText}>Duration: {quiz.quizDurationMinutes} min</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="bar-chart-outline" size={16} color="#6b7280" />
            <Text style={styles.infoText}>Total Marks: {quiz.totalMarks}</Text>
          </View>
        </View>

        <View style={styles.dateInfo}>
          <Text style={styles.dateText}>Ends: {new Date(quiz.endDateTime).toLocaleString()}</Text>
        </View>

        {hasCompleted ? (
          <View style={styles.resultContainer}>
            <Text style={styles.scoreText}>
              Score: {result.totalScore}/{result.totalMarks} ({result.percentage}%)
            </Text>
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => {
                setQuizResult(result);
                setShowResults(true);
              }}
            >
              <Text style={styles.viewButtonText}>View Results</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => handleStartQuiz(quiz)}
          >
            <Text style={styles.startButtonText}>Start Quiz</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderQuizTaking = () => {
    if (!selectedQuiz || !selectedQuiz.questions) return null;

    const question = selectedQuiz.questions[currentQuestionIndex];
    const totalQuestions = selectedQuiz.questions.length;
    const selectedAnswer = answers[currentQuestionIndex];

    return (
      <Modal visible={true} animationType="slide">
        <View style={styles.quizModal}>
          <View style={styles.quizModalHeader}>
            <Text style={styles.quizModalTitle}>{selectedQuiz.title}</Text>
            <View style={styles.timerContainer}>
              <Ionicons name="time" size={18} color="#fff" style={{ marginRight: 4 }} />
              <Text style={[styles.timerText, timeRemaining < 60 && styles.timerWarning]}>
                {formatTime(timeRemaining)}
              </Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }]} />
            </View>
          </View>

          <ScrollView style={styles.questionContainer}>
            <Text style={styles.questionText}>{question.question}</Text>
            <Text style={styles.marksText}>[{question.marks} marks]</Text>

            <View style={styles.answersContainer}>
              {question.answers.map((answer, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.answerOption,
                    selectedAnswer === answer && styles.selectedAnswer
                  ]}
                  onPress={() => handleAnswerSelect(answer)}
                >
                  <View style={styles.radioCircle}>
                    {selectedAnswer === answer && <View style={styles.radioSelected} />}
                  </View>
                  <Text style={styles.answerText}>{answer}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.navigationButtons}>
            <TouchableOpacity
              style={[styles.navButton, currentQuestionIndex === 0 && styles.navButtonDisabled]}
              onPress={handlePrevious}
              disabled={currentQuestionIndex === 0}
            >
              <Text style={styles.navButtonText}>← Previous</Text>
            </TouchableOpacity>

            {currentQuestionIndex === totalQuestions - 1 ? (
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmitQuiz}
                disabled={submitting}
              >
                <Text style={styles.submitButtonText}>
                  {submitting ? 'Submitting...' : 'Submit Quiz'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.navButton}
                onPress={handleNext}
              >
                <Text style={styles.navButtonText}>Next →</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              Alert.alert(
                'Exit Quiz',
                'Are you sure? Your progress will be lost.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Exit', onPress: () => setSelectedQuiz(null), style: 'destructive' }
                ]
              );
            }}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>
    );
  };

  const renderResults = () => {
    if (!quizResult || !showResults) return null;

    return (
      <Modal visible={true} animationType="slide">
        <View style={styles.resultsModal}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>Quiz Results</Text>
            <TouchableOpacity onPress={() => setShowResults(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.scoreCard}>
            <Text style={styles.scoreLarge}>{quizResult.percentage}%</Text>
            <Text style={styles.scoreDetails}>
              {quizResult.totalScore} out of {quizResult.totalMarks} marks
            </Text>
          </View>

          <ScrollView style={styles.answersReview}>
            {quizResult.answers.map((answer, index) => (
              <View key={index} style={styles.answerReviewCard}>
                <View style={styles.answerReviewHeader}>
                  <Text style={styles.questionNumber}>Question {index + 1}</Text>
                  <View style={[styles.resultBadge, answer.isCorrect ? styles.correctBadge : styles.incorrectBadge]}>
                    <Ionicons 
                      name={answer.isCorrect ? "checkmark-circle" : "close-circle"} 
                      size={14} 
                      color={answer.isCorrect ? "#16a34a" : "#dc2626"} 
                    />
                    <Text style={[styles.resultBadgeText, answer.isCorrect ? { color: '#16a34a' } : { color: '#dc2626' }]}>
                      {answer.isCorrect ? 'Correct' : 'Wrong'}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.answerMarks}>
                  {answer.marksAwarded}/{answer.maxMarks} marks
                </Text>
                
                {answer.selectedAnswer && (
                  <Text style={styles.yourAnswer}>
                    Your answer: {answer.selectedAnswer}
                  </Text>
                )}
                
                {!answer.isCorrect && (
                  <Text style={styles.correctAnswer}>
                    Correct answer: {answer.correctAnswer}
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => setShowResults(false)}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading quizzes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Quizzes</Text>
        <Text style={styles.subtitle}>{quizzes.length} available quiz(es)</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {quizzes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No quizzes available</Text>
          </View>
        ) : (
          quizzes.map(quiz => renderQuizCard(quiz))
        )}
      </ScrollView>

      {selectedQuiz && renderQuizTaking()}
      {renderResults()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
  quizCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  quizTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  availableBadge: {
    backgroundColor: '#dbeafe',
  },
  completedBadge: {
    backgroundColor: '#d1fae5',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
  className: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 12,
  },
  quizInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#6b7280',
  },
  dateInfo: {
    marginBottom: 12,
  },
  dateText: {
    fontSize: 13,
    color: '#ef4444',
  },
  resultContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
    marginTop: 8,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#16a34a',
    marginBottom: 8,
  },
  viewButton: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  startButton: {
    backgroundColor: '#10b981',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quizModal: {
    flex: 1,
    backgroundColor: '#fff',
  },
  quizModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#3b82f6',
  },
  quizModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  timerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  timerWarning: {
    color: '#fef3c7',
  },
  progressContainer: {
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
  },
  questionContainer: {
    flex: 1,
    padding: 20,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    lineHeight: 26,
  },
  marksText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  answersContainer: {
    gap: 12,
  },
  answerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  selectedAnswer: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#3b82f6',
  },
  answerText: {
    fontSize: 16,
    color: '#1f2937',
    flex: 1,
  },
  navigationButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  navButton: {
    flex: 1,
    padding: 14,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    alignItems: 'center',
  },
  navButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    padding: 14,
    backgroundColor: '#10b981',
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsModal: {
    flex: 1,
    backgroundColor: '#fff',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#3b82f6',
  },
  resultsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  scoreCard: {
    padding: 30,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  scoreLarge: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  scoreDetails: {
    fontSize: 18,
    color: '#6b7280',
    marginTop: 8,
  },
  answersReview: {
    flex: 1,
    padding: 16,
  },
  answerReviewCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  answerReviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  questionNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  correctBadge: {
    backgroundColor: '#d1fae5',
  },
  incorrectBadge: {
    backgroundColor: '#fee2e2',
  },
  resultBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  answerMarks: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  yourAnswer: {
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 4,
  },
  correctAnswer: {
    fontSize: 14,
    color: '#16a34a',
    fontWeight: '600',
  },
  doneButton: {
    margin: 16,
    padding: 16,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default QuizzesScreen;
