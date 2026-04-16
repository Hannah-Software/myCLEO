import { View, Text, StyleSheet } from 'react-native';

export default function CheckInScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Check-In Screen</Text>
      <Text style={styles.subtitle}>Phase selection coming soon...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
  },
});
