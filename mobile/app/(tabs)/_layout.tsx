import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';
import { useThemeColors } from '../../context/ThemeContext';
import { Colors, FontFamily } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_ICONS: Record<string, { active: any; inactive: any }> = {
    index: { active: 'home', inactive: 'home-outline' },
    outfits: { active: 'albums', inactive: 'albums-outline' },
    wardrobe: { active: 'file-tray-stacked', inactive: 'file-tray-stacked-outline' },
    calendar: { active: 'calendar', inactive: 'calendar-outline' },
    travel: { active: 'airplane', inactive: 'airplane-outline' },
};

export default function TabLayout() {
    const tc = useThemeColors();
    const insets = useSafeAreaInsets();

    return (
        <Tabs
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarShowLabel: true,
                tabBarLabelStyle: styles.tabBarLabel,
                tabBarStyle: [
                    styles.tabBar,
                    {
                        backgroundColor: tc.tabBar,
                        borderTopColor: tc.tabBarBorder,
                        height: (Platform.OS === 'ios' ? 60 : 58) + insets.bottom,
                        paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 12),
                    },
                ],
                tabBarActiveTintColor: Colors.gold,
                tabBarInactiveTintColor: tc.textMuted,
                tabBarIcon: ({ focused, color, size }) => {
                    const icons = TAB_ICONS[route.name] || TAB_ICONS.index;
                    const iconName = focused ? icons.active : icons.inactive;

                    return (
                        <View style={focused ? styles.activeIconContainer : undefined}>
                            <Ionicons name={iconName} size={24} color={color} />
                        </View>
                    );
                },
            })}
        >
            <Tabs.Screen name="index" options={{ title: 'Home' }} />
            <Tabs.Screen name="outfits" options={{ title: 'Outfits' }} />
            <Tabs.Screen name="wardrobe" options={{ title: 'Wardrobe' }} />
            <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
            <Tabs.Screen name="travel" options={{ title: 'Travel' }} />

            <Tabs.Screen name="profile" options={{ href: null }} />
            <Tabs.Screen name="styling" options={{ href: null }} />
            <Tabs.Screen name="upload" options={{ href: null }} />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        paddingTop: 8,
        borderTopWidth: 1,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    tabBarLabel: {
        fontSize: 11,
        fontWeight: '500',
        fontFamily: FontFamily.bodyMedium,
        marginTop: 2,
    },
    activeIconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});
