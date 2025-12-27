import { useCallback, useEffect, useState } from 'react';

export function useVoice() {
    const [isSupported, setIsSupported] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    useEffect(() => {
        setIsSupported('speechSynthesis' in window);
    }, []);

    const speak = useCallback((text: string) => {
        if (!isSupported || isMuted || typeof window === 'undefined') return;

        // Cancel any current speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // Sci-Fi Voice Settings
        utterance.volume = 1; // 0 to 1
        utterance.rate = 1.1; // Slightly faster for computer feel
        utterance.pitch = 1.0; // Normal pitch

        // Try to find a "Google US English" or similar generic female voice if available
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes("Google US English") || v.name.includes("Samantha"));
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    }, [isSupported, isMuted]);

    const cancel = useCallback(() => {
        if (typeof window !== 'undefined') {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
    }, []);

    const toggleMute = useCallback(() => setIsMuted(prev => !prev), []);

    return {
        speak,
        cancel,
        toggleMute,
        isMuted,
        isSpeaking,
        isSupported
    };
}
