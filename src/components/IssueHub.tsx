import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useReadRankStore } from '../store/useReadRankStore';
import type { IssueData, Quote } from '../store/useReadRankStore';
import { fetchQuotesData, getQuotesForIssue } from '../data/api';
import { shuffleArray } from '../utils/matchingAlgorithm';
import { AddressFilterInput } from './AddressFilterInput';

const getProgressInfo = (
  _issueId: string,
  progress: ReturnType<typeof useReadRankStore.getState>['issueProgress'][string] | undefined
) => {
  if (!progress) {
    return { status: 'not-started', text: 'Not started', percent: 0 };
  }

  if (progress.completed) {
    return { status: 'completed', text: 'Completed', percent: 100 };
  }

  const totalQuotes = progress.quotesToEvaluate.length;
  const evaluatedQuotes = progress.currentQuoteIndex;

  if (progress.phase === 'evaluation') {
    const percent = totalQuotes > 0 ? Math.round((evaluatedQuotes / totalQuotes) * 50) : 0;
    return { status: 'in-progress', text: `Evaluating (${evaluatedQuotes}/${totalQuotes})`, percent };
  }

  if (progress.phase === 'results') {
    return { status: 'completed', text: 'Completed', percent: 100 };
  }

  return { status: 'not-started', text: 'Not started', percent: 0 };
};

export const IssueHub: React.FC = () => {
  const { issueProgress, selectIssue, locationFilter } = useReadRankStore();
  const [issues, setIssues] = useState<IssueData[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuotesData().then(data => {
      setIssues(data.issues);
      setQuotes(data.quotes);
      setLoading(false);
    });
  }, []);

  const handleSelectIssue = (issueId: string) => {
    const issue = issues.find(i => i.id === issueId);
    if (!issue) return;
    const issueQuotes = getQuotesForIssue(quotes, issueId);
    const shuffledQuotes = shuffleArray(issueQuotes);
    selectIssue(issueId, shuffledQuotes, issue);
  };

  // Filter issues to only show those with 2+ unique local politicians who have quotes
  const filteredIssues = locationFilter
    ? issues.filter(issue => {
        const localPoliticianSet = new Set(locationFilter.politicianIds);
        const uniqueLocalReps = new Set(
          quotes
            .filter(q => q.issue === issue.id && q.candidateId && localPoliticianSet.has(q.candidateId))
            .map(q => q.candidateId as string)
        );
        return uniqueLocalReps.size >= 2;
      })
    : issues;

  const completedCount = Object.values(issueProgress).filter(p => p.completed).length;
  const totalIssues = issues.length;
  const displayedIssues = filteredIssues;

  if (loading) {
    return (
      <div className="text-center py-16">
        <div
          className="inline-block w-6 h-6 border-2 rounded-full animate-spin"
          style={{ borderColor: '#e8e2d9', borderTopColor: '#00657c' }}
        />
        <p className="mt-4" style={{ fontFamily: "'Manrope', sans-serif", color: '#64748b', fontSize: '0.9375rem' }}>
          Loading issues...
        </p>
      </div>
    );
  }

  return (
    <div className="pb-12">
      {/* Editorial Header */}
      <motion.div
        className="text-center max-w-2xl mx-auto mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Decorative quotation mark */}
        <div
          style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: '4.5rem',
            lineHeight: 1,
            color: '#00657c',
            opacity: 0.12,
            marginBottom: '-1.5rem',
          }}
          aria-hidden="true"
        >
          {'\u201C'}
        </div>

        <h1
          style={{
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 800,
            fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
            color: '#1a1a2e',
            marginBottom: '0.5rem',
            letterSpacing: '-0.02em',
          }}
        >
          Choose an Issue
        </h1>
        <p style={{
          fontFamily: "'Manrope', sans-serif",
          color: '#64748b',
          fontSize: '1rem',
          lineHeight: 1.6,
          maxWidth: '28rem',
          margin: '0 auto',
        }}>
          Evaluate candidate positions on the issues that matter to you.
        </p>
      </motion.div>

      {/* Address Filter Input */}
      <AddressFilterInput />
      {locationFilter && (
        <p className="text-center mb-4" style={{
          fontFamily: "'Manrope', sans-serif",
          fontSize: '0.8125rem',
          color: '#64748b',
        }}>
          Showing {displayedIssues.length} of {issues.length} issues
        </p>
      )}

      {/* Progress summary */}
      <motion.div
        className="max-w-md mx-auto mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        style={{
          backgroundColor: '#fffefb',
          border: '1px solid #e8e2d9',
          borderRadius: '0.5rem',
          padding: '1rem 1.25rem',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 500, fontSize: '0.8125rem', color: '#64748b' }}>
            Progress
          </span>
          <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '0.8125rem', color: '#00657c' }}>
            {completedCount}/{totalIssues}
          </span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: totalIssues }).map((_, i) => (
            <div
              key={i}
              className="flex-1 h-1.5 rounded-full transition-all duration-500"
              style={{ backgroundColor: i < completedCount ? '#00657c' : '#e8e2d9' }}
            />
          ))}
        </div>
      </motion.div>

      {/* Issue Cards */}
      <div className="max-w-2xl mx-auto space-y-3">
        {displayedIssues.map((issue, index) => {
          const progress = issueProgress[issue.id];
          const progressInfo = getProgressInfo(issue.id, progress);
          const isCompleted = progressInfo.status === 'completed';
          const isInProgress = progressInfo.status === 'in-progress';

          return (
            <motion.button
              key={issue.id}
              onClick={() => handleSelectIssue(issue.id)}
              className="w-full text-left transition-all duration-200 group"
              style={{
                backgroundColor: '#fffefb',
                border: '1px solid #e8e2d9',
                borderRadius: '0.625rem',
                borderLeft: `3px solid ${isCompleted ? '#00657c' : isInProgress ? '#ff5740' : '#d4cdc3'}`,
                padding: 0,
                cursor: 'pointer',
              }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * index, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ x: 4, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
              whileTap={{ scale: 0.995 }}
            >
              <div className="p-4 md:p-5">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <h3 style={{
                    fontFamily: "'Manrope', sans-serif",
                    fontWeight: 700,
                    fontSize: '1.0625rem',
                    color: '#1a1a2e',
                  }}>
                    {issue.title}
                  </h3>

                  {/* Status */}
                  <span
                    className="shrink-0"
                    style={{
                      fontFamily: "'Manrope', sans-serif",
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      padding: '0.25rem 0.625rem',
                      borderRadius: '9999px',
                      letterSpacing: '0.03em',
                      textTransform: 'uppercase' as const,
                      backgroundColor: isCompleted ? '#e8f4f6' : isInProgress ? '#fff4f2' : '#f5f0e8',
                      color: isCompleted ? '#00657c' : isInProgress ? '#e64a34' : '#94a3b8',
                    }}
                  >
                    {progressInfo.text}
                  </span>
                </div>

                <p style={{
                  fontFamily: "'Manrope', sans-serif",
                  fontSize: '0.8125rem',
                  color: '#64748b',
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical' as const,
                  overflow: 'hidden',
                }}>
                  {issue.question}
                </p>

                {/* Progress bar for in-progress */}
                {isInProgress && (
                  <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#e8e2d9' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: '#ff5740' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${progressInfo.percent}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Footer note */}
      {completedCount > 0 && (
        <motion.p
          className="text-center mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: '0.8125rem',
            color: '#94a3b8',
          }}
        >
          Your verdicts appear on candidate profiles in Essentials.
        </motion.p>
      )}
    </div>
  );
};
