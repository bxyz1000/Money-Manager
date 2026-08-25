import { StyleSheet, Text, View } from 'react-native';

/**
 * Temporary bootstrap route. Intentionally NOT a product screen —
 * navigation structure and real screens arrive with feature work.
 */
export default function BootstrapRoute() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Money Manager — foundation initialized</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
  },
});
