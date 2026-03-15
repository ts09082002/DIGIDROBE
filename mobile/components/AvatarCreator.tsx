/**
 * AvatarCreator — Opens Ready Player Me avatar creator in a WebView.
 * User creates their 3D avatar, we capture the avatar URL and
 * convert it to a 2D render for the mannequin display.
 *
 * Uses dynamic require() for react-native-webview so the app
 * doesn't crash if the native module isn't available (Expo Go).
 */
import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    Alert,
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Dynamic import — avoids crash if react-native-webview native module is unavailable
let WebViewComponent: any = null;
try {
    WebViewComponent = require('react-native-webview').WebView;
} catch {
    WebViewComponent = null;
}

interface AvatarCreatorProps {
    visible: boolean;
    onClose: () => void;
    onAvatarCreated: (avatarUrl: string) => void;
    gender?: 'male' | 'female';
}

/**
 * Ready Player Me embed URL.
 */
const getRpmUrl = (gender?: 'male' | 'female') => {
    const params = [
        'frameApi=true',
        'clearCache=true',
        'bodyType=fullbody',
        'quickStart=true',
    ];
    if (gender) {
        params.push(`gender=${gender}`);
    }
    return `https://demo.readyplayer.me/avatar?${params.join('&')}`;
};

/**
 * Injected JS that listens for Ready Player Me events via postMessage.
 * When avatar export completes, it sends the URL back to React Native.
 */
const INJECTED_JS = `
(function() {
    window.addEventListener('message', function(event) {
        try {
            var json = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            if (json.source === 'readyplayerme' && json.eventName === 'v1.avatar.exported') {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'avatar_exported',
                    url: json.data.url
                }));
            }
        } catch(e) {}
    });
    true;
})();
`;

/**
 * Fallback when WebView is not available — opens RPM in external browser.
 */
function FallbackCreator({ visible, onClose, gender }: {
    visible: boolean;
    onClose: () => void;
    gender?: 'male' | 'female';
}) {
    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.fallbackOverlay}>
                <View style={styles.fallbackCard}>
                    <Ionicons name="globe-outline" size={48} color="#D4A843" />
                    <Text style={styles.fallbackTitle}>Create Your Avatar</Text>
                    <Text style={styles.fallbackDesc}>
                        WebView is not available in this build. You can create your avatar in the browser instead.
                    </Text>
                    <TouchableOpacity
                        style={styles.fallbackBtn}
                        onPress={() => {
                            Linking.openURL(getRpmUrl(gender));
                            onClose();
                        }}
                    >
                        <Ionicons name="open-outline" size={18} color="#1A1410" />
                        <Text style={styles.fallbackBtnText}>Open in Browser</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.fallbackCloseBtn} onPress={onClose}>
                        <Text style={styles.fallbackCloseBtnText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

export default function AvatarCreator({
    visible,
    onClose,
    onAvatarCreated,
    gender,
}: AvatarCreatorProps) {
    const webViewRef = useRef<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    // If WebView is not available, show fallback
    if (!WebViewComponent) {
        return <FallbackCreator visible={visible} onClose={onClose} gender={gender} />;
    }

    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'avatar_exported' && data.url) {
                onAvatarCreated(data.url);
                onClose();
            }
        } catch {
            // ignore
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
            <View style={styles.container}>
                {/* Header bar */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Ionicons name="close" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Create Your Avatar</Text>
                    <View style={styles.closeBtn} />
                </View>

                {/* WebView — Ready Player Me */}
                <WebViewComponent
                    ref={webViewRef}
                    source={{ uri: getRpmUrl(gender) }}
                    style={styles.webview}
                    injectedJavaScript={INJECTED_JS}
                    onMessage={handleMessage}
                    onLoadStart={() => setIsLoading(true)}
                    onLoadEnd={() => setIsLoading(false)}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    allowsInlineMediaPlayback={true}
                    startInLoadingState={true}
                    originWhitelist={['*']}
                />

                {/* Loading overlay */}
                {isLoading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#D4A843" />
                        <Text style={styles.loadingText}>Loading Avatar Creator...</Text>
                    </View>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1A1410',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 54 : 40,
        paddingBottom: 12,
        paddingHorizontal: 16,
        backgroundColor: '#2A2018',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(212,168,67,0.2)',
    },
    closeBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        color: '#D4A843',
        fontSize: 17,
        fontWeight: '700',
    },
    webview: {
        flex: 1,
        backgroundColor: '#1A1410',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        top: 100,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(26,20,16,0.9)',
        gap: 16,
    },
    loadingText: {
        color: '#D4A843',
        fontSize: 14,
        fontWeight: '600',
    },
    // Fallback styles
    fallbackOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    fallbackCard: {
        backgroundColor: '#2A2018',
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
        gap: 16,
        width: '100%',
        borderWidth: 1,
        borderColor: 'rgba(212,168,67,0.2)',
    },
    fallbackTitle: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '700',
    },
    fallbackDesc: {
        color: '#A09080',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    fallbackBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#D4A843',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 25,
        marginTop: 8,
    },
    fallbackBtnText: {
        color: '#1A1410',
        fontSize: 15,
        fontWeight: '700',
    },
    fallbackCloseBtn: {
        paddingVertical: 8,
    },
    fallbackCloseBtnText: {
        color: '#A09080',
        fontSize: 14,
        fontWeight: '600',
    },
});
