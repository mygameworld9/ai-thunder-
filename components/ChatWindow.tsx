import React, { useState, useRef, useEffect } from 'react';
import { Message, MessageRole } from '../types';
import { SendIcon, RobotIcon, UserIcon, SparklesIcon } from './icons';
import { translations } from '../translations';

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  onAutoReply: () => void;
  isLoading: boolean;
  isInterviewStarted: boolean;
  language: 'en' | 'zh';
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ messages, onSendMessage, onAutoReply, isLoading, isInterviewStarted, language }) => {
  // Fix: use `useState` from the corrected import.
  const [currentMessage, setCurrentMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const t = translations[language];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentMessage.trim() && !isLoading) {
      onSendMessage(currentMessage.trim());
      setCurrentMessage('');
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage(e as unknown as React.FormEvent);
    }
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-lg h-full flex flex-col">
      <h2 className="text-2xl font-bold text-slate-800 mb-4 border-b border-slate-200 pb-4">{t.chatTitle}</h2>
      
      {!isInterviewStarted ? (
        <div className="flex-grow flex flex-col items-center justify-center text-center text-slate-500">
          <RobotIcon className="w-16 h-16 text-slate-300 mb-4" />
          <p className="text-lg font-medium">{t.initialChatMessage1}</p>
          <p>{t.initialChatMessage2}</p>
        </div>
      ) : (
        <>
          <div className="flex-grow overflow-y-auto mb-4 custom-scrollbar pr-2">
            <div className="space-y-6">
              {messages.map((msg, index) => (
                <div key={index} className={`flex items-start gap-3 ${msg.role === MessageRole.USER ? 'justify-end' : ''}`}>
                  {msg.role === MessageRole.MODEL && (
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                      <RobotIcon className="w-5 h-5 text-slate-600" />
                    </div>
                  )}
                  <div className={`p-4 rounded-2xl max-w-lg ${msg.role === MessageRole.MODEL ? 'bg-slate-100 text-slate-800 rounded-tl-none' : 'bg-blue-600 text-white rounded-br-none'}`}>
                     <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                  {msg.role === MessageRole.USER && (
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                       <UserIcon className="w-5 h-5 text-blue-600" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                      <RobotIcon className="w-5 h-5 text-slate-600" />
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-100 text-slate-500 rounded-tl-none">
                        <div className="flex items-center space-x-1">
                            <span className="text-sm">AI is typing</span>
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse"></div>
                        </div>
                    </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
          <form onSubmit={handleSendMessage} className="relative">
            <textarea
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.chatPlaceholder}
              className="w-full p-4 pr-28 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition resize-none"
              rows={2}
              disabled={isLoading}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                <button
                    type="button"
                    title={t.autoReply}
                    onClick={onAutoReply}
                    className="p-2 rounded-full text-slate-500 hover:bg-slate-200 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:text-slate-400 disabled:hover:bg-transparent disabled:cursor-not-allowed transition"
                    disabled={isLoading}
                    >
                    <SparklesIcon className="w-5 h-5" />
                </button>
                <button
                type="submit"
                className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition"
                disabled={!currentMessage.trim() || isLoading}
                >
                <SendIcon className="w-5 h-5" />
                </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};
