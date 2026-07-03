import React, { useRef, useState } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    Dimensions,
    SafeAreaView,
    ScrollView,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useThemeColors } from '../../context/ThemeContext';
import type { WardrobeItem } from '../../services/api';
import AvatarOutfitLayer from './AvatarOutfitLayer';

const { width } = Dimensions.get('window');
const CARD_W = Math.min(width - 32, 380);

interface ShareOutfitModalProps {
    visible: boolean;
    onClose: () => void;
    topItem: WardrobeItem | null;
    bottomItem: WardrobeItem | null;
    shoeItem: WardrobeItem | null;
}

export default function ShareOutfitModal({
    visible,
    onClose,
    topItem,
    bottomItem,
    shoeItem,
}: ShareOutfitModalProps) {
    const tc = useThemeColors();
    const viewShotRef = useRef<ViewShot>(null);
    const [selectedGender, setSelectedGender] = useState<'girl' | 'boy'>('girl');

    const handleShare = async () => {
        try {
            if (!viewShotRef.current?.capture) {
                Alert.alert('Error', 'Share card not ready yet.');
                return;
            }
            const uri = await viewShotRef.current.capture();
            const shareable = await Sharing.isAvailableAsync();
            if (shareable) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'image/jpeg',
                    dialogTitle: 'Share today\'s vibe!',
                });
            } else {
                Alert.alert('Sharing unavailable', 'Could not open share dialogue.');
            }
        } catch (error) {
            console.error('Failed to share card:', error);
            Alert.alert('Error', 'Failed to generate shareable card.');
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <SafeAreaView style={styles.safeContainer}>
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        {/* Card Container for ViewShot Capture */}
                        <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.95 }} style={styles.viewShotContainer}>
                            <View style={styles.cardContainer}>
                                {/* Top Header Bar */}
                                <View style={styles.cardHeader}>
                                    <View style={styles.sparkleContainer}>
                                        <Ionicons name="sparkles" size={16} color="#E7C693" />
                                    </View>
                                    <View style={styles.headerTextContainer}>
                                        <Text style={styles.titleText}>vibe check</Text>
                                        <Text style={styles.subtitleText}>your daily outfit inspo</Text>
                                    </View>
                                    <View style={styles.sparkleContainer}>
                                        <Ionicons name="sparkles" size={16} color="#E7C693" />
                                    </View>
                                    <View style={styles.headerActionIcons}>
                                        <TouchableOpacity style={styles.shareHeaderBtn} onPress={handleShare}>
                                            <Ionicons name="share-social" size={16} color="#2C2B29" />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.closeCardBtn} onPress={onClose}>
                                            <Ionicons name="close" size={16} color="#2C2B29" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Main Body Layout */}
                                <View style={styles.cardBody}>
                                    {/* Left Column */}
                                    <View style={styles.leftColumn}>
                                        <Text style={styles.greetingText}>hey, pretty! ♡</Text>
                                        <Text style={styles.vibeLabelText}>today's vibe is</Text>
                                        <View style={styles.vibeValueContainer}>
                                            <Text style={styles.vibeValueText}>soft girl</Text>
                                            <Ionicons name="flower" size={18} color="#C78B80" style={styles.flowerIcon} />
                                        </View>

                                        {/* Weather Widget */}
                                        <View style={styles.weatherWidget}>
                                            <View style={styles.weatherRow}>
                                                <Ionicons name="sunny" size={16} color="#E7C693" />
                                                <Text style={styles.weatherText}>29°C sunny</Text>
                                            </View>
                                            <View style={styles.weatherRow}>
                                                <Ionicons name="cafe" size={16} color="#8E7E73" />
                                                <Text style={styles.weatherText}>perfect for brunch</Text>
                                            </View>
                                        </View>

                                        {/* Pink Sticky Note */}
                                        <View style={styles.stickyNoteContainer}>
                                            <View style={styles.tape} />
                                            <Text style={styles.stickyText}>{"this fit =\ngood mood :)"}</Text>
                                            <Text style={styles.stickyHeart}>♡</Text>
                                        </View>
                                    </View>

                                    {/* Right Column */}
                                    <View style={styles.rightColumn}>
                                        {/* Polaroid Frame */}
                                        <View style={styles.polaroidFrame}>
                                            <View style={styles.polaroidTape} />
                                            <View style={styles.girlImageContainer}>
                                                 <AvatarOutfitLayer
                                                     currentVibe={selectedGender === 'girl' ? 'soft_girl' : 'boss_chic'}
                                                     outfitColors={{
                                                         top: topItem?.color && topItem.color.startsWith('#') ? topItem.color : '#F5F5DC',
                                                         bottom: bottomItem?.color && bottomItem.color.startsWith('#') ? bottomItem.color : '#4682B4',
                                                         shoes: shoeItem?.color && shoeItem.color.startsWith('#') ? shoeItem.color : '#111111',
                                                     }}
                                                 />
                                            </View>
                                            {/* Circular Sticker Overlay */}
                                            <View style={styles.stickerCircle}>
                                                <Text style={styles.stickerText}>{"be you,\ndo you\n♡"}</Text>
                                            </View>
                                        </View>

                                        {/* Speech Bubble Annotation */}
                                        <View style={styles.speechBubble}>
                                            <Text style={styles.speechText}>{"you look\namazing\ntoday! ♡"}</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Gender Choice Selectors */}
                                <Text style={styles.vibeForText}>♡ who's this vibe for? ♡</Text>
                                <View style={styles.genderRow}>
                                    <TouchableOpacity
                                        style={[
                                            styles.genderButton,
                                            selectedGender === 'girl' && styles.genderButtonSelected,
                                        ]}
                                        onPress={() => setSelectedGender('girl')}
                                    >
                                        <Image
                                            source={require('../../assets/model-placeholder.png')}
                                            style={styles.genderAvatar}
                                            resizeMode="cover"
                                        />
                                        <Text style={styles.genderButtonText}>girl</Text>
                                        {selectedGender === 'girl' && (
                                            <View style={styles.checkBadge}>
                                                <Ionicons name="checkmark" size={10} color="#FFF" />
                                            </View>
                                        )}
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.genderButton,
                                            selectedGender === 'boy' && styles.genderButtonSelected,
                                        ]}
                                        onPress={() => setSelectedGender('boy')}
                                    >
                                        <Image
                                            source={require('../../assets/model-placeholder.png')}
                                            style={styles.genderAvatar}
                                            resizeMode="cover"
                                        />
                                        <Text style={styles.genderButtonText}>boy</Text>
                                        {selectedGender === 'boy' && (
                                            <View style={styles.checkBadge}>
                                                <Ionicons name="checkmark" size={10} color="#FFF" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </View>

                                {/* Action Buttons Row */}
                                <View style={styles.actionRow}>
                                    <TouchableOpacity style={styles.auxButton}>
                                        <Ionicons name="shuffle" size={16} color="#4C4641" />
                                        <Text style={styles.auxButtonText}>another vibe</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.primaryLoveButton} onPress={handleShare}>
                                        <Ionicons name="heart" size={16} color="#FFF" />
                                        <Text style={styles.loveButtonText}>love it</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.auxButton}>
                                        <Ionicons name="calendar" size={16} color="#4C4641" />
                                        <Text style={styles.auxButtonText}>wear today</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </ViewShot>
                    </ScrollView>
                </SafeAreaView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    safeContainer: {
        width: '100%',
        maxHeight: '95%',
    },
    scrollContent: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    viewShotContainer: {
        borderRadius: 24,
        overflow: 'hidden',
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        marginBottom: 16,
        position: 'relative',
    },
    sparkleContainer: {
        marginHorizontal: 8,
    },
    headerTextContainer: {
        alignItems: 'center',
    },
    titleText: {
        fontFamily: 'Cormorant_700Bold',
        fontSize: 30,
        fontStyle: 'italic',
        color: '#2C2B29',
        textAlign: 'center',
    },
    subtitleText: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 10,
        color: '#8A857F',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginTop: 2,
    },
    headerActionIcons: {
        position: 'absolute',
        right: 0,
        top: 0,
        flexDirection: 'row',
        gap: 8,
    },
    shareHeaderBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#EBE5DC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeCardBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#EBE5DC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardBody: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    leftColumn: {
        width: '45%',
        justifyContent: 'flex-start',
    },
    greetingText: {
        fontFamily: 'Cormorant_600SemiBold',
        fontSize: 15,
        fontStyle: 'italic',
        color: '#8E7E73',
        marginBottom: 4,
    },
    vibeLabelText: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 13,
        color: '#4B4641',
    },
    vibeValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
        marginBottom: 12,
    },
    vibeValueText: {
        fontFamily: 'Cormorant_700Bold',
        fontSize: 28,
        fontStyle: 'italic',
        color: '#C78B80',
    },
    flowerIcon: {
        marginLeft: 6,
    },
    weatherWidget: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E9E3D9',
        borderRadius: 12,
        padding: 8,
        gap: 6,
        marginBottom: 16,
    },
    weatherRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    weatherText: {
        fontFamily: 'Montserrat_400Regular',
        fontSize: 10,
        color: '#8E7E73',
    },
    stickyNoteContainer: {
        backgroundColor: '#FCEEEB',
        borderRadius: 8,
        padding: 10,
        alignItems: 'center',
        position: 'relative',
        shadowColor: '#C78B80',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2,
    },
    tape: {
        width: 32,
        height: 10,
        backgroundColor: '#EADCD4',
        position: 'absolute',
        top: -5,
        opacity: 0.8,
    },
    stickyText: {
        fontFamily: 'Cormorant_700Bold',
        fontSize: 13,
        fontStyle: 'italic',
        color: '#7C5D53',
        textAlign: 'center',
        lineHeight: 16,
    },
    stickyHeart: {
        fontSize: 12,
        color: '#C78B80',
        marginTop: 4,
    },
    rightColumn: {
        width: '50%',
        alignItems: 'center',
    },
    polaroidFrame: {
        backgroundColor: '#FFFFFF',
        padding: 8,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        elevation: 3,
        position: 'relative',
        alignItems: 'center',
    },
    polaroidTape: {
        width: 36,
        height: 12,
        backgroundColor: '#EADCD4',
        position: 'absolute',
        top: -6,
        opacity: 0.85,
    },
    girlImageContainer: {
        width: 140,
        height: 180,
        borderRadius: 8,
        backgroundColor: '#FAF6F0',
        overflow: 'hidden',
    },
    stickerCircle: {
        position: 'absolute',
        bottom: -15,
        right: -10,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#EADCD4',
        borderWidth: 1,
        borderColor: '#D8C8BE',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stickerText: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 7,
        color: '#7A6A60',
        textAlign: 'center',
        lineHeight: 9,
    },
    speechBubble: {
        marginTop: 20,
        padding: 8,
        backgroundColor: '#FFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E9E3D9',
    },
    speechText: {
        fontFamily: 'Cormorant_700Bold',
        fontSize: 11,
        fontStyle: 'italic',
        color: '#4C4641',
        textAlign: 'center',
        lineHeight: 14,
    },
    vibeForText: {
        fontFamily: 'Cormorant_700Bold',
        fontSize: 12,
        fontStyle: 'italic',
        color: '#8C8176',
        marginVertical: 10,
        textAlign: 'center',
    },
    genderRow: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        marginBottom: 20,
        gap: 12,
    },
    genderButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E9E3D9',
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        gap: 8,
        position: 'relative',
    },
    genderButtonSelected: {
        borderColor: '#C78B80',
        backgroundColor: '#FCEEEB',
    },
    genderAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    genderButtonText: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 13,
        color: '#4C4641',
    },
    checkBadge: {
        position: 'absolute',
        right: 8,
        bottom: 8,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#C78B80',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionRow: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
    },
    auxButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E9E3D9',
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 10,
        gap: 4,
    },
    auxButtonText: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 10,
        color: '#4C4641',
    },
    primaryLoveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#C78B80',
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 16,
        gap: 6,
        flex: 1.2,
        justifyContent: 'center',
    },
    loveButtonText: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 12,
        color: '#FFFFFF',
    },
});
