import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { useThemeColors } from '../../context/ThemeContext';
import { Colors, FontFamily } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

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

    const isDark = tc.background === Colors.black || tc.background === '#121212'; // Simple check for dark mode context

    return (
        <Tabs
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarShowLabel: true,
                tabBarLabelStyle: styles.tabBarLabel,
                tabBarStyle: [
                    styles.tabBar,
                    {
                        height: (Platform.OS === 'ios' ? 60 : 58) + insets.bottom,
                        paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 12),
                    },
                ],
                tabBarBackground: () => (
                    <BlurView
                        tint={isDark ? 'dark' : 'light'}
                        intensity={85}
                        style={StyleSheet.absoluteFill}
                    />
                ),
                tabBarActiveTintColor: tc.accent,
                tabBarInactiveTintColor: tc.iconDefault,
                tabBarIcon: ({ focused, color, size }) => {
                    const icons = TAB_ICONS[route.name] || TAB_ICONS.index;
                    const iconName = focused ? icons.active : icons.inactive;

                    return (
                        <View style={styles.iconWrapper}>
                            <View style={focused ? styles.activeIconContainer : styles.inactiveIconContainer}>
                                <Ionicons name={iconName} size={24} color={color} />
                            </View>
                            {focused && (
                                <View style={[styles.activeIndicator, { backgroundColor: tc.accent }]} />
                            )}
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
        borderTopWidth: 0,
        elevation: 0,
        position: 'absolute',
        backgroundColor: 'transparent',
    },
    tabBarLabel: {
        fontSize: 10,
        fontWeight: '500',
        fontFamily: FontFamily.bodyMedium,
        marginTop: 4,
    },
    iconWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 48,
        height: 48,
    },
    activeIconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    inactiveIconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeIndicator: {
        position: 'absolute',
        bottom: -6,
        width: 16,
        height: 3,
        borderRadius: 2,
    },
});
