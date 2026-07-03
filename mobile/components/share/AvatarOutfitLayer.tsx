import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PoseSoftGirl } from './poses/PoseSoftGirl';
import { PoseBossChic } from './poses/PoseBossChic';

const PoseMatrix: Record<string, React.FC<any>> = {
    'soft_girl': PoseSoftGirl,
    'boss_chic': PoseBossChic,
};

interface AvatarOutfitLayerProps {
    currentVibe: string;
    outfitColors: {
        top: string;
        bottom: string;
        shoes: string;
    };
}

export default function AvatarOutfitLayer({ currentVibe, outfitColors }: AvatarOutfitLayerProps) {
    const normalizedVibe = currentVibe?.toLowerCase()?.replace(/\s+/g, '_') || 'soft_girl';
    const TargetPose = PoseMatrix[normalizedVibe] || PoseMatrix['soft_girl'];

    return (
        <View style={styles.container}>
            <TargetPose
                shirtColor={outfitColors.top}
                pantsColor={outfitColors.bottom}
                shoesColor={outfitColors.shoes}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#FAF6F0',
        borderRadius: 8,
        overflow: 'hidden',
    },
});
