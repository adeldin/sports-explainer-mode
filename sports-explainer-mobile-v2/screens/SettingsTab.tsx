import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SettingsScreen from '../components/SettingsScreen';
import MySportsScreen from '../components/MySportsScreen';

const Stack = createNativeStackNavigator();

// Native stack so Settings can push the My Sports editor (and pop back to it).
// Both screens read/write shared state via useAppState() — this stack only wires
// up navigation (open My Sports, go back).
export default function SettingsTab() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsHome">
        {({ navigation }) => (
          <SettingsScreen onOpenMySports={() => navigation.navigate('MySports')} />
        )}
      </Stack.Screen>
      <Stack.Screen name="MySports">
        {({ navigation }) => <MySportsScreen navigation={navigation} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
