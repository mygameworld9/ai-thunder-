import React, { useState, FormEvent, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { InterviewSetupForm } from "./components/InterviewSetupForm";
import { VerificationScreen } from "./components/VerificationScreen";
import { ChatInterface } from "./components/ChatInterface";
import { FinalReport } from "./components/FinalReport";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { ErrorMessage } from "./components/ErrorMessage";
import { styles } from "./styles";
import * as api from "./services/api";
import type { Message, ReportData, InterviewFormData } from "./types";

const App = () => {
  const [stage, setStage] = useState('setup'); // 'setup', 'loading', 'verification', 'interview', 'evaluation', 'report', 'error'
  const [formData, setFormData] = useState<InterviewFormData>({
    position: '',
    company: '',
    jobDescription: '',
    resume: null as File | null,
    provider: 'google',
    model: 'gemini-2.5-flash',
  });
  const [verificationText, setVerificationText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [error, setError] = useState('');
  const [isCorrecting, setIsCorrecting] = useState(false);

  const handleStartInterview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.position || !formData.resume) {
      setError('Target Position and Resume are required.');
      return;
    }
    setStage('loading');
    setError('');

    try {
      const text = await api.startInterview(formData);
      setVerificationText(text);
      setStage('verification');
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to start interview setup. Please check your inputs and API key. Error: ${errorMessage}`);
      setStage('error');
    }
  };
  
  const handleCorrectionSubmit = async (correctionText: string) => {
    setIsCorrecting(true);
    try {
      const newVerificationText = await api.correctInterviewContext(correctionText, verificationText, formData);
      setVerificationText(newVerificationText);
    } catch (err) {
      console.error("Failed to apply correction:", err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to apply correction. Error: ${errorMessage}`);
      setStage('error');
    } finally {
      setIsCorrecting(false);
    }
  };

  const handleConfirmInterview = async () => {
    setStage('interview');
    setIsAwaitingResponse(true);
    
    try {
      const firstQuestion = await api.getInitialQuestion(formData);
      setMessages([{ role: 'assistant', content: firstQuestion }]);
    } catch (err) {
      console.error(err);
      // Fallback question in case of an error
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

    try {
      const nextQuestion = await api.getNextQuestion(newMessages, formData);
      setMessages([...newMessages, { role: 'assistant', content: nextQuestion }]);
    } catch (err) {
      console.error(err);
      // Fallback question
      setMessages([...newMessages, { role: 'assistant', content: "That's interesting. Can you elaborate on that?" }]);
    } finally {
      setIsAwaitingResponse(false);
    }
  };
  
  useEffect(() => {
    if (stage === 'evaluation') {
      const generateReport = async () => {
        try {
          const report = await api.generateFinalReport(messages, formData);
          setReportData(report);
          setStage('report');
        } catch (err) {
          console.error("Failed to generate report:", err);
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
          setError(`Failed to generate the final report. Error: ${errorMessage}`);
          setStage('error');
        }
      };
      generateReport();
    }
  }, [stage, messages, formData]);

  const restart = () => {
    setStage('setup');
    setFormData({
      position: '',
      company: '',
      jobDescription: '',
      resume: null,
      provider: 'google',
      model: 'gemini-2.5-flash',
    });
    setVerificationText('');
    setMessages([]);
    setIsAwaitingResponse(false);
    setReportData(null);
    setError('');
    setIsCorrecting(false);
  };

  const renderStage = () => {
    switch (stage) {
      case 'setup':
        return <InterviewSetupForm formData={formData} setFormData={setFormData} onSubmit={handleStartInterview} />;
      case 'loading':
      case isCorrecting && 'verification':
        return <LoadingSpinner text={isCorrecting ? "Refining context..." : "Analyzing your profile..."} />;
      case 'verification':
        return <VerificationScreen text={verificationText} onConfirm={handleConfirmInterview} onCorrectionSubmit={handleCorrectionSubmit} onRestart={restart} />;
      case 'interview':
        return <ChatInterface messages={messages} isAwaitingResponse={isAwaitingResponse} onSendMessage={handleSendMessage} />;
      case 'evaluation':
        return <LoadingSpinner text="Compiling your performance report..." />;
      case 'report':
        return reportData ? <FinalReport report={reportData} onRestart={restart} /> : <LoadingSpinner text="Loading report..." />;
      case 'error':
        return <ErrorMessage message={error} onDismiss={restart} />;
      default:
        return null;
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>AI Mock Interview</h1>
        <p style={styles.subtitle}>Powered by Google Gemini</p>
      </header>
      <main style={styles.main}>
        {renderStage()}
      </main>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);