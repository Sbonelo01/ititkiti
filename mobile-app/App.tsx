import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import TicketScanner from './src/components/TicketScanner';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <TicketScanner />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});


