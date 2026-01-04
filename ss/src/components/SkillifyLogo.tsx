import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface SkillifyLogoProps {
    size?: number;
}

const SkillifyLogo: React.FC<SkillifyLogoProps> = ({ size = 80 }) => {
    return (
        <View style={[styles.logoCircle, { width: size, height: size, borderRadius: size / 2 }]}>
            <Svg
                width={size * 0.5}
                height={size * 0.5}
                viewBox="0 0 24 24"
                fill="none"
            >
                <Path
                    d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                    stroke="#fff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </Svg>
        </View>
    );
};

const styles = StyleSheet.create({
    logoCircle: {
        backgroundColor: '#6366f1',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default SkillifyLogo;
