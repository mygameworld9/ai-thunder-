import React from 'react';
import { styles } from '../styles';

type LoadingSpinnerProps = {
    text: string;
};

export const LoadingSpinner = ({ text }: LoadingSpinnerProps) => (
    <div style={styles.spinnerContainer} aria-label="Loading">
        <div style={styles.spinner}></div>
        <p>{text}</p>
    </div>
);
