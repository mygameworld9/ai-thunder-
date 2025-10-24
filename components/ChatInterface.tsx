import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { styles } from '../styles';
import type { Message } from '../types';

type ChatInterfaceProps = {
    messages: Message[];
    isAwaitingResponse: boolean;
    onSendMessage: (input: string) => void;
};

export const ChatInterface = ({ messages, isAwaitingResponse, onSendMessage }: ChatInterfaceProps) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        onSendMessage(input);
        setInput('');
    };

    return (
        <div style={styles.card}>
            <div style={styles.chatContainer}>
                {messages.map((msg, index) => (
                    <div key={index} style={msg.role === 'assistant' ? styles.assistantMessage : styles.userMessage}>
                        <p style={styles.messageContent}>{msg.content}</p>
                    </div>
                ))}
                {isAwaitingResponse && (
                    <div style={styles.assistantMessage}>
                        <div style={styles.typingIndicator} className="typing-indicator">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} style={styles.chatForm}>
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    style={styles.chatTextarea}
                    placeholder="Type your answer..."
                    rows={3}
                    disabled={isAwaitingResponse}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e);
                        }
                    }}
                />
                <button type="submit" style={{ ...styles.button, ...((isAwaitingResponse || !input.trim()) && styles.buttonDisabled) }} disabled={isAwaitingResponse || !input.trim()}>
                    Send
                </button>
            </form>
        </div>
    );
};
