import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { studentsAPI } from '../services/api';

const ProfileScreen: React.FC = () => {
  const { student, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(student?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(student?.phoneNumber || '');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'none' | 'valid' | 'invalid'>('none');

  useEffect(() => {
    loadGeminiKey();
  }, []);

  const loadGeminiKey = async () => {
    if (!student?.uid) return;
    try {
      const response = await studentsAPI.getProfile(student.uid);
      if (response.geminiApiKey) {
        setGeminiApiKey(response.geminiApiKey);
        setKeyStatus('valid');
      }
    } catch (error) {
      console.error('Error loading API key:', error);
    }
  };

  const handleTestGeminiKey = async () => {
    if (!geminiApiKey.trim()) {
      Alert.alert('Error', 'Please enter an API key');
      return;
    }

    setIsTesting(true);
    try {
      const response = await studentsAPI.testGeminiKey(student?.uid || '', geminiApiKey);
      if (response.success) {
        setKeyStatus('valid');
        Alert.alert('Success', response.message);
      } else {
        setKeyStatus('invalid');
        Alert.alert('Error', response.message);
      }
    } catch (error: any) {
      setKeyStatus('invalid');
      Alert.alert('Error', error.message || 'Failed to test API key');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveGeminiKey = async () => {
    if (!geminiApiKey.trim()) {
      Alert.alert('Error', 'Please enter an API key');
      return;
    }

    if (keyStatus !== 'valid') {
      Alert.alert('Error', 'Please test the API key first');
      return;
    }

    setIsSaving(true);
    try {
      const response = await studentsAPI.saveGeminiKey(student?.uid || '', geminiApiKey);
      if (response.success) {
        Alert.alert('Success', response.message);
      } else {
        Alert.alert('Error', response.message);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save API key');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = () => {
    // TODO: Implement save functionality
    Alert.alert('Success', 'Profile updated successfully!');
    setIsEditing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {student?.fullName.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.headerName}>{student?.fullName}</Text>
        <Text style={styles.headerEmail}>{student?.email}</Text>
      </View>

      {/* Profile Info */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          {!isEditing ? (
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Text style={styles.editButton}>Edit</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editActions}>
              <TouchableOpacity onPress={() => setIsEditing(false)}>
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave}>
                <Text style={styles.saveButton}>Save</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Full Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your name"
              />
            ) : (
              <Text style={styles.infoValue}>{student?.fullName}</Text>
            )}
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={[styles.infoValue, styles.disabledText]}>
              {student?.email}
            </Text>
            <Text style={styles.infoHint}>Email cannot be changed</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Phone Number</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.infoValue}>{student?.phoneNumber}</Text>
            )}
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Grade</Text>
            <Text style={styles.infoValue}>
              {student?.currentGrade.grade} - Section {student?.currentGrade.section}
            </Text>
          </View>
        </View>
      </View>

      {/* Gemini API Key Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🤖 AI Helper Configuration</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Gemini API Key</Text>
          <Text style={styles.apiKeyHint}>
            Get your free API key from Google AI Studio
          </Text>
          
          <TextInput
            style={[
              styles.apiKeyInput,
              keyStatus === 'valid' && styles.apiKeyValid,
              keyStatus === 'invalid' && styles.apiKeyInvalid,
            ]}
            value={geminiApiKey}
            onChangeText={(text) => {
              setGeminiApiKey(text);
              setKeyStatus('none');
            }}
            placeholder="Paste your Gemini API key here"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            autoCapitalize="none"
          />

          {keyStatus === 'valid' && (
            <Text style={styles.statusValid}>✓ API key is valid</Text>
          )}
          {keyStatus === 'invalid' && (
            <Text style={styles.statusInvalid}>✗ API key is invalid</Text>
          )}

          <View style={styles.apiKeyActions}>
            <TouchableOpacity
              style={[styles.testButton, isTesting && styles.buttonDisabled]}
              onPress={handleTestGeminiKey}
              disabled={isTesting || !geminiApiKey.trim()}
            >
              {isTesting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.testButtonText}>Test Key</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveKeyButton,
                (isSaving || keyStatus !== 'valid') && styles.buttonDisabled,
              ]}
              onPress={handleSaveGeminiKey}
              disabled={isSaving || keyStatus !== 'valid'}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveKeyButtonText}>Save Key</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Logout Button */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>School Management System</Text>
        <Text style={styles.appVersion}>Version 1.0.0</Text>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#6366f1',
  },
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#6366f1',
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  headerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerEmail: {
    fontSize: 14,
    color: '#e0e7ff',
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  editButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  editActions: {
    flexDirection: 'row',
    gap: 16,
  },
  cancelButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoItem: {
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  disabledText: {
    color: '#9ca3af',
  },
  infoHint: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginTop: 4,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  logoutButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  logoutIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  logoutText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  appInfo: {
    padding: 20,
    paddingBottom: 120,
    alignItems: 'center',
  },
  appInfoText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 12,
    color: '#9ca3af',
  },
  apiKeyHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 12,
  },
  apiKeyInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#1f2937',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  apiKeyValid: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  apiKeyInvalid: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  statusValid: {
    fontSize: 14,
    color: '#10b981',
    marginTop: 8,
    fontWeight: '600',
  },
  statusInvalid: {
    fontSize: 14,
    color: '#ef4444',
    marginTop: 8,
    fontWeight: '600',
  },
  apiKeyActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  testButton: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveKeyButton: {
    flex: 1,
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  saveKeyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default ProfileScreen;
