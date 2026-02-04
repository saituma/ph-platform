import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Redirect, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import './global.css';
import { Platform } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AppThemeProvider from './theme/AppThemeProvider';
import useLoadFonts from './hooks/useLoadFonts';
import { SafeAreaProvider } from 'react-native-safe-area-context';

if (Platform.OS === 'web') {
    require('./fonts.css');
}



const isLoggedIn = false;
export default function RootLayout() {
    const colorScheme = useColorScheme();
    const segments = useSegments();

    const inAuthGroup = segments?.[0] === '(auth)';

    const fontsLoaded = useLoadFonts();

    if (Platform.OS !== 'web' && !fontsLoaded) {
        return null;
    }

    if (!isLoggedIn && !inAuthGroup) {
        return <Redirect href="/(auth)/login" />;
    }
    return (
        <SafeAreaProvider>
                <AppThemeProvider colorScheme={colorScheme === 'light' ? 'light' : 'dark'}>
                    <ThemeProvider value={colorScheme === 'light' ? DefaultTheme : DarkTheme}>
                        <Stack>
                            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                        </Stack>
                        <StatusBar style="auto" />
                    </ThemeProvider>
                </AppThemeProvider>

            </SafeAreaProvider>
    );
}
