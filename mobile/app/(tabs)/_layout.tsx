import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Colors, Spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

type TabIconName = 'home' | 'compass' | 'add' | 'shirt' | 'person';
type TabIconOutlineName = 'home-outline' | 'compass-outline' | 'add-outline' | 'shirt-outline' | 'person-outline';

const TAB_ICONS: Record<string, { active: any; inactive: any }> = {
    index: { active: 'home', inactive: 'home-outline' },
    outfits: { active: 'albums', inactive: 'albums-outline' },
    wardrobe: { active: 'file-tray-stacked', inactive: 'file-tray-stacked-outline' },
    profile: { active: 'person', inactive: 'person-outline' },
};

// Standard Tab Layout

export default function TabLayout() {
    const { isDarkMode: isDark } = useTheme();

    const themeColors = {
        background: isDark ? '#1A1A1A' : '#FFFFFF',
        border: isDark ? '#333333' : '#F0F0F0',
        activeTint: '#F2A900',
        inactiveTint: isDark ? '#888888' : '#A0A0A0',
    };

    return (
        <Tabs
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarShowLabel: true,
                tabBarLabelStyle: styles.tabBarLabel,
                tabBarStyle: [styles.tabBar, { backgroundColor: themeColors.background, borderTopColor: themeColors.border }],
                tabBarActiveTintColor: themeColors.activeTint,
                tabBarInactiveTintColor: themeColors.inactiveTint,
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
            <Tabs.Screen name="profile" options={{ title: 'Profile' }} />

            <Tabs.Screen name="styling" options={{ href: null }} />
            <Tabs.Screen name="upload" options={{ href: null }} />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        height: Platform.OS === 'ios' ? 85 : 65,
        paddingBottom: Platform.OS === 'ios' ? 25 : 10,
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
        marginTop: 2,
    },
    activeIconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});
