import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ReportIssueButton from './ReportIssueButton';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
  }

  render() {
    const { children, routeName } = this.props;
    const { error, errorInfo } = this.state;

    if (!error) {
      return children;
    }

    const errorDetails = [error?.message, error?.stack, errorInfo?.componentStack].filter(Boolean).join('\n\n');

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Sivusto kohtasi virheen</Text>
        <Text style={styles.subtitle}>Kayttaja voi lahettaa raportin heti, jotta ongelma paasee korjaukseen ilman erillista viestittelya.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => this.setState({ error: null, errorInfo: null })}>
          <Text style={styles.retryButtonText}>Yrita uudelleen</Text>
        </TouchableOpacity>
        <ReportIssueButton
          routeName={routeName}
          context="fatal_error"
          errorDetails={errorDetails}
          initialMessage="Sivusto kaatui kayton aikana."
          floating={false}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f8fb',
    justifyContent: 'center',
    padding: 24
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f2f3d',
    marginBottom: 12
  },
  subtitle: {
    color: '#556b7a',
    lineHeight: 22,
    marginBottom: 18
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#15948b',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '700'
  }
});