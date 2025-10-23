import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, GenerateContentResponse, Part } from '@google/genai';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.mjs`;

const API_KEY = process.env.API_KEY;

const SYSTEM_PROMPT_QUESTION = `You are a professional interviewer. Your task is to conduct a mock interview based on the provided resume and job description.
Ask exactly 5 questions, one at a time. Do not number the questions. Your tone should be professional and encouraging.
After the candidate provides their 5th answer, your next and final response must be a comprehensive evaluation report, not another question.`;
const SYSTEM_PROMPT_FINAL_REPORT = `You are an expert interview coach. Based on the entire conversation history (resume, job description, questions, and answers), provide a comprehensive evaluation report.
Analyze the candidate's strengths and weaknesses. Provide specific, actionable suggestions for improvement for each answer and overall.
Structure the report using Markdown for clear formatting. Include sections for "Overall Summary", "Question-by-Question Analysis", and "Final Recommendations".`;

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isSetupMessage?: boolean;
  resumePart?: Part;
}

// A simple component to render markdown-like text
const SimpleMarkdownRenderer = ({ text }: { text: string }) => {
    const html = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>')
        .replace(/\n/g, '<br />');

    const groupedHtml = html.replace(/<\/ul><br \/><ul>/g, '');

    return <div className="markdown-content" dangerouslySetInnerHTML={{ __html: groupedHtml }} />;
};

const App = () => {
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [jobDescription, setJobDescription] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [userInput, setUserInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isLoading]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'user' && !isLoading) {
      callGemini();
    }
  }, [messages]);

  const callGemini = async () => {
    setIsLoading(true);
    try {
      const assistantMessagesCount = messages.filter(m => m.role === 'assistant').length;
      const isFinalReport = assistantMessagesCount >= 5;
      const systemInstruction = isFinalReport ? SYSTEM_PROMPT_FINAL_REPORT : SYSTEM_PROMPT_QUESTION;
      
      const history = messages.map(msg => {
        let parts: Part[] = [{ text: msg.content }];
        if (msg.isSetupMessage && msg.resumePart) {
          parts.unshift(msg.resumePart);
        }
        return {
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: parts,
        };
      });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: history,
        config: {
          systemInstruction: systemInstruction,
        },
      });

      const newAssistantMessage: Message = { role: 'assistant', content: response.text };
      setMessages(prev => [...prev, newAssistantMessage]);
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, an error occurred. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeFile || !jobDescription) {
      alert("Please provide both a resume and a job description.");
      return;
    }
    
    let resumePart: Part | undefined = undefined;
    let resumeContentForPrompt = '';
    
    if (resumeFile.type.startsWith('image/')) {
        const base64Data = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(resumeFile);
        });
        resumePart = {
            inlineData: { mimeType: resumeFile.type, data: base64Data },
        };
        resumeContentForPrompt = "The candidate's resume is provided as an image.";
    } else if (resumeFile.type === 'application/pdf') {
        try {
            const arrayBuffer = await resumeFile.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            let textContent = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const text = await page.getTextContent();
                textContent += text.items.map(item => ('str' in item ? item.str : '')).join(' ');
                textContent += '\n';
            }
            resumeContentForPrompt = textContent;
        } catch (error) {
            console.error("Error parsing PDF:", error);
            alert("Could not read the PDF file. Please try another file or format.");
            return;
        }
    } else {
        resumeContentForPrompt = await resumeFile.text();
    }
    
    const initialPrompt = `Job Description:\n${jobDescription}\n\nResume:\n${resumeContentForPrompt}\n\nPlease start the interview by asking the first question.`;
    
    const setupMessage: Message = {
      role: 'user',
      content: initialPrompt,
      isSetupMessage: true,
      resumePart: resumePart,
    };
    
    setIsInterviewStarted(true);
    setMessages([setupMessage]);
  };

  const handleSendAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;
    setMessages(prev => [...prev, { role: 'user', content: userInput }]);
    setUserInput('');
  };

  const renderSetupScreen = () => (
    <div className="setup-container">
      <h1>AI Mock Interview Coach</h1>
      <p>Upload your resume and the job description to get started.</p>
      <form onSubmit={handleStartInterview} className="setup-form">
        <div className="form-group">
          <label htmlFor="resume-file">Resume (.md, .txt, .pdf, .png, .jpg)</label>
          <label htmlFor="resume-file" className="file-input-label">
            {resumeFile ? 'File selected' : 'Choose a file'}
          </label>
          <input 
            id="resume-file"
            type="file"
            accept=".md,.txt,.pdf,.png,.jpg,.jpeg"
            onChange={e => setResumeFile(e.target.files ? e.target.files[0] : null)}
          />
          {resumeFile && <p className="file-name">{resumeFile.name}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="job-description">Job Description</label>
          <textarea
            id="job-description"
            className="textarea"
            rows={8}
            value={jobDescription}
            onChange={e => setJobDescription(e.target.value)}
            placeholder="Paste the job description here..."
          />
        </div>
        <button type="submit" className="start-btn" disabled={!resumeFile || !jobDescription || isLoading}>
          Start Interview
        </button>
      </form>
    </div>
  );

  const renderChatScreen = () => (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((msg, index) => (
          !msg.isSetupMessage && (
            <div key={index} className={`message-bubble ${msg.role}`}>
              {msg.role === 'assistant' ? <SimpleMarkdownRenderer text={msg.content} /> : msg.content}
            </div>
          )
        ))}
        {isLoading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <span>AI is thinking...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <form onSubmit={handleSendAnswer} className="chat-input-form">
        <input
          type="text"
          className="chat-input"
          value={userInput}
          onChange={e => setUserInput(e.target.value)}
          placeholder="Type your answer..."
          disabled={isLoading || messages.filter(m => m.role === 'assistant').length >= 6}
        />
        <button type="submit" className="send-btn" disabled={isLoading || !userInput.trim()}>
          Send
        </button>
      </form>
    </div>
  );

  return (
    <div className="app-container">
      {!isInterviewStarted ? renderSetupScreen() : renderChatScreen()}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<React.StrictMode><App /></React.StrictMode>);