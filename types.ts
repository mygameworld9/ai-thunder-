export type Message = {
    role: 'user' | 'assistant';
    content: string;
};

export type ReportData = {
    overall_score: number;
    overall_summary: string;
    scoring_matrix: {
        skill_match: number;
        company_fit: number;
        communication_clarity: number;
        star_method_application: number;
    };
    per_question_analysis: {
        question: string;
        answer: string;
        feedback_strengths: string;
        feedback_improvements: string;
        suggested_answer: string;
    }[];
    final_recommendations: string[];
};

export type InterviewFormData = {
    position: string;
    company: string;
    jobDescription: string;
    resume: File | null;
    provider: string;
    model: string;
};

export type VerificationScreenProps = {
    text: string;
    onConfirm: () => void;
    onCorrectionSubmit: (correction: string) => Promise<void>;
    onRestart: () => void;
};
