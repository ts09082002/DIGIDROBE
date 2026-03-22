import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/theme';

export default function Index() {
    // This file acts as a landing strip for Expo Router.
    // AuthGate in _layout.tsx will immediately redirect the user to (auth)/login or (tabs).
    // Returning a blank loading view prevents the (tabs) from prematurely mounting
    // and causing react-native-screens IndexOutOfBounds exceptions on Android during replace.
    return (
        <View style={{ flex: 1, backgroundColor: Colors.warmGray, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={Colors.gold} />
        </View>
    );
} 
