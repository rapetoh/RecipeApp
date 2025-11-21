import React, { useEffect, useRef, useState } from 'react';
import { Modal, View } from 'react-native';
import { create } from 'zustand';
import { useCallback, useMemo } from 'react';
import { AuthWebView } from './AuthWebView';
import { useAuthStore, useAuthModal } from './store';


/**
 * This component renders a modal for authentication purposes.
 */
export const AuthModal = () => {
  const { isOpen, mode } = useAuthModal();
  const { auth } = useAuthStore();
  const baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5173';
  
  if (!baseURL) {
    return null;
  }

  return (
    <Modal
      visible={isOpen && !auth}
      transparent={true}
      animationType="slide"
    >
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '100%',
          width: '100%',
          backgroundColor: '#fff',
          padding: 0,
        }}
      >
        <AuthWebView
          mode={mode}
          baseURL={baseURL}
        />
      </View>
    </Modal>
  );
};

export default useAuthModal;

