import { StyleSheet, View } from 'react-native';

/**
 * Placeholder route for the center "+" tab. The tab's tabPress listener
 * intercepts selection and opens the add-transaction modal instead, so this
 * screen never renders in practice.
 */
export default function AddCenterRoute() {
  return <View style={StyleSheet.absoluteFill} />;
}
