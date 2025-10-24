# Service Layer (`Brain Layer`) Documentation

This document outlines the architecture and implementation of the application's service layer, which acts as the "Brain Layer" described in the `架构.md` document.

## 1. Philosophy

The core principle is the **Separation of Concerns**. The UI layer (React components) should be responsible for rendering the user interface and managing UI state (e.g., loading spinners, error messages). It should not contain business logic, prompt engineering, or direct calls to external APIs.

The Service Layer (`services/api.ts`) encapsulates all of this business logic. It provides a clean, asynchronous interface for the UI to interact with. This makes the codebase more modular, easier to test, and prepares it for a future transition to a real backend server.

## 2. `services/api.ts`

This file is the single source of truth for all interactions with the AI provider (currently, Google Gemini).

### Exported Functions

#### `startInterview(formData: InterviewFormData): Promise<string>`

-   **Purpose:** Handles Phase 1 (Preparation) and Phase 2 (Configuration).
-   **Actions:**
    1.  Takes the complete form data from the UI.
    2.  **Company Research:** If a company name is provided, it calls the Gemini API with the `googleSearch` tool to gather background information (`P-CORP-SUMMARIZE`).
    3.  **Context Clarification:** It constructs a detailed prompt using the form data and company research summary.
    4.  It calls the Gemini API to generate the verification text that asks the user to confirm the interview context (`P-CONTEXT-CLARIFY`).
-   **Returns:** A `Promise` that resolves to the verification text string.

#### `getInitialQuestion(formData: InterviewFormData): Promise<string>`

-   **Purpose:** Kicks off Phase 3 (Execution) by generating the first interview question.
-   **Actions:**
    1.  Uses the candidate's resume and target position to generate an open-ended, relevant first question.
-   **Returns:** A `Promise` that resolves to the first question string.

#### `getNextQuestion(messages: Message[], formData: InterviewFormData): Promise<string>`

-   **Purpose:** Continues the interview loop in Phase 3.
-   **Actions:**
    1.  Receives the entire conversation history (`messages`).
    2.  Implements the `P-QUESTION-GENERATE` logic: analyzes the last answer and decides whether to ask a follow-up question or pivot to a new topic based on the resume and job description.
-   **Returns:** A `Promise` that resolves to the next question string.

#### `generateFinalReport(messages: Message[], formData: InterviewFormData): Promise<ReportData>`

-   **Purpose:** Handles Phase 4 (Evaluation).
-   **Actions:**
    1.  Receives the full interview transcript and the initial setup data.
    2.  Calls the Gemini API (`gemini-2.5-pro`) with a detailed prompt and a strict JSON schema (`P-FINAL-REPORT`).
    3.  Parses the JSON response from the API.
-   **Returns:** A `Promise` that resolves to the structured `ReportData` object.
