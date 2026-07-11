import React from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    Image,
    ImageBackground,
    TouchableOpacity,
    Dimensions,
    SafeAreaView,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

const { width } = Dimensions.get('window');
const CARD_W = Math.min(width - 32, 380);

interface ShareOutfitModalProps {
    visible: boolean;
    onClose: () => void;
    topItem: any;
    bottomItem: any;
    shoeItem: any;
}

export default function ShareOutfitModal({
    visible,
    onClose,
}: ShareOutfitModalProps) {
    const viewShotRef = React.useRef<ViewShot>(null);

    const handleShare = async () => {
        try {
            if (viewShotRef.current?.capture) {
                const uri = await viewShotRef.current.capture();
                const shareable = await Sharing.isAvailableAsync();
                if (shareable) {
                    await Sharing.shareAsync(uri, {
                        mimeType: 'image/jpeg',
                        dialogTitle: 'Share to Story',
                    });
                }
            }
        } catch (error) {
            console.error('Failed to share card:', error);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            {/* Clickable background overlay to dismiss the modal */}
            <TouchableOpacity
                style={styles.clickableOverlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <ImageBackground
                    source={require('../../assets/share_bg_girl.png')}
                    blurRadius={20}
                    style={styles.modalOverlay}
                    resizeMode="cover"
                >
                    <SafeAreaView style={styles.safeContainer}>
                        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                            
                            {/* Top Center text with Instagram Icon */}
                            <View style={styles.storyHeader}>
                                <Ionicons name="logo-instagram" size={20} color="#FFFFFF" />
                                <Text style={styles.storyHeaderText}>Sharing to story...</Text>
                            </View>

                            {/* Popup Window captured by ViewShot */}
                            <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.95 }} style={styles.viewShotContainer}>
                                <View style={styles.cardContainer}>
                                    
                                    {/* Typography: "vibe check" */}
                                    <View style={styles.cardHeader}>
                                        <Text style={styles.titleText}>vibe check</Text>
                                    </View>

                                    {/* Main Body */}
                                    <View style={styles.cardBody}>
                                        
                                        {/* Left Side */}
                                        <View style={styles.leftColumn}>
                                            <Text style={styles.vibeLabelText}>today's vibe is</Text>
                                            <Text style={styles.vibeValueText}>soft girl</Text>

                                            {/* Widget 1: Weather widget with "29°C sunny" */}
                                            <View style={styles.weatherWidget}>
                                                <Ionicons name="sunny" size={18} color="#E7C693" />
                                                <Text style={styles.weatherText}>29°C sunny</Text>
                                            </View>

                                            {/* Widget 2: Pink widget taped with washi tape */}
                                            <View style={styles.stickyNoteContainer}>
                                                <View style={styles.tape} />
                                                <Text style={styles.stickyText}>{"this fit =\ngood mood :)"}</Text>
                                            </View>
                                        </View>

                                        {/* Right Side */}
                                        <View style={styles.rightColumn}>
                                            
                                            {/* Polaroid Frame */}
                                            <View style={styles.polaroidFrame}>
                                                {/* Semi-transparent pink washi tape */}
                                                <View style={styles.polaroidTape} />
                                                
                                                {/* Central square photo */}
                                                <View style={styles.girlImageContainer}>
                                                    <Image
                                                        source={require('../../assets/avatar_pixar_girl.png')}
                                                        style={styles.avatarImage}
                                                        resizeMode="cover"
                                                    />
                                                </View>

                                                {/* Floating aesthetic doodles */}
                                                <Text style={styles.doodleHeart}>♡</Text>
                                                <Text style={styles.doodleSparkles}>✨</Text>
                                                <Text style={styles.doodleArrow}>↩️</Text>

                                                {/* Overlapping beige circular stickers with curled corner */}
                                                <View style={styles.stickerContainer}>
                                                    <View style={styles.stickerBack}>
                                                        <Text style={styles.stickerText}>{"be you,\ndo you\n♡"}</Text>
                                                    </View>
                                                    <View style={styles.stickerFront}>
                                                        <Text style={styles.stickerText}>{"be you,\ndo you\n♡"}</Text>
                                                        <View style={styles.peelCorner} />
                                                    </View>
                                                </View>
                                            </View>

                                            {/* Casual handwriting typography */}
                                            <Text style={styles.handwritingText}>you look amazing today!</Text>
                                        </View>
                                    </View>

                                    {/* Bottom section: Capsule-style toggle switch showing selected girl avatar */}
                                    <View style={styles.toggleContainer}>
                                        <View style={styles.capsuleToggle}>
                                            <Image
                                                source={require('../../assets/model-placeholder.png')}
                                                style={styles.toggleAvatar}
                                                resizeMode="cover"
                                            />
                                            <Ionicons name="checkmark" size={12} color="#C78B80" style={styles.toggleCheck} />
                                        </View>
                                    </View>

                                    {/* Bottom edge of popup: Like, Save, Share, More arranged in generic rectangular boxes */}
                                    <View style={styles.bottomIconBar}>
                                        <View style={styles.iconBox}>
                                            <Ionicons name="heart-outline" size={18} color="#2C2B29" />
                                        </View>
                                        <View style={styles.iconBox}>
                                            <Ionicons name="bookmark-outline" size={18} color="#2C2B29" />
                                        </View>
                                        <TouchableOpacity style={styles.iconBox} activeOpacity={0.7} onPress={handleShare}>
                                            <Ionicons name="paper-plane-outline" size={18} color="#2C2B29" />
                                        </TouchableOpacity>
                                        <View style={styles.iconBox}>
                                            <Ionicons name="ellipsis-horizontal" size={18} color="#2C2B29" />
                                        </View>
                                    </View>

                                </View>
                            </ViewShot>
                        </ScrollView>
                    </SafeAreaView>
                </ImageBackground>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    clickableOverlay: {
        flex: 1,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1E1C1A',
    },
    safeContainer: {
        width: '100%',
        maxHeight: '98%',
    },
    scrollContent: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    storyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 16,
        width: '100%',
    },
    storyHeaderText: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 14,
        color: '#FFFFFF',
        textShadowColor: 'rgba(0, 0, 0, 0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    viewShotContainer: {
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#2C2B29',
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 24,
        elevation: 8,
    },
    cardContainer: {
        width: CARD_W,
        backgroundColor: '#FAF6F0',
        borderRadius: 24,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E9E3D9',
    },
    cardHeader: {
        marginBottom: 16,
        width: '100%',
        alignItems: 'center',
    },
    titleText: {
        fontFamily: 'Cormorant_700Bold',
        fontSize: 32,
        fontStyle: 'italic',
        color: '#2C2B29',
        textAlign: 'center',
    },
    cardBody: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    leftColumn: {
        width: '44%',
        justifyContent: 'flex-start',
    },
    vibeLabelText: {
        fontFamily: 'Cormorant_700Bold',
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2C2B29',
        marginBottom: 4,
    },
    vibeValueText: {
        fontFamily: 'Cormorant_700Bold',
        fontSize: 30,
        fontStyle: 'italic',
        color: '#C78B80',
        marginBottom: 16,
    },
    weatherWidget: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E9E3D9',
        borderRadius: 16,
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 16,
    },
    weatherText: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 11,
        color: '#2C2B29',
    },
    stickyNoteContainer: {
        backgroundColor: '#FCEEEB',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        position: 'relative',
        borderWidth: 1,
        borderColor: 'rgba(242, 178, 191, 0.3)',
    },
    tape: {
        width: 36,
        height: 10,
        backgroundColor: 'rgba(242, 178, 191, 0.7)',
        position: 'absolute',
        top: -5,
        borderRadius: 2,
    },
    stickyText: {
        fontFamily: 'Cormorant_700Bold',
        fontStyle: 'italic',
        fontSize: 13,
        color: '#7C5D53',
        textAlign: 'center',
        lineHeight: 16,
    },
    rightColumn: {
        width: '52%',
        alignItems: 'center',
    },
    polaroidFrame: {
        backgroundColor: '#FFFFFF',
        padding: 10,
        paddingBottom: 14,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        elevation: 4,
        position: 'relative',
        alignItems: 'center',
        width: 174,
        borderWidth: 1,
        borderColor: '#E9E3D9',
    },
    polaroidTape: {
        width: 44,
        height: 12,
        backgroundColor: 'rgba(242, 178, 191, 0.7)',
        position: 'absolute',
        top: -6,
        borderRadius: 2,
    },
    girlImageContainer: {
        width: 154,
        height: 154,
        borderRadius: 8,
        backgroundColor: '#FAF6F0',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    doodleHeart: {
        position: 'absolute',
        top: -10,
        right: -10,
        fontSize: 16,
        color: '#C78B80',
    },
    doodleSparkles: {
        position: 'absolute',
        top: 20,
        left: -14,
        fontSize: 14,
    },
    doodleArrow: {
        position: 'absolute',
        bottom: 24,
        left: -18,
        fontSize: 18,
        transform: [{ rotate: '30deg' }],
    },
    stickerContainer: {
        position: 'absolute',
        bottom: -15,
        right: -10,
        width: 54,
        height: 54,
    },
    stickerBack: {
        position: 'absolute',
        top: 2,
        left: 2,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#E6DFD5',
        borderWidth: 1,
        borderColor: '#D8CEBE',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.8,
    },
    stickerFront: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#FAF6F0',
        borderWidth: 1,
        borderColor: '#E6DFD5',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 3,
        elevation: 2,
        overflow: 'hidden',
    },
    stickerText: {
        fontFamily: 'Cormorant_700Bold',
        fontStyle: 'italic',
        fontSize: 8,
        color: '#8E7E73',
        textAlign: 'center',
        lineHeight: 10,
    },
    peelCorner: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 0,
        height: 0,
        borderStyle: 'solid',
        borderBottomWidth: 12,
        borderBottomColor: '#FFFFFF',
        borderLeftWidth: 12,
        borderLeftColor: '#D2C6B5',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: -1, height: -1 },
        shadowRadius: 1,
    },
    handwritingText: {
        fontFamily: 'Cormorant_700Bold',
        fontStyle: 'italic',
        fontSize: 12,
        color: '#2C2B29',
        textAlign: 'center',
        marginTop: 12,
    },
    toggleContainer: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 16,
    },
    capsuleToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EBE5DC',
        borderRadius: 20,
        padding: 4,
        width: 60,
        height: 32,
        position: 'relative',
    },
    toggleAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    toggleCheck: {
        position: 'absolute',
        right: 4,
        top: 4,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 1,
    },
    bottomIconBar: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#E9E3D9',
        paddingTop: 16,
    },
    iconBox: {
        borderWidth: 1,
        borderColor: '#E9E3D9',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        marginHorizontal: 4,
        backgroundColor: '#FFFFFF',
    },
});
