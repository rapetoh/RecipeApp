import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

// #region agent log
const DEBUG_ENDPOINT = 'http://127.0.0.1:7242/ingest/9bd00ccd-363c-40e6-9c28-80af30328ee8';
const logError = (location, message, data) => {
  fetch(DEBUG_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location,
      message,
      data,
      timestamp: Date.now(),
      sessionId: 'debug-session',
      hypothesisId: 'C'
    })
  }).catch(() => {});
};
// #endregion agent log

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // #region agent log
    logError('ErrorBoundary.jsx:componentDidCatch', 'React Error Caught', {
      error: error?.toString(),
      stack: error?.stack?.substring(0, 1000),
      componentStack: errorInfo?.componentStack?.substring(0, 1000)
    });
    // #endregion agent log
    
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.emoji}>💥</Text>
            <Text style={styles.title}>App Crashed</Text>
            <Text style={styles.subtitle}>Debug Info Below</Text>
          </View>
          
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Error Message:</Text>
              <Text style={styles.errorText}>{this.state.error?.toString()}</Text>
            </View>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Stack Trace:</Text>
              <Text style={styles.stackText}>{this.state.error?.stack}</Text>
            </View>
            
            {this.state.errorInfo?.componentStack && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Component Stack:</Text>
                <Text style={styles.stackText}>{this.state.errorInfo.componentStack}</Text>
              </View>
            )}
          </ScrollView>
          
          <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff6b6b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#a0a0a0',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4ecca3',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#ff6b6b',
    fontWeight: '500',
  },
  stackText: {
    fontSize: 11,
    color: '#e0e0e0',
    fontFamily: 'monospace',
  },
  retryButton: {
    backgroundColor: '#4ecca3',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 40,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
  },
});

export default ErrorBoundary;




