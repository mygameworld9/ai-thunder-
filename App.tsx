import React, { useState } from 'react';
import type { Chat } from "@google/genai";
import { JobInputForm } from './components/JobInputForm';
import { ChatWindow } from './components/ChatWindow';
import { startChatAndGetFirstMessage } from './services/geminiService';
import { Message, MessageRole, JobDetails } from './types';
import { translations } from './translations';

function App() {
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'en' | 'zh'>('en');

  const handleStartInterview = async (details: JobDetails) => {
    setIsLoading(true);
    setChatHistory([]);
    setError(null);

    try {
      const { chatSession, firstMessage } = await startChatAndGetFirstMessage(details);
      setChatSession(chatSession);
      setChatHistory([{ role: MessageRole.MODEL, text: firstMessage }]);
      setIsInterviewStarted(true);
    } catch (error) {
      console.error("Failed to start interview:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      const displayError = `Sorry, I couldn't start the interview. Please check your inputs and try again. Error: ${errorMessage}`;
      setError(displayError);
      setChatHistory([{ role: MessageRole.MODEL, text: displayError }]);
      setIsInterviewStarted(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (messageText: string) => {
    if (!chatSession) return;

    const newUserMessage: Message = { role: MessageRole.USER, text: messageText };
    setChatHistory(prev => [...prev, newUserMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const result = await chatSession.sendMessage({ message: messageText });
      const modelResponse: Message = { role: MessageRole.MODEL, text: result.text };
      setChatHistory(prev => [...prev, modelResponse]);
    } catch (error) {
      console.error("Failed to send message:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      const errorResponse: Message = { role: MessageRole.MODEL, text: `Sorry, an error occurred: ${errorMessage}` };
      setError(errorResponse.text);
      setChatHistory(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoReply = async () => {
    if (!chatSession || isLoading) return;

    const lastQuestion = chatHistory.filter(m => m.role === MessageRole.MODEL).pop()?.text;
    if (!lastQuestion) return;

    setIsLoading(true);
    setError(null);
    
    const autoReplySystemPrompt = `${translations[language].autoReplyPrompt}\n\nThe last question was: "${lastQuestion}"`;
    
    try {
        // Generate an answer behind the scenes
        const generationResult = await chatSession.sendMessage({ message: autoReplySystemPrompt });
        const generatedAnswer = generationResult.text;
        
        // Now send the generated answer as a real message from the user
        await handleSendMessage(generatedAnswer);

    } catch (error) {
        console.error("Failed during auto-reply:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        const errorResponse: Message = { role: MessageRole.MODEL, text: `Sorry, an error occurred during auto-reply: ${errorMessage}` };
        setChatHistory(prev => [...prev, errorResponse]);
        setError(errorResponse.text);
        setIsLoading(false);
    }
    // handleSendMessage will set isLoading to false on completion
  };

  const t = translations[language];

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 md:p-8">
      <header className="w-full max-w-7xl mx-auto text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
          {t.mainTitle}
        </h1>
        <p className="mt-2 text-lg text-slate-600">
          {t.mainSubtitle}
        </p>
      </header>
      <main className="w-full max-w-7xl mx-auto flex-grow">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
            <div className="lg:max-h-[calc(100vh-12rem)]">
              <JobInputForm
                onStartInterview={handleStartInterview}
                isLoading={isLoading && !isInterviewStarted}
                isInterviewStarted={isInterviewStarted}
                language={language}
                onLanguageChange={setLanguage}
              />
            </div>
            <div className="lg:max-h-[calc(100vh-12rem)]">
              <ChatWindow
                messages={chatHistory}
                onSendMessage={handleSendMessage}
                onAutoReply={handleAutoReply}
                isLoading={isLoading && isInterviewStarted}
                isInterviewStarted={isInterviewStarted}
                language={language}
              />
            </div>
        </div>
      </main>
    </div>
  );
}

export default App;