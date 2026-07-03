import React from 'react';
import Svg, { G, Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

interface PoseProps {
    shirtColor: string;
    pantsColor: string;
    shoesColor: string;
}

export const PoseBossChic = ({ shirtColor, pantsColor, shoesColor }: PoseProps) => {
    return (
        <Svg width="100%" height="100%" viewBox="0 0 400 500" style={{ backgroundColor: '#FAF6F0' }}>
            <Defs>
                <LinearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#FFF3EE" />
                    <Stop offset="100%" stopColor="#F9E2D8" />
                </LinearGradient>
                <LinearGradient id="hairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#5A473E" />
                    <Stop offset="100%" stopColor="#3E2F28" />
                </LinearGradient>
                <LinearGradient id="blazerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#E2D4C5" />
                    <Stop offset="100%" stopColor="#CEBEAE" />
                </LinearGradient>
            </Defs>

            {/* 1. Body Base */}
            <G id="skin_body">
                <Path d="M192 165 C192 165, 192 195, 192 195 L208 195 L208 165 Z" fill="url(#skinGrad)" stroke="#EADCD4" strokeWidth="1" />
                <Path d="M172 130 C172 90, 228 90, 228 130 C228 165, 172 165, 172 130 Z" fill="url(#skinGrad)" stroke="#EADCD4" strokeWidth="1" />
            </G>

            {/* 2. Dynamic Shirt Base */}
            <G id="shirt_base">
                <Path
                    d="M188 195 L212 195 L215 250 L185 250 Z"
                    fill={shirtColor || '#FFFFFF'}
                />
            </G>

            {/* 3. Shirt Shadows & Folds */}
            <G id="shirt_shadows">
                <Path
                    d="M195 195 L195 250 M205 195 L205 250"
                    stroke="black"
                    strokeWidth="1.2"
                    opacity={0.12}
                    fill="none"
                />
            </G>

            {/* 4. Dynamic Pants Base */}
            <G id="pants_base">
                <Path
                    d="M180 320 L220 320 L230 450 L205 450 L200 360 L195 450 L170 450 Z"
                    fill={pantsColor || '#3D3D3D'}
                />
            </G>

            {/* 5. Pants Shadows & Creases */}
            <G id="pants_shadows" opacity={0.12}>
                <Path d="M190 320 L182 450 M210 320 L218 450 M200 330 L200 360" stroke="black" strokeWidth="1.5" fill="none" />
            </G>

            {/* 6. Shoes Base */}
            <G id="shoes_base">
                <Path d="M168 450 L188 450 L185 465 L165 465 Z" fill={shoesColor || '#333333'} />
                <Path d="M212 450 L232 450 L235 465 L215 465 Z" fill={shoesColor || '#333333'} />
            </G>

            {/* 7. Shoe Shadows */}
            <G id="shoe_shadows" opacity={0.12}>
                <Path d="M165 462 L185 462" stroke="black" strokeWidth="1" fill="none" />
                <Path d="M215 462 L235 462" stroke="black" strokeWidth="1" fill="none" />
            </G>

            {/* 8. Outer Cardigan Blazer */}
            <G id="outer_blazer">
                <Path d="M170 200 L230 200 L235 330 L165 330 Z" fill="url(#blazerGrad)" stroke="#B3A292" strokeWidth="1" />
                <Path d="M170 200 L195 270 L185 330 Z" fill="#BCAE9F" />
                <Path d="M230 200 L205 270 L215 330 Z" fill="#BCAE9F" />
                <Circle cx="200" cy="285" r="3" fill="#2C2B29" />
            </G>

            {/* 9. Hands & Props */}
            <G id="hands_and_props">
                <Path d="M160 250 C160 250, 180 255, 185 260 M240 250 C240 250, 220 255, 215 260" stroke="#EADCD4" strokeWidth="1.5" fill="none" />
                <Circle cx="183" cy="260" r="5" fill="url(#skinGrad)" />
                <Circle cx="217" cy="260" r="5" fill="url(#skinGrad)" />
            </G>

            {/* 10. Hair */}
            <G id="hair">
                <Path d="M170 125 C170 95, 230 95, 230 125 C230 145, 235 170, 225 190 C215 175, 185 175, 175 190 C165 170, 170 145, 170 125 Z" fill="url(#hairGrad)" />
                <Path d="M185 110 Q192 120 188 130" stroke="#3E2F28" strokeWidth="1" fill="none" />
                <Path d="M215 110 Q208 120 212 130" stroke="#3E2F28" strokeWidth="1" fill="none" />
            </G>

            {/* 11. Face details */}
            <G id="face_details">
                <Path d="M182 132 C184 126, 192 126, 194 132" stroke="#2C2B29" strokeWidth="2.5" fill="none" />
                <Circle cx="188" cy="136" r="4.5" fill="#2C2B29" />
                <Circle cx="187" cy="134" r="1.5" fill="#FFF" />
                <Path d="M206 132 C208 126, 216 126, 218 132" stroke="#2C2B29" strokeWidth="2.5" fill="none" />
                <Circle cx="212" cy="136" r="4.5" fill="#2C2B29" />
                <Circle cx="211" cy="134" r="1.5" fill="#FFF" />
                <Path d="M180 123 Q188 120 193 125" stroke="#5A473E" strokeWidth="1.5" fill="none" />
                <Path d="M207 125 Q212 120 220 123" stroke="#5A473E" strokeWidth="1.5" fill="none" />
                <Path d="M199 140 Q200 143 201 140" stroke="#8E7E73" strokeWidth="1" fill="none" />
                <Path d="M195 149 Q200 154 205 149" stroke="#8E7E73" strokeWidth="1.5" fill="none" />
                <Circle cx="178" cy="144" r="5" fill="#C78B80" opacity={0.35} />
                <Circle cx="222" cy="144" r="5" fill="#C78B80" opacity={0.35} />
            </G>
        </Svg>
    );
};

export default PoseBossChic;
