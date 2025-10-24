import React, { useState, useCallback, ChangeEvent, FormEvent, useRef, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

type Message = {
    role: 'user' | 'assistant';
    content: string;
};

const App = () => {
  const [stage, setStage] = useState('setup'); // 'setup', 'loading', 'verification', 'interview', 'evaluation', 'error'
  const [formData, setFormData] = useState({
    position: '',
    company: '',
    jobDescription: '',
    resume: null as File | null,
  });
  const [verificationText, setVerificationText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);
  const [error, setError] = useState('');

  const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
  };

  const handleStartInterview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.position || !formData.resume) {
      setError('Target Position and Resume are required.');
      return;
    }
    setStage('loading');
    setError('');

    try {
      const ai = new GoogleGenAI({ apiKey: API_KEY });

      const { position, company, jobDescription, resume } = formData;
      const resumePart = await fileToGenerativePart(resume!);

      const systemPrompt = `You are a senior Tech Recruiting Lead with keen insight. Your task is to analyze and validate the context for an upcoming interview. You must identify any ambiguity or gaps in the provided information and generate a concise, insightful confirmation statement ending with a clear question.`;
      
      const userPrompt = `
        Analyze the following interview input data:

        1.  **Target Position:** "${position}"
        2.  **Candidate Resume:** [Attached file]
        3.  **Target Company:** "${company || 'Not provided'}"
        4.  **Job Description:** "${jobDescription || 'Not provided'}"

        Your Task:
        - Analyze potential ambiguities (e.g., does the target position have multiple meanings?).
        - Make a reasonable inference by combining the resume content with the position or company context.
        - Generate a 2-3 sentence "context confirmation" description. This must clearly state your inference and end with a direct confirmation question.

        Example Output:
        "I've reviewed your resume which highlights your experience with React and state management, and the target role is for a Frontend Developer at a company focused on IoT. I infer that this role will likely test your ability to build complex dashboards for device interaction, not just standard web pages. Is this the interview context you're preparing for?"
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { parts: [resumePart, { text: userPrompt }] }
        ],
        config: {
          systemInstruction: systemPrompt,
        }
      });
      
      setVerificationText(response.text);
      setStage('verification');
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to start interview. Please check your setup. Error: ${errorMessage}`);
      setStage('error');
    }
  };

  const handleConfirmInterview = async () => {
    setStage('interview');
    setIsAwaitingResponse(true);
    
    // This simulates the backend generating the first question based on P-QUESTION-GENERATE logic
    try {
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        const { position, company, resume } = formData;
        const resumePart = await fileToGenerativePart(resume!);

        const prompt = `Based on the attached resume for a "${position}" position${company ? ` at ${company}` : ''}, generate the first, open-ended behavioral interview question.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [resumePart, { text: prompt }] }],
        });

        setMessages([{ role: 'assistant', content: response.text }]);
    } catch (err) {
        console.error(err);
        setMessages([{ role: 'assistant', content: "Let's begin. Can you tell me about yourself and your background?" }]);
    } finally {
        setIsAwaitingResponse(false);
    }
  };

  const handleSendMessage = async (userInput: string) => {
    if (!userInput.trim() || isAwaitingResponse) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: userInput }];
    setMessages(newMessages);
    setIsAwaitingResponse(true);

    const questionCount = newMessages.filter(m => m.role === 'assistant').length;
    if (questionCount >= 3) { // End interview after 3 questions
        setTimeout(() => {
            setStage('evaluation');
            setIsAwaitingResponse(false);
        }, 1500);
        return;
    }

    // This simulates the backend generating the next question (P-QUESTION-GENERATE)
    try {
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        const { position, resume } = formData;
        const resumePart = await fileToGenerativePart(resume!);

        const historyForPrompt = newMessages.map(msg => `${msg.role === 'user' ? 'Candidate' : 'Interviewer'}: ${msg.content}`).join('\n');

        const prompt = `
        This is a mock interview for a "${position}" position.
        Resume is attached.

        Interview History:
        ${historyForPrompt}

        Your Task:
        Based on the candidate's last answer, generate the next logical interview question.
        - If the answer is brief, ask a follow-up question to probe for more detail.
        - If the answer is sufficient, pivot to a new topic relevant to the resume or position.
        - Do not repeat questions.
        - Only output the question itself.
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [resumePart, { text: prompt }] }],
        });

        setMessages([...newMessages, { role: 'assistant', content: response.text }]);
    } catch (err) {
        console.error(err);
        setMessages([...newMessages, { role: 'assistant', content: "That's interesting. Can you elaborate on that?" }]);
    } finally {
        setIsAwaitingResponse(false);
    }
  };

  const handleRestart = () => {
    setStage('setup');
    setFormData({
        position: '',
        company: '',
        jobDescription: '',
        resume: null as File | null,
    });
    setVerificationText('');
    setMessages([]);
    setError('');
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>AI Mock Interview</h1>
        <p style={styles.subtitle}>Prepare for your next big role.</p>
      </header>
      <main style={styles.main}>
        {stage === 'setup' && (
          <InterviewSetupForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleStartInterview}
          />
        )}
        {stage === 'loading' && <LoadingSpinner text="AI is preparing your session..."/>}
        {stage === 'verification' && (
            <VerificationScreen 
                text={verificationText} 
                onConfirm={handleConfirmInterview}
                onCorrect={handleRestart}
            />
        )}
        {stage === 'interview' && (
            <ChatInterface 
                messages={messages}
                isAwaitingResponse={isAwaitingResponse}
                onSendMessage={handleSendMessage}
            />
        )}
        {stage === 'evaluation' && <LoadingSpinner text="Interview complete. AI is evaluating your performance..."/>}
        {(stage === 'error' || (stage ==='setup' && error)) && <ErrorMessage message={error} onDismiss={handleRestart}/>}
      </main>
    </div>
  );
};

const InterviewSetupForm = ({ formData, setFormData, onSubmit }: { formData: any, setFormData: any, onSubmit: any }) => {
  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  }, [setFormData]);

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData((prev: any) => ({ ...prev, resume: e.target.files[0] }));
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
        <button type="submit" style={{...styles.button, ...(!isFormValid && styles.buttonDisabled)}} disabled={!isFormValid}>
          Start Mock Interview
        </button>
      </form>
    </div>
  );
};

const VerificationScreen = ({ text, onConfirm, onCorrect }: { text: string, onConfirm: () => void, onCorrect: () => void }) => (
    <div style={styles.card}>
        <h2 style={styles.cardTitle}>2. Confirm Interview Context</h2>
        <p style={styles.verificationText}>{text}</p>
        <div style={styles.buttonGroup}>
            <button onClick={onCorrect} style={{...styles.button, ...styles.secondaryButton}}>
                Start Over
            </button>
            <button onClick={onConfirm} style={styles.button}>
                Confirm & Begin
            </button>
        </div>
    </div>
);

const ChatInterface = ({ messages, isAwaitingResponse, onSendMessage }: { messages: Message[], isAwaitingResponse: boolean, onSendMessage: (input: string) => void }) => {
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
                        <div style={styles.typingIndicator}>
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
                <button type="submit" style={{...styles.button, ...((isAwaitingResponse || !input.trim()) && styles.buttonDisabled)}} disabled={isAwaitingResponse || !input.trim()}>
                    Send
                </button>
            </form>
        </div>
    );
};

const LoadingSpinner = ({text}: {text: string}) => (
  <div style={styles.spinnerContainer} aria-label="Loading">
    <div style={styles.spinner}></div>
    <p>{text}</p>
  </div>
);

const ErrorMessage = ({ message, onDismiss }: { message: string, onDismiss: () => void }) => (
    <div style={styles.errorContainer} role="alert">
        <p style={{margin: 0}}><strong>Error</strong></p>
        <p style={{margin: '8px 0'}}>{message}</p>
        <button onClick={onDismiss} style={styles.button}>Try Again</button>
    </div>
);

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    fontFamily: '"Inter", sans-serif',
    backgroundColor: '#111827',
    color: '#F9FAFB',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '2rem',
    boxSizing: 'border-box',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 700,
    color: '#fff',
    margin: '0 0 0.5rem 0',
  },
  subtitle: {
    fontSize: '1.1rem',
    color: '#9CA3AF',
    margin: 0,
  },
  main: {
    width: '100%',
    maxWidth: '600px',
  },
  card: {
    backgroundColor: '#1F2937',
    borderRadius: '12px',
    padding: '2rem',
    border: '1px solid #374151',
    display: 'flex',
    flexDirection: 'column',
  },
  cardTitle: {
      fontSize: '1.5rem',
      fontWeight: 600,
      marginTop: 0,
      marginBottom: '1.5rem',
      color: '#fff',
  },
  formGroup: {
    marginBottom: '1.5rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontSize: '0.9rem',
    fontWeight: 500,
    color: '#D1D5DB',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: '#374151',
    border: '1px solid #4B5563',
    borderRadius: '8px',
    color: '#F9FAFB',
    fontSize: '1rem',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: '#374151',
    border: '1px solid #4B5563',
    borderRadius: '8px',
    color: '#F9FAFB',
    fontSize: '1rem',
    fontFamily: '"Inter", sans-serif',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  fileInputContainer: {
      position: 'relative',
  },
  fileInput: {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: 0,
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      border: 0,
  },
  fileInputLabel: {
      display: 'block',
      padding: '0.75rem',
      backgroundColor: '#374151',
      border: '1px dashed #4B5563',
      borderRadius: '8px',
      color: '#9CA3AF',
      fontSize: '1rem',
      textAlign: 'center',
      cursor: 'pointer',
  },
  button: {
    width: '100%',
    padding: '0.875rem',
    backgroundColor: '#3B82F6',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  buttonDisabled: {
    backgroundColor: '#4B5563',
    cursor: 'not-allowed',
    opacity: 0.7,
  },
  spinnerContainer: {
      textAlign: 'center',
      padding: '3rem',
  },
  spinner: {
      display: 'inline-block',
      width: '50px',
      height: '50px',
      border: '3px solid rgba(255,255,255,.3)',
      borderRadius: '50%',
      borderTopColor: '#fff',
      animation: 'spin 1s ease-in-out infinite',
      marginBottom: '1rem',
  },
  verificationText: {
      lineHeight: 1.6,
      color: '#D1D5DB',
      backgroundColor: '#374151',
      padding: '1rem',
      borderRadius: '8px',
      marginBottom: '2rem',
  },
  buttonGroup: {
      display: 'flex',
      gap: '1rem',
  },
  secondaryButton: {
      backgroundColor: '#4B5563',
  },
  errorContainer: {
      backgroundColor: '#4B0A0A',
      border: '1px solid #991B1B',
      color: '#FCA5A5',
      borderRadius: '8px',
      padding: '1.5rem',
      textAlign: 'center',
  },
  chatContainer: {
    flexGrow: 1,
    overflowY: 'auto',
    marginBottom: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    maxHeight: '60vh',
    paddingRight: '10px',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#374151',
    borderRadius: '12px 12px 12px 0',
    maxWidth: '80%',
    padding: '0.75rem 1rem',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#3B82F6',
    borderRadius: '12px 12px 0 12px',
    maxWidth: '80%',
    padding: '0.75rem 1rem',
  },
  messageContent: {
      margin: 0,
      lineHeight: 1.5,
      whiteSpace: 'pre-wrap',
  },
  typingIndicator: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 0',
  },
  typingIndicatorSpan: {
    height: '8px',
    width: '8px',
    backgroundColor: '#9CA3AF',
    borderRadius: '50%',
    display: 'inline-block',
    margin: '0 2px',
    animation: 'bob 1.4s infinite ease-in-out both',
  },
  chatForm: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      marginTop: 'auto',
  },
  chatTextarea: {
      width: '100%',
      padding: '0.75rem',
      backgroundColor: '#374151',
      border: '1px solid #4B5563',
      borderRadius: '8px',
      color: '#F9FAFB',
      fontSize: '1rem',
      fontFamily: '"Inter", sans-serif',
      resize: 'none',
      boxSizing: 'border-box',
  },
};

// Add keyframes for animations
const styleSheet = document.createElement("style")
styleSheet.type = "text/css"
styleSheet.innerText = `
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes bob {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1.0); }
}
.typing-indicator span {
    height: 8px;
    width: 8px;
    background-color: #9CA3AF;
    border-radius: 50%;
    display: inline-block;
    margin: 0 2px;
    animation: bob 1.4s infinite ease-in-out both;
}
.typing-indicator span:nth-child(1) {
    animation-delay: -0.32s;
}
.typing-indicator span:nth-child(2) {
    animation-delay: -0.16s;
}
`
document.head.appendChild(styleSheet)

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);