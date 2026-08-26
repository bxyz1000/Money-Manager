import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { supabase } from '@/services/supabase.client';

export default function AuthCallbackScreen() {
    const params = useLocalSearchParams<{
        code?: string;
        error?: string;
        error_description?: string;
    }>();

    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    useEffect(() => {
        let mounted = true;

        async function finishAuth() {
            if (params.error) {
                if (mounted) {
                    setError(
                        params.error_description ??
                        params.error ??
                        'Google sign-in failed.',
                    );
                }
                return;
            }

            if (!params.code) {
                if (mounted) {
                    setError('No authentication code was received.');
                }
                return;
            }

            const { error: exchangeError } =
                await supabase.auth.exchangeCodeForSession(params.code);

            if (!mounted) {
                return;
            }

            if (exchangeError) {
                setError(exchangeError.message);
                return;
            }

            setDone(true);
        }

        void finishAuth();

        return () => {
            mounted = false;
        };
    }, [params.code, params.error, params.error_description]);

    if (done) {
        return <Redirect href="/(app)/(tabs)/home" />;
    }

    if (error) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Sign-in failed</Text>
                <Text style={styles.error}>{error}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" />
            <Text style={styles.text}>Completing Google sign-in...</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    error: {
        marginTop: 12,
        textAlign: 'center',
    },
    text: {
        marginTop: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
    },
});