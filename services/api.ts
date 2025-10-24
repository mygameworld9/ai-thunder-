import { GoogleGenAI, Type } from "@google/genai";
import { fileToGenerativePart } from "../utils";
import type { Message, ReportData, InterviewFormData } from "../types";

const API_KEY = process.env.API_KEY;

// Initialize the AI client once to be reused.
const ai = new GoogleGenAI({ apiKey: API_KEY });

/**
 * Phase 1 & 2: Starts the interview process by performing company research
 * and generating a context verification prompt.
 */
export const startInterview = async (formData: InterviewFormData): Promise<string> => {
    const { position, company, jobDescription, resume } = formData;

    let companySummary = '';
    if (company) {
        try {
            const researchResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `Please provide a concise 2-3 sentence summary of the company "${company}". Include its main business, key products or services, and its industry.`,
                config: {
                    tools: [{ googleSearch: {} }],
                },
            });
            companySummary = researchResponse.text;
        } catch (err) {
            console.warn("Company research with Google Search failed, proceeding without it.", err);
            companySummary = "Could not retrieve company information at this time.";
        }
    }

    const resumePart = await fileToGenerativePart(resume!);

    const systemPrompt = `You are a senior Tech Recruiting Lead with keen insight. Your task is to analyze and validate the context for an upcoming interview. You must identify any ambiguity or gaps in the provided information and generate a concise, insightful confirmation statement ending with a clear question.`;
    
    const userPrompt = `
      Analyze the following interview input data:

      1.  **Target Position:** "${position}"
      2.  **Candidate Resume:** [Attached file]
      3.  **Target Company:** "${company || 'Not provided'}"
      4.  **Company Background Summary:** "${companySummary || 'Not provided'}"
      5.  **Job Description:** "${jobDescription || 'Not provided'}"

      Your Task:
      - Analyze potential ambiguities (e.g., does the target position have multiple meanings?).
      - Make a reasonable inference by combining the resume content with the position or company context.
      - Generate a 2-3 sentence "context confirmation" description. This must clearly state your inference and end with a direct confirmation question.

      Example Output:
      "I've reviewed your resume which highlights your experience with React and state management, and the target role is for a Frontend Developer at a company focused on IoT. I infer that this role will likely test your ability to build complex dashboards for device interaction, not just standard web pages. Is this the interview context you're preparing for?"
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ parts: [resumePart, { text: userPrompt }] }],
        config: { systemInstruction: systemPrompt }
    });
    
    return response.text;
};

/**
 * Phase 2: Refines the interview context based on user feedback.
 */
export const correctInterviewContext = async (correctionText: string, originalVerification: string, formData: InterviewFormData): Promise<string> => {
    const { position, resume } = formData;
    const resumePart = await fileToGenerativePart(resume!);
    
    const systemPrompt = `You are a helpful and precise interview context coordinator. Your task is to revise an interview setup based on candidate feedback.`;

    const userPrompt = `
      You are setting up a mock interview for a "${position}" position.
      The candidate's resume is attached.

      This was your initial understanding of the interview context:
      "${originalVerification}"

      The candidate provided the following correction:
      "${correctionText}"

      Your Task:
      Based on the candidate's correction and their resume, generate a new, revised 2-3 sentence confirmation statement that incorporates the feedback. The new statement must also end with a direct confirmation question.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ parts: [resumePart, { text: userPrompt }] }],
        config: { systemInstruction: systemPrompt }
    });

    return response.text;
};


/**
 * Phase 3: Generates the first interview question.
 */
export const getInitialQuestion = async (formData: InterviewFormData): Promise<string> => {
    const { position, company, resume, model } = formData;
    const resumePart = await fileToGenerativePart(resume!);
    const prompt = `Based on the attached resume for a "${position}" position${company ? ` at ${company}` : ''}, generate the first, open-ended behavioral interview question.`;
    const response = await ai.models.generateContent({
        model: model,
        contents: [{ parts: [resumePart, { text: prompt }] }],
    });
    return response.text;
};

/**
 * Phase 3: Generates the next question based on conversation history.
 */
export const getNextQuestion = async (messages: Message[], formData: InterviewFormData): Promise<string> => {
    const { position, resume, model } = formData;
    const resumePart = await fileToGenerativePart(resume!);
    const historyForPrompt = messages.map(msg => `${msg.role === 'user' ? 'Candidate' : 'Interviewer'}: ${msg.content}`).join('\n');
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
        model: model,
        contents: [{ parts: [resumePart, { text: prompt }] }],
    });
    return response.text;
};

/**
 * Phase 4: Generates the final performance report.
 */
export const generateFinalReport = async (messages: Message[], formData: InterviewFormData): Promise<ReportData> => {
    const { position, company, jobDescription, resume } = formData;
    const resumePart = await fileToGenerativePart(resume!);

    const history = messages.map((msg, i) => {
        const isUser = msg.role === 'user';
        const index = Math.floor(i / 2) + 1;
        return isUser ? `A${index}: ${msg.content}` : `Q${index}: ${msg.content}`;
    }).join('\n\n');

    const systemPrompt = "You are a top-tier career coach and interview expert. Your task is to provide a comprehensive, insightful, and constructive evaluation of a mock interview. Your evaluation must be objective, data-driven, and strictly follow the provided JSON schema.";
    
    const userPrompt = `
      **Interview Profile:**
      - Position: "${position}"
      - Company Context: "${company || 'Not specified'}"
      - Job Description: "${jobDescription || 'Not specified'}"
      - Candidate Resume: [Attached]

      **Full Interview Transcript (Q&A):**
      ${history}

      **Your Task:**
      Analyze all the provided information and generate a detailed feedback report in JSON format.
    `;

    const schema = {
      type: Type.OBJECT,
      properties: {
        overall_score: { type: Type.INTEGER, description: "An overall score from 0-100 reflecting interview performance." },
        overall_summary: { type: Type.STRING, description: "A 2-3 sentence overall evaluation and justification for the score." },
        scoring_matrix: {
          type: Type.OBJECT,
          properties: {
            skill_match: { type: Type.INTEGER, description: "Score from 0-10 for technical skill match based on answers." },
            company_fit: { type: Type.INTEGER, description: "Score from 0-10 for cultural or company context fit." },
            communication_clarity: { type: Type.INTEGER, description: "Score from 0-10 for clarity and structure of communication." },
            star_method_application: { type: Type.INTEGER, description: "Score from 0-10 for using the STAR method in behavioral questions." },
          },
          required: ["skill_match", "company_fit", "communication_clarity", "star_method_application"],
        },
        per_question_analysis: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              answer: { type: Type.STRING },
              feedback_strengths: { type: Type.STRING, description: "Strengths and highlights of this specific answer." },
              feedback_improvements: { type: Type.STRING, description: "Specific, actionable suggestions for improving this answer." },
              suggested_answer: { type: Type.STRING, description: "An example of a better or more structured answer." },
            },
            required: ["question", "answer", "feedback_strengths", "feedback_improvements", "suggested_answer"],
          },
        },
        final_recommendations: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "1-3 key, high-level recommendations for the candidate to focus on.",
        },
      },
      required: ["overall_score", "overall_summary", "scoring_matrix", "per_question_analysis", "final_recommendations"],
    };
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: [{ parts: [resumePart, { text: userPrompt }] }],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    return JSON.parse(response.text);
};