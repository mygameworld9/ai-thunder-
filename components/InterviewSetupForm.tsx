import React, { ChangeEvent, useCallback } from 'react';
import { styles } from '../styles';
import type { InterviewFormData } from '../types';

type InterviewSetupFormProps = {
    formData: InterviewFormData;
    setFormData: React.Dispatch<React.SetStateAction<InterviewFormData>>;
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export const InterviewSetupForm = ({ formData, setFormData, onSubmit }: InterviewSetupFormProps) => {
    const modelsByProvider: { [key: string]: string[] } = {
        google: ['gemini-2.5-flash', 'gemini-2.5-pro'],
        openai: ['gpt-4o', 'gpt-3.5-turbo'],
        ollama: [], // Indicates a text input
    };

    const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    }, [setFormData]);

    const handleProviderChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
        const newProvider = e.target.value;
        const newModel = modelsByProvider[newProvider]?.[0] || '';
        setFormData((prev) => ({
            ...prev,
            provider: newProvider,
            model: newModel,
        }));
    }, [setFormData, modelsByProvider]);

    const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData((prev) => ({ ...prev, resume: e.target.files[0] }));
        }
    }, [setFormData]);

    const isFormValid = formData.position && formData.resume;

    return (
        <div style={styles.card}>
            <h2 style={styles.cardTitle}>1. Enter Interview Details</h2>
            <form onSubmit={onSubmit}>
                <div style={styles.formGroup}>
                    <label htmlFor="position" style={styles.label}>Target Position *</label>
                    <input
                        type="text"
                        id="position"
                        name="position"
                        value={formData.position}
                        onChange={handleInputChange}
                        style={styles.input}
                        placeholder="e.g., Senior Frontend Engineer"
                        required
                        aria-required="true"
                    />
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="company" style={styles.label}>Company Name</label>
                    <input
                        type="text"
                        id="company"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        style={styles.input}
                        placeholder="e.g., Google"
                    />
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="jobDescription" style={styles.label}>Job Description (JD)</label>
                    <textarea
                        id="jobDescription"
                        name="jobDescription"
                        value={formData.jobDescription}
                        onChange={handleInputChange}
                        style={styles.textarea}
                        rows={5}
                        placeholder="Paste the job description here..."
                    />
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="provider" style={styles.label}>AI Provider</label>
                    <select id="provider" name="provider" value={formData.provider} onChange={handleProviderChange} style={styles.input}>
                        <option value="google">Google</option>
                        <option value="openai">OpenAI</option>
                        <option value="ollama">Ollama (Local)</option>
                    </select>
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="model" style={styles.label}>AI Model</label>
                    {formData.provider === 'ollama' ? (
                        <input
                            type="text"
                            id="model"
                            name="model"
                            value={formData.model}
                            onChange={handleInputChange}
                            style={styles.input}
                            placeholder="e.g., llama3"
                        />
                    ) : (
                        <select id="model" name="model" value={formData.model} onChange={handleInputChange} style={styles.input} disabled={!modelsByProvider[formData.provider] || modelsByProvider[formData.provider].length === 0}>
                            {(modelsByProvider[formData.provider] || []).map(modelName => (
                                <option key={modelName} value={modelName}>{modelName}</option>
                            ))}
                        </select>
                    )}
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="resume" style={styles.label}>Upload Resume *</label>
                    <div style={styles.fileInputContainer}>
                        <input
                            type="file"
                            id="resume"
                            name="resume"
                            onChange={handleFileChange}
                            style={styles.fileInput}
                            accept="application/pdf, image/png, image/jpeg, image/webp"
                            required
                            aria-required="true"
                        />
                        <label htmlFor="resume" style={styles.fileInputLabel}>
                            {formData.resume ? formData.resume.name : 'Choose file (PDF, PNG, JPG)'}
                        </label>
                    </div>
                </div>
                <button type="submit" style={{ ...styles.button, ...(!isFormValid && styles.buttonDisabled) }} disabled={!isFormValid}>
                    Start Mock Interview
                </button>
            </form>
        </div>
    );
};