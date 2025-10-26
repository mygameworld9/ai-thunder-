
export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
}

export interface Message {
  role: MessageRole;
  text: string;
}

export interface JobDetails {
  title: string;
  responsibilities: string;
  requirements: string;
  resume: File | null;
  language: 'en' | 'zh';
}
