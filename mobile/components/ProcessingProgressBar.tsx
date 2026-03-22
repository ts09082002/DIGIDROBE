/**
 * ProcessingProgressBar
 *
 * Floating bottom bar that shows real-time image processing progress.
 * Appears when the queue starts, auto-dismisses after completion.
 */

import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { QueueProgress } from '../services/processing-queue';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
    progress: QueueProgress | null;
    visible: boolean;
}

export function ProcessingProgressBar({ progress, visible }: Props) {
    const slideAnim = useRef(new Animated.Value(100)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    // Slide in/out animation
    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: visible ? 0 : 100,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
        }).start();
    }, [visible]);

    // Progress bar width animation
    useEffect(() => {
        if (progress) {
            const fraction = progress.current / progress.total;
            Animated.timing(progressAnim, {
                toValue: fraction,
                duration: 350,
                useNativeDriver: false,
            }).start();
        } else {
            progressAnim.setValue(0);
        }
    }, [progress?.current, progress?.total]);

    if (!visible && !progress) return null;

    const percentage = progress
        ? Math.round((progress.current / progress.total) * 100)
        : 0;

    return (
        <Animated.View
            style={[
                styles.container,
                { transform: [{ translateY: slideAnim }] },
            ]}
        >
            {/* Glass background */}
            <View style={styles.innerContainer}>
                {/* Icon + Text Row */}
                <View style={styles.topRow}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="images" size={18} color="#F2A900" />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={styles.title}>
                            Processing {progress?.current ?? 0} of {progress?.total ?? 0}
                        </Text>
                        <Text style={styles.subtitle} numberOfLines={1}>
                            {progress?.currentFilename
                                ? progress.currentFilename.replace(/\.[^.]+$/, '')
                                : 'Preparing...'}
                        </Text>
                    </View>
                    <Text style={styles.percentage}>{percentage}%</Text>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressTrack}>
                    <Animated.View
                        style={[
                            styles.progressFill,
                            {
                                width: progressAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0%', '100%'],
                                }),
                            },
                        ]}
                    />
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 90,
        left: 16,
        right: 16,
        zIndex: 999,
    },
    innerContainer: {
        backgroundColor: 'rgba(30, 30, 30, 0.95)',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 12,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(242, 169, 0, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.2,
    },
    subtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 2,
    },
    percentage: {
        fontSize: 14,
        fontWeight: '700',
        color: '#F2A900',
        marginLeft: 8,
    },
    progressTrack: {
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#F2A900',
        borderRadius: 2,
    },
});
