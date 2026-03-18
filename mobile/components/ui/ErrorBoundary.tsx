import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, Spacing, BorderRadius } from '../../constants/theme';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export default class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(_error: Error): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('ErrorBoundary caught:', error, info);
    }

    handleRetry = () => {
        this.setState({ hasError: false });
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="warning-outline" size={40} color={Colors.gold} />
                    </View>
                    <Text style={styles.title}>Something went wrong</Text>
                    <Text style={styles.subtitle}>
                        An unexpected error occurred. Please try again.
                    </Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={this.handleRetry} accessibilityRole="button">
                        <Text style={styles.retryText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.warmGray,
        paddingHorizontal: Spacing.xl,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.categoryActive,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xxl,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        fontFamily: FontFamily.heading,
        color: Colors.charcoal,
        marginBottom: Spacing.sm,
    },
    subtitle: {
        fontSize: 15,
        fontFamily: FontFamily.body,
        color: Colors.darkGray,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: Spacing.xxl,
    },
    retryBtn: {
        backgroundColor: Colors.gold,
        paddingHorizontal: Spacing.xxl,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.round,
    },
    retryText: {
        fontSize: 16,
        fontWeight: '600',
        fontFamily: FontFamily.bodySemiBold,
        color: '#FFFFFF',
    },
});
