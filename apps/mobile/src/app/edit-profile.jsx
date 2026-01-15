import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { ChevronLeft, Save, Trash2, AlertTriangle, Eye, EyeOff, Lock } from 'lucide-react-native';
import { useAuth } from '@/utils/auth/useAuth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getApiUrl } from '@/utils/api';
import * as Haptics from 'expo-haptics';

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { auth, setAuth, signOut } = useAuth();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fetch user profile
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile', auth?.user?.id],
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/user/me?userId=${auth.user.id}`, {
        headers: {
          'Authorization': `Bearer ${auth.jwt}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch profile');
      const result = await response.json();
      return result.success ? result.data : null;
    },
    enabled: !!auth?.user?.id && !!auth?.jwt,
  });

  useEffect(() => {
    if (profileData) {
      setName(profileData.name || '');
      setEmail(profileData.email || '');
    }
  }, [profileData]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/user/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.jwt}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update profile');
      }
      return result;
    },
    onSuccess: (result) => {
      // Update auth state with new user data
      setAuth({
        ...auth,
        user: result.data,
      });

      // Invalidate profile query
      queryClient.invalidateQueries(['user-profile', auth?.user?.id]);

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to update profile');
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data) => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/user/me/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.jwt}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to change password');
      }
      return result;
    },
    onSuccess: () => {
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert('Success', 'Password changed successfully', [
        { text: 'OK' },
      ]);
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to change password');
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/user/me`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${auth.jwt}`,
        },
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete account');
      }
      return result;
    },
    onSuccess: () => {
      // Sign out and redirect to signin
      signOut();
      router.replace('/account/signin');
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to delete account');
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Name is required');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Validation Error', 'Email is required');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    updateProfileMutation.mutate({
      name: name.trim(),
      email: email.trim(),
    });
  };

  const handleChangePassword = () => {
    if (!currentPassword.trim()) {
      Alert.alert('Validation Error', 'Current password is required');
      return;
    }

    if (!newPassword.trim()) {
      Alert.alert('Validation Error', 'New password is required');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New passwords do not match');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    changePasswordMutation.mutate({
      currentPassword: currentPassword.trim(),
      newPassword: newPassword.trim(),
    });
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
            deleteAccountMutation.mutate();
          },
        },
      ]
    );
  };

  if (!fontsLoaded || profileLoading) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#FF9F1C" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: 'Inter_700Bold' }]}>
          Edit Profile
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Form */}
        <View style={styles.form}>
          <Text style={[styles.sectionTitle, { fontFamily: 'Inter_600SemiBold' }]}>
            Profile Information
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { fontFamily: 'Inter_500Medium' }]}>Name</Text>
            <TextInput
              style={[styles.input, { fontFamily: 'Inter_400Regular' }]}
              placeholder="Enter your name"
              placeholderTextColor="#999999"
              value={name}
              onChangeText={setName}
              editable={!updateProfileMutation.isPending}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { fontFamily: 'Inter_500Medium' }]}>Email</Text>
            <TextInput
              style={[styles.input, { fontFamily: 'Inter_400Regular' }]}
              placeholder="Enter your email"
              placeholderTextColor="#999999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!updateProfileMutation.isPending}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, updateProfileMutation.isPending && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={updateProfileMutation.isPending}
          >
            {updateProfileMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Save size={20} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={[styles.saveButtonText, { fontFamily: 'Inter_600SemiBold' }]}>
                  Save Changes
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Password Change Section */}
        <View style={styles.form}>
          <Text style={[styles.sectionTitle, { fontFamily: 'Inter_600SemiBold' }]}>
            Change Password
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { fontFamily: 'Inter_500Medium' }]}>Current Password</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={[styles.passwordInput, { fontFamily: 'Inter_400Regular' }]}
                placeholder="Enter current password"
                placeholderTextColor="#999999"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrentPassword}
                editable={!changePasswordMutation.isPending}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? (
                  <EyeOff size={20} color="#666666" />
                ) : (
                  <Eye size={20} color="#666666" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { fontFamily: 'Inter_500Medium' }]}>New Password</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={[styles.passwordInput, { fontFamily: 'Inter_400Regular' }]}
                placeholder="Enter new password (min 6 characters)"
                placeholderTextColor="#999999"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
                editable={!changePasswordMutation.isPending}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? (
                  <EyeOff size={20} color="#666666" />
                ) : (
                  <Eye size={20} color="#666666" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { fontFamily: 'Inter_500Medium' }]}>Confirm New Password</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={[styles.passwordInput, { fontFamily: 'Inter_400Regular' }]}
                placeholder="Confirm new password"
                placeholderTextColor="#999999"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                editable={!changePasswordMutation.isPending}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} color="#666666" />
                ) : (
                  <Eye size={20} color="#666666" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.changePasswordButton, changePasswordMutation.isPending && styles.buttonDisabled]}
            onPress={handleChangePassword}
            disabled={changePasswordMutation.isPending}
          >
            {changePasswordMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Lock size={20} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={[styles.changePasswordButtonText, { fontFamily: 'Inter_600SemiBold' }]}>
                  Change Password
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.dangerZone}>
          <View style={styles.dangerZoneHeader}>
            <AlertTriangle size={20} color="#DC2626" />
            <Text style={[styles.dangerZoneTitle, { fontFamily: 'Inter_600SemiBold' }]}>
              Danger Zone
            </Text>
          </View>

          <Text style={[styles.dangerZoneDescription, { fontFamily: 'Inter_400Regular' }]}>
            Once you delete your account, there is no going back. All your recipes, meal plans, and preferences will be permanently deleted.
          </Text>

          <TouchableOpacity
            style={[styles.deleteButton, deleteAccountMutation.isPending && styles.buttonDisabled]}
            onPress={handleDeleteAccount}
            disabled={deleteAccountMutation.isPending}
          >
            {deleteAccountMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Trash2 size={20} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={[styles.deleteButtonText, { fontFamily: 'Inter_600SemiBold' }]}>
                  Delete Account
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    color: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  form: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#000000',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000000',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000000',
  },
  eyeIcon: {
    padding: 14,
  },
  saveButton: {
    backgroundColor: '#FF9F1C',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  changePasswordButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  saveButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  changePasswordButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  dangerZone: {
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 20,
    backgroundColor: '#FEF2F2',
  },
  dangerZoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dangerZoneTitle: {
    fontSize: 18,
    color: '#DC2626',
    marginLeft: 8,
  },
  dangerZoneDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
    lineHeight: 20,
  },
  deleteButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
});



