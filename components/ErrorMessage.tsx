import React from 'react';
import { styles } from '../styles';

type ErrorMessageProps = {
    message: string;
    onDismiss: () => void;
};

export const ErrorMessage = ({ message, onDismiss }: ErrorMessageProps) => (
    <div style={styles.errorContainer} role="alert">
        <p style={{ margin: 0 }}><strong>Error</strong></p>
        <p style={{ margin: '8px 0' }}>{message}</p>
        <button onClick={onDismiss} style={styles.button}>Try Again</button>
    </div>
);
