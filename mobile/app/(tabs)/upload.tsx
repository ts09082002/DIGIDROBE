import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function UploadScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                    <Ionicons name="close" size={28} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Post</Text>
                <View style={{ width: 28 }} />
            </View>

            <View style={styles.content}>
                <TouchableOpacity style={styles.uploadArea}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="camera" size={40} color="#FFF" />
                    </View>
                    <Text style={styles.uploadText}>Capture Photo</Text>
                </TouchableOpacity>

                <Text style={styles.orText}>OR</Text>

                <TouchableOpacity style={[styles.uploadArea, styles.galleryArea]}>
                    <View style={[styles.iconCircle, { backgroundColor: '#F8F9FA' }]}>
                        <Ionicons name="images" size={40} color="#1A1A1A" />
                    </View>
                    <Text style={styles.uploadText}>Upload from Gallery</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#EAEAEA',
    },
    closeBtn: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    content: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    uploadArea: {
        height: 200,
        borderRadius: 20,
        backgroundColor: '#F2A900',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#F2A900',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 5,
    },
    galleryArea: {
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#EAEAEA',
        borderStyle: 'dashed',
        shadowOpacity: 0,
        elevation: 0,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    uploadText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    orText: {
        textAlign: 'center',
        marginVertical: 30,
        fontSize: 16,
        fontWeight: '700',
        color: '#A0A0A0',
    }
});
