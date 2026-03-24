import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Animated,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Colors, FontFamily, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useThemeColors } from '../../context/ThemeContext';
import { processClothingImageOnDevice } from '../../services/image-processor';
import { classifyClothing } from '../../services/ml-classifier';
import * as wardrobeLocal from '../../services/wardrobe-local';
import { Toast } from '../../components/Toast';
import ScreenContainer from '../../components/ui/ScreenContainer';

const { width } = Dimensions.get('window');

type ProcessingStage = 'idle' | 'resizing' | 'classifying' | 'processing' | 'saving';

const STAGE_LABELS: Record<ProcessingStage, string> = {
    idle: '',
    resizing: 'Resizing image...',
    classifying: 'Classifying clothing...',
    processing: 'Removing background & extracting colors...',
    saving: 'Saving to wardrobe...',
};

export default function UploadScreen() {
    const tc = useThemeColors();
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [stage, setStage] = useState<ProcessingStage>('idle');
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const isProcessing = stage !== 'idle';

    const showToast = (msg: string, type: 'success' | 'error' | 'info') => {
        setToastType(type);
        setToastMessage(msg);
        setToastVisible(true);
    };

    const pickImage = async (source: 'camera' | 'gallery') => {
        try {
            const options: ImagePicker.ImagePickerOptions = {
                mediaTypes: ['images'],
                quality: 0.9,
                allowsEditing: true,
                aspect: [3, 4],
            };

            const result = source === 'camera'
                ? await ImagePicker.launchCameraAsync(options)
                : await ImagePicker.launchImageLibraryAsync(options);

            if (result.canceled || !result.assets?.[0]) return;

            const asset = result.assets[0];
            setImageUri(asset.uri);

            // Animate preview in
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();

            await processImage(asset.uri, asset.fileName || 'photo.jpg');
        } catch (error: any) {
            showToast(error.message || 'Failed to pick image', 'error');
        }
    };

    const processImage = async (uri: string, filename: string) => {
        try {
            // Step 1: Resize
            setStage('resizing');
            const resized = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 640 } }],
                { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
            );

            // Step 2: Process on device (classification + background removal + colors)
            setStage('processing');
            const result = await processClothingImageOnDevice(resized.uri);

            // Step 3: Save
            setStage('saving');
            await wardrobeLocal.addClothingItem(result, uri, filename);

            showToast('Item added to your wardrobe!', 'success');

            // Brief delay so user sees success, then navigate
            setTimeout(() => {
                resetState();
                router.navigate('/(tabs)/wardrobe' as any);
            }, 800);
        } catch (error: any) {
            console.error('Upload processing error:', error);
            showToast(error.message || 'Failed to process image', 'error');
            setStage('idle');
        }
    };

    const resetState = () => {
        setStage('idle');
        setImageUri(null);
        fadeAnim.setValue(0);
    };

    return (
        <ScreenContainer>
            {/* Standard VibeCheck Header */}
            <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="sparkles" size={20} color={tc.accent} />
                    <Text style={[{ color: tc.textPrimary, fontSize: 24, fontWeight: '700', fontFamily: FontFamily.heading }]}>Add Item</Text>
                </View>
                <TouchableOpacity 
                    style={[{ width: 36, height: 36, borderRadius: 18, backgroundColor: tc.surface, alignItems: 'center', justifyContent: 'center', ...Shadows.sm }]} 
                    onPress={() => router.back()}
                >
                    <Ionicons name="close" size={20} color={tc.textPrimary} />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                {/* Preview / Processing Overlay */}
                {imageUri ? (
                    <Animated.View style={[styles.previewContainer, { opacity: fadeAnim }]}>
                        <Image
                            source={{ uri: imageUri }}
                            style={[styles.previewImage, { backgroundColor: tc.surface }]}
                            resizeMode="contain"
                        />
                        {isProcessing && (
                            <View style={styles.processingOverlay}>
                                <View style={[styles.processingCard, { backgroundColor: tc.card }]}>
                                    <ActivityIndicator size="large" color={tc.accent} />
                                    <Text style={[styles.processingText, { color: tc.textPrimary }]}>
                                        {STAGE_LABELS[stage]}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </Animated.View>
                ) : (
                    <View style={styles.buttonsContainer}>
                        {/* Camera Button */}
                        <TouchableOpacity
                            style={[styles.uploadCard, { backgroundColor: tc.accent }]}
                            onPress={() => pickImage('camera')}
                            disabled={isProcessing}
                            accessibilityRole="button"
                            accessibilityLabel="Take a photo of clothing"
                        >
                            <View style={styles.iconCircle}>
                                <Ionicons name="camera" size={36} color="#FFF" />
                            </View>
                            <Text style={styles.uploadCardTitle}>Take Photo</Text>
                            <Text style={styles.uploadCardSubtitle}>
                                Use your camera to capture an item
                            </Text>
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.dividerRow}>
                            <View style={[styles.dividerLine, { backgroundColor: tc.border }]} />
                            <Text style={[styles.dividerText, { color: tc.textMuted }]}>OR</Text>
                            <View style={[styles.dividerLine, { backgroundColor: tc.border }]} />
                        </View>

                        {/* Gallery Button */}
                        <TouchableOpacity
                            style={[styles.uploadCard, styles.uploadCardOutline, { borderColor: tc.border, backgroundColor: tc.card }]}
                            onPress={() => pickImage('gallery')}
                            disabled={isProcessing}
                            accessibilityRole="button"
                            accessibilityLabel="Choose from gallery"
                        >
                            <View style={[styles.iconCircle, { backgroundColor: tc.accentLight }]}>
                                <Ionicons name="images" size={36} color={tc.accent} />
                            </View>
                            <Text style={[styles.uploadCardTitle, { color: tc.textPrimary }]}>
                                Choose from Gallery
                            </Text>
                            <Text style={[styles.uploadCardSubtitle, { color: tc.textSecondary }]}>
                                Select an existing photo
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Cancel button during processing */}
                {imageUri && !isProcessing && (
                    <TouchableOpacity
                        style={[styles.retryBtn, { borderColor: tc.border }]}
                        onPress={resetState}
                        accessibilityRole="button"
                        accessibilityLabel="Try another photo"
                    >
                        <Ionicons name="refresh" size={18} color={tc.textSecondary} />
                        <Text style={[styles.retryText, { color: tc.textSecondary }]}>
                            Try Another Photo
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            <Toast
                visible={toastVisible}
                type={toastType}
                message={toastMessage}
                onHide={() => setToastVisible(false)}
            />
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.sm,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        fontFamily: FontFamily.heading,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: Spacing.xl,
    },
    buttonsContainer: {
        gap: Spacing.lg,
    },
    uploadCard: {
        borderRadius: BorderRadius.xl,
        paddingVertical: 36,
        paddingHorizontal: Spacing.xl,
        alignItems: 'center',
        ...Shadows.md,
    },
    uploadCardOutline: {
        borderWidth: 1.5,
        borderStyle: 'dashed',
        shadowOpacity: 0,
        elevation: 0,
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    uploadCardTitle: {
        fontSize: 18,
        fontWeight: '700',
        fontFamily: FontFamily.bodySemiBold,
        color: '#FFFFFF',
        marginBottom: Spacing.xs,
    },
    uploadCardSubtitle: {
        fontSize: 14,
        fontFamily: FontFamily.body,
        color: 'rgba(255,255,255,0.8)',
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        fontSize: 13,
        fontWeight: '700',
        fontFamily: FontFamily.bodySemiBold,
        letterSpacing: 1,
    },
    previewContainer: {
        flex: 1,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        marginBottom: Spacing.xl,
    },
    previewImage: {
        width: '100%',
        height: '100%',
        borderRadius: BorderRadius.xl,
    },
    processingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    processingCard: {
        paddingHorizontal: Spacing.xxl,
        paddingVertical: Spacing.xl,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        gap: Spacing.md,
        ...Shadows.lg,
    },
    processingText: {
        fontSize: 15,
        fontWeight: '600',
        fontFamily: FontFamily.bodySemiBold,
        textAlign: 'center',
    },
    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.round,
        borderWidth: 1,
        marginBottom: Spacing.xxl,
    },
    retryText: {
        fontSize: 15,
        fontWeight: '600',
        fontFamily: FontFamily.bodySemiBold,
    },
});
