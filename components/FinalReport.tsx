import React, { useState } from 'react';
import { styles } from '../styles';
import type { ReportData } from '../types';

type FinalReportProps = {
    report: ReportData;
    onRestart: () => void;
};

export const FinalReport = ({ report, onRestart }: FinalReportProps) => {
    const [openAccordion, setOpenAccordion] = useState<number | null>(0);

    const scoreToColor = (score: number) => {
        if (score > 85) return '#22C55E'; // green-500
        if (score > 60) return '#F59E0B'; // amber-500
        return '#EF4444'; // red-500
    };

    const scoreCategoryLabels: { [key: string]: string } = {
        skill_match: "Skill Match",
        company_fit: "Company Fit",
        communication_clarity: "Communication",
        star_method_application: "STAR Method",
    };

    return (
        <div style={styles.card}>
            <h2 style={styles.cardTitle}>Interview Performance Report</h2>

            <div style={styles.overallScoreSection}>
                <div style={{ ...styles.scoreCircle, borderColor: scoreToColor(report.overall_score) }}>
                    <span style={styles.scoreCircleNumber}>{report.overall_score}</span>
                    <span style={styles.scoreCircleText}>/ 100</span>
                </div>
                <p style={styles.overallSummary}>{report.overall_summary}</p>
            </div>

            <h3 style={styles.reportSectionTitle}>Scoring Matrix</h3>
            <div style={styles.scoringMatrix}>
                {Object.entries(report.scoring_matrix).map(([key, value]) => (
                    <div key={key} style={styles.scoreBarContainer}>
                        <span style={styles.scoreBarLabel}>{scoreCategoryLabels[key]}</span>
                        <div style={styles.scoreBarBackground}>
                            <div style={{ ...styles.scoreBarFill, width: `${value * 10}%`, backgroundColor: scoreToColor(value * 10) }}></div>
                        </div>
                        <span style={styles.scoreBarValue}>{value} / 10</span>
                    </div>
                ))}
            </div>

            <h3 style={styles.reportSectionTitle}>Per-Question Analysis</h3>
            <div style={styles.accordion}>
                {report.per_question_analysis.map((item, index) => (
                    <div key={index} style={styles.accordionItem}>
                        <button style={styles.accordionHeader} onClick={() => setOpenAccordion(openAccordion === index ? null : index)} aria-expanded={openAccordion === index}>
                            <span>{`Q${index + 1}: ${item.question.substring(0, 50)}...`}</span>
                            <span>{openAccordion === index ? '−' : '+'}</span>
                        </button>
                        {openAccordion === index && (
                            <div style={styles.accordionContent}>
                                <p><strong>Your Answer:</strong> {item.answer}</p>
                                <p style={{ color: '#10B981' }}><strong>✓ Strengths:</strong> {item.feedback_strengths}</p>
                                <p style={{ color: '#F59E0B' }}><strong>↪ Improvements:</strong> {item.feedback_improvements}</p>
                                <p><strong>💡 Suggested Answer:</strong> {item.suggested_answer}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <h3 style={styles.reportSectionTitle}>Final Recommendations</h3>
            <ul style={styles.recommendationsList}>
                {report.final_recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                ))}
            </ul>

            <button onClick={onRestart} style={{ ...styles.button, marginTop: '2rem' }}>
                Start New Interview
            </button>
        </div>
    );
};
