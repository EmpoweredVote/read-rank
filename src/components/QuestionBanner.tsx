import React from 'react';

interface QuestionBannerProps {
  question: string;
}

/** The bold yellow through-line question that leads the evaluation card (#70).
 *  Shared by the real race header (TopicStepper) and the practice header. */
export const QuestionBanner: React.FC<QuestionBannerProps> = ({ question }) => (
  <div className="question-banner">
    <h2>
      <span className="question-banner-hl">{question}</span>
    </h2>
  </div>
);
