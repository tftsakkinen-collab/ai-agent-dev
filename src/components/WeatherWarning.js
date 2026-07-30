import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function WeatherWarning({ windSpeed, isSafe }) {
  if (isSafe !== false) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚠️ Säähälytys (Kova tuuli)</Text>
      <Text style={styles.text}>
        Tuulen nopeus alueella on noin {windSpeed || '8-12'} m/s. SUP-lautailua suositellaan vain kokeneille harrastajille suojaisissa vesistöissä.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeeba',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginVertical: 10,
  },
  title: {
    color: '#856404',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  text: {
    color: '#856404',
    fontSize: 12,
    lineHeight: 16,
  },
});
