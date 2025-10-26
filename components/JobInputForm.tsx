
import React, { useState, useRef, useEffect } from 'react';
import type { JobDetails } from '../types';
import { FileIcon, TrashIcon, SaveIcon, ClearIcon } from './icons';
import { translations } from '../translations';

interface JobInputFormProps {
  onStartInterview: (details: JobDetails) => void;
  isLoading: boolean;
  isInterviewStarted: boolean;
  language: 'en' | 'zh';
  onLanguageChange: (lang: 'en' | 'zh') => void;
}

const fileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const dataURLtoFile = (dataUrl: string, filename: string): File => {
  const arr = dataUrl.split(',');
  if (arr.length < 2) {
      throw new Error("Invalid Data URL");
  }
  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch) {
      throw new Error("Could not parse MIME type from Data URL");
  }
  const mime = mimeMatch[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

const LanguageSelector: React.FC<{
    selectedLanguage: 'en' | 'zh';
    onChange: (lang: 'en' | 'zh') => void;
    disabled: boolean;
}> = ({ selectedLanguage, onChange, disabled }) => {
    return (
        <div className="flex w-full rounded-lg bg-slate-200 p-1">
            <button
                type="button"
                onClick={() => onChange('en')}
                disabled={disabled}
                className={`w-1/2 rounded-md py-2 text-sm font-semibold transition-colors ${selectedLanguage === 'en' ? 'bg-white text-blue-600 shadow' : 'bg-transparent text-slate-600 hover:bg-slate-300'}`}
            >
                English
            </button>
            <button
                type="button"
                onClick={() => onChange('zh')}
                disabled={disabled}
                className={`w-1/2 rounded-md py-2 text-sm font-semibold transition-colors ${selectedLanguage === 'zh' ? 'bg-white text-blue-600 shadow' : 'bg-transparent text-slate-600 hover:bg-slate-300'}`}
            >
                中文
            </button>
        </div>
    );
};

export const JobInputForm: React.FC<JobInputFormProps> = ({ onStartInterview, isLoading, isInterviewStarted, language, onLanguageChange }) => {
  const [details, setDetails] = useState({
    title: '',
    responsibilities: '',
    requirements: '',
    resume: null as File | null,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saveButtonText, setSaveButtonText] = useState('');
  
  const t = translations[language];

  useEffect(() => {
    setSaveButtonText(t.saveSetup);
  }, [t.saveSetup]);

  useEffect(() => {
    const savedSetup = localStorage.getItem('interviewSetup');
    if (savedSetup) {
        try {
            const parsed = JSON.parse(savedSetup);
            const resumeFile = dataURLtoFile(parsed.resume.dataUrl, parsed.resume.name);
            setDetails({
                title: parsed.title,
                responsibilities: parsed.responsibilities,
                requirements: parsed.requirements,
                resume: resumeFile,
            });
            onLanguageChange(parsed.language);
        } catch (error) {
            console.error("Failed to load saved setup:", error);
            localStorage.removeItem('interviewSetup');
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          setDetails(prev => ({ ...prev, resume: e.target.files![0] }));
      }
  }

  const handleRemoveFile = () => {
      setDetails(prev => ({ ...prev, resume: null }));
      if (fileInputRef.current) {
          fileInputRef.current.value = "";
      }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartInterview({ ...details, language });
  };

  const handleSaveSetup = async () => {
    if (!details.resume) return;
    try {
        const resumeDataUrl = await fileToDataURL(details.resume);
        const setupToSave = {
            title: details.title,
            responsibilities: details.responsibilities,
            requirements: details.requirements,
            resume: {
                dataUrl: resumeDataUrl,
                name: details.resume.name,
            },
            language,
        };
        localStorage.setItem('interviewSetup', JSON.stringify(setupToSave));
        setSaveButtonText(t.setupSaved);
        setTimeout(() => setSaveButtonText(t.saveSetup), 2000);
    } catch (error) {
        console.error("Failed to save setup:", error);
        alert("Could not save the setup.");
    }
  };

  const handleClearSetup = () => {
      localStorage.removeItem('interviewSetup');
      setDetails({
          title: '',
          responsibilities: '',
          requirements: '',
          resume: null,
      });
      if (fileInputRef.current) {
          fileInputRef.current.value = "";
      }
  };
  
  const isFormIncomplete = !details.title || !details.responsibilities || !details.requirements || !details.resume;

  return (
    <div className="p-6 bg-white rounded-2xl shadow-lg h-full flex flex-col">
      <h2 className="text-2xl font-bold text-slate-800 mb-4">{t.formTitle}</h2>
      <p className="text-slate-500 mb-6">{t.formSubtitle}</p>
      <form onSubmit={handleSubmit} className="flex flex-col flex-grow">
        <div className="space-y-4 mb-6 flex-grow overflow-y-auto custom-scrollbar pr-2">
          <div>
            <label htmlFor="language" className="block text-sm font-medium text-slate-700 mb-2">{t.interviewLanguageLabel}</label>
            <LanguageSelector
                selectedLanguage={language}
                onChange={onLanguageChange}
                disabled={isInterviewStarted}
            />
          </div>
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">{t.jobTitleLabel}</label>
            <input
              type="text"
              name="title"
              id="title"
              value={details.title}
              onChange={handleChange}
              disabled={isInterviewStarted}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-slate-100"
              placeholder={t.jobTitlePlaceholder}
              required
            />
          </div>
          <div>
            <label htmlFor="responsibilities" className="block text-sm font-medium text-slate-700 mb-1">{t.responsibilitiesLabel}</label>
            <textarea
              name="responsibilities"
              id="responsibilities"
              rows={5}
              value={details.responsibilities}
              onChange={handleChange}
              disabled={isInterviewStarted}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-slate-100"
              placeholder={t.responsibilitiesPlaceholder}
              required
            />
          </div>
          <div>
            <label htmlFor="requirements" className="block text-sm font-medium text-slate-700 mb-1">{t.requirementsLabel}</label>
            <textarea
              name="requirements"
              id="requirements"
              rows={5}
              value={details.requirements}
              onChange={handleChange}
              disabled={isInterviewStarted}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-slate-100"
              placeholder={t.requirementsPlaceholder}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t.resumeLabel}</label>
            {details.resume ? (
                <div className="flex items-center justify-between p-3 border border-slate-300 rounded-md bg-slate-50">
                    <div className="flex items-center gap-3 min-w-0">
                        <FileIcon className="w-6 h-6 text-slate-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-slate-700 truncate">{details.resume.name}</span>
                    </div>
                    <button type="button" onClick={handleRemoveFile} disabled={isInterviewStarted} className="p-1 rounded-full hover:bg-slate-200 disabled:opacity-50 flex-shrink-0">
                        <TrashIcon className="w-5 h-5 text-slate-500" />
                    </button>
                </div>
            ) : (
                <label htmlFor="file-upload" className="relative cursor-pointer mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md hover:border-blue-500 transition-colors group">
                    <div className="space-y-1 text-center">
                        <svg className="mx-auto h-12 w-12 text-slate-400 group-hover:text-blue-500 transition-colors" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="flex text-sm text-slate-600 justify-center">
                            <span className="relative bg-white rounded-md font-medium text-blue-600 group-hover:text-blue-700">
                                {t.uploadFile}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500">{t.fileTypes}</p>
                    </div>
                    <input id="file-upload" name="resume" type="file" className="sr-only" ref={fileInputRef} onChange={handleFileChange} accept=".md,.pdf,.png,.jpg,.jpeg" disabled={isInterviewStarted}/>
                </label>
            )}
          </div>
        </div>
        <div className="mt-auto space-y-3 pt-4">
            <div className="flex space-x-3">
                <button
                    type="button"
                    onClick={handleSaveSetup}
                    disabled={isInterviewStarted || isFormIncomplete}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition-colors disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                    <SaveIcon className="w-5 h-5" />
                    {saveButtonText}
                </button>
                <button
                    type="button"
                    onClick={handleClearSetup}
                    disabled={isInterviewStarted}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition-colors disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                    <ClearIcon className="w-5 h-5" />
                    {t.clearSetup}
                </button>
            </div>
            <button
                type="submit"
                disabled={isLoading || isInterviewStarted || isFormIncomplete}
                className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ease-in-out disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center"
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t.starting}
                    </>
                ) : (
                    isInterviewStarted ? t.interviewInProgress : t.startInterview
                )}
            </button>
        </div>
      </form>
    </div>
  );
};
