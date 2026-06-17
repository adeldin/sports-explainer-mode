import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Level, Language } from '../lib/api';
import { type SportTab } from '../lib/sports';
import SettingsScreen from '../components/SettingsScreen';
import MySportsScreen from '../components/MySportsScreen';

interface SettingsTabProps {
  language: Language;
  level: Level;
  autoRefresh: boolean;
  notificationsEnabled: boolean;
  orderedSports: SportTab[];
  sportVisibility: Record<string, boolean>;
  onLevelChange: (l: Level) => void;
  onLanguageChange: (l: Language) => void;
  onAutoRefreshChange: (val: boolean) => void;
  onNotificationsToggle: (val: boolean) => void;
  onSportsChange: (order: string[], visibility: Record<string, boolean>) => void;
}

const Stack = createNativeStackNavigator();

// Native stack so Settings can push the My Sports editor (and pop back to it).
// Shared state flows in from App and is forwarded to both screens via render props.
export default function SettingsTab({
  language, level, autoRefresh, notificationsEnabled,
  orderedSports, sportVisibility,
  onLevelChange, onLanguageChange, onAutoRefreshChange, onNotificationsToggle, onSportsChange,
}: SettingsTabProps) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsHome">
        {({ navigation }) => (
          <SettingsScreen
            level={level}
            language={language}
            autoRefresh={autoRefresh}
            notificationsEnabled={notificationsEnabled}
            onOpenMySports={() => navigation.navigate('MySports')}
            onLevelChange={onLevelChange}
            onLanguageChange={onLanguageChange}
            onAutoRefreshChange={onAutoRefreshChange}
            onNotificationsToggle={onNotificationsToggle}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="MySports">
        {({ navigation }) => (
          <MySportsScreen
            language={language}
            order={orderedSports.map(s => s.key)}
            visibility={sportVisibility}
            onChange={onSportsChange}
            navigation={navigation}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
