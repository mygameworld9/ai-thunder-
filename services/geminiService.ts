import { GoogleGenAI, Chat, Part, Content } from "@google/genai";
import type { JobDetails } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToGenerativePart = async (file: File): Promise<Part> => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      data: await base64EncodedDataPromise,
      mimeType: file.type,
    },
  };
};

export const startChatAndGetFirstMessage = async (jobDetails: JobDetails): Promise<{ chatSession: Chat, firstMessage: string }> => {
  const { title, responsibilities, requirements, resume, language } = jobDetails;

  if (!resume) {
    throw new Error("Resume file is not provided.");
  }

  const langPrompts = {
      en: {
          system: `You are an expert hiring manager and senior engineer conducting a job interview in English for the position of '${title}'. Your goal is to assess the candidate's skills and experience against the job description. Ask insightful, open-ended questions based on the provided job description and the candidate's resume. Maintain a professional and conversational tone. Start the interview by greeting the candidate and then ask your first relevant question. Do not ask for their name, as you should assume you are speaking directly to them.`,
          initial: `Here is the job description. The candidate's resume is attached. Please begin the interview.\n\n## Job Responsibilities:\n${responsibilities}\n\n## Job Requirements:\n${requirements}`
      },
      zh: {
          system: `你是一位专业的招聘经理和高级工程师，正在为“${title}”职位进行一场中文面试。你的目标是根据职位描述评估候选人的技能和经验。请根据提供的职位描述和候选人的简历，提出有见地的、开放性的问题。请保持专业和对话式的语气。首先问候候选人，然后提出你的第一个相关问题。不要询问候选人的姓名，你应该假设正在直接与他们交谈。`,
          initial: `这是职位描述，候选人的简历附后。请开始面试。\n\n## 岗位职责:\n${responsibilities}\n\n## 岗位要求:\n${requirements}`
      }
  };

  const systemInstruction = langPrompts[language].system;
  const textPart: Part = { text: langPrompts[language].initial };
  const resumePart: Part = await fileToGenerativePart(resume);

  const initialUserMessage: Content = { 
    role: 'user', 
    parts: [textPart, resumePart] 
  };

  // Use `generateContent` for the first multimodal message for robustness
  const result = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [initialUserMessage],
    config: {
      systemInstruction: systemInstruction,
    },
  });

  const firstMessage = result.text;
  
  if (!firstMessage || !result.candidates || result.candidates.length === 0) {
    throw new Error("Received an empty or invalid response from the AI model.");
  }
  
  // This is the model's first response
  const initialModelMessage = result.candidates[0].content;

  // Create a new chat session with the history of the first exchange
  const chatSession = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: systemInstruction,
    },
    history: [
      initialUserMessage,
      initialModelMessage,
    ]
  });

  return { chatSession, firstMessage };
};