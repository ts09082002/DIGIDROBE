import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '../../context/ThemeContext';

type Props = {
    children: React.ReactNode;
    edges?: ('top' | 'bottom' | 'left' | 'right')[];
};

export default function ScreenContainer({ children, edges = ['top'] }: Props) {
    const tc = useThemeColors();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: tc.background }]} edges={edges}>
            <StatusBar barStyle={tc.statusBar === 'dark' ? 'dark-content' : 'light-content'} backgroundColor={tc.background} />
            {children}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
