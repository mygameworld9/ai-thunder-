import React, { useState, FormEvent } from 'react';
import { styles } from '../styles';
import { VerificationScreenProps } from '../types';

export const VerificationScreen = ({ text, onConfirm, onCorrectionSubmit, onRestart }: VerificationScreenProps) => {
    const [isCorrecting, setIsCorrecting] = useState(false);
    const [correctionText, setCorrectionText] = useState('');

    const handleSubmitCorrection = (e: FormEvent) => {
        e.preventDefault();
        if (!correctionText.trim()) return;
        onCorrectionSubmit(correctionText);
        setCorrectionText('');
        setIsCorrecting(false);
    };

    return (
        <div style={styles.card}>
            <h2 style={styles.cardTitle}>2. Confirm Interview Context</h2>
            <p style={styles.verificationText}>{text}</p>
            
            {isCorrecting ? (
                <form onSubmit={handleSubmitCorrection}>
                    <div style={styles.formGroup}>
                        <label htmlFor="correction" style={styles.label}>Provide Correction</label>
                        <textarea
                            id="correction"
                            value={correctionText}
                            onChange={(e) => setCorrectionText(e.target.value)}
                            style={styles.textarea}
                            rows={3}
                            placeholder="e.g., 'Focus more on my backend experience with Node.js, not just frontend.'"
                            required
                        />
                    </div>
                    <div style={styles.buttonGroup}>
                        <button type="button" onClick={() => setIsCorrecting(false)} style={{ ...styles.button, ...styles.secondaryButton }}>
                            Cancel
                        </button>
                        <button type="submit" style={{...styles.button, ...(!correctionText.trim() && styles.buttonDisabled)}} disabled={!correctionText.trim()}>
                            Submit Correction
                        </button>
                    </div>
                </form>
            ) : (
                <div style={styles.buttonGroup}>
                    <button onClick={() => setIsCorrecting(true)} style={{ ...styles.button, ...styles.secondaryButton }}>
                        Correct
                    </button>
                    <button onClick={onConfirm} style={styles.button}>
                        Confirm & Begin
                    </button>
                </div>
            )}
            
            <button onClick={onRestart} style={{ ...styles.button, backgroundColor: 'transparent', color: '#9CA3AF', marginTop: '1rem', fontSize: '0.9rem' }}>
                Start Over
            </button>
        </div>
    );
};