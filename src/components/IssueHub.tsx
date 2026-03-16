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
      {/* Compact Header */}
      <motion.div
        className="max-w-2xl mx-auto mb-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1
          className="text-center"
          style={{
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 800,
            fontSize: '1.5rem',
            color: '#1a1a2e',
            letterSpacing: '-0.02em',
            margin: '0 0 0.25rem',
          }}
        >
          Read &amp; Rank
        </h1>

        <p className="text-center" style={{
          fontFamily: "'Manrope', sans-serif",
          color: '#64748b',
          fontSize: '0.8125rem',
          lineHeight: 1.5,
          margin: '0 0 0.625rem',
        }}>
          Read real quotes, agree or disagree — then find out which candidates said what.
        </p>

        {/* Progress bar with count */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1 flex-1">
            {Array.from({ length: totalIssues }).map((_, i) => (
              <div
                key={i}
                className="flex-1 h-1 rounded-full transition-all duration-500"
                style={{ backgroundColor: i < completedCount ? '#00657c' : '#e8e2d9' }}
              />
          ))}
          </div>
          <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 600, fontSize: '0.6875rem', color: '#00657c', flexShrink: 0 }}>
            {completedCount}/{totalIssues}
          </span>
        </div>
      </motion.div>

      {/* Address Filter Input */}
      <div className="max-w-2xl mx-auto">
        <AddressFilterInput />
        {locationFilter && (
          <p className="text-center mb-2" style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: '0.75rem',
            color: '#64748b',
          }}>
            Showing {displayedIssues.length} of {issues.length} issues
          </p>
        )}
      </div>

      {/* Issue Cards */}
      <div className="max-w-2xl mx-auto space-y-3">
        {displayedIssues.map((issue, index) => {
          const progress = issueProgress[issue.id];
          const progressInfo = getProgressInfo(issue.id, progress);
          const isCompleted = progressInfo.status === 'completed';
          const isInProgress = progressInfo.status === 'in-progress';
          const shortTitle = issue.title.includes(':') ? issue.title.split(':')[0].trim() : issue.title;

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
              <div style={{ padding: '0.75rem 1rem' }}>
                <div className="flex items-center justify-between gap-2">
                  <h3 style={{
                    fontFamily: "'Manrope', sans-serif",
                    fontWeight: 700,
                    fontSize: '0.9375rem',
                    color: '#1a1a2e',
                    margin: 0,
                  }}>
                    {shortTitle}
                  </h3>

                  {/* Status */}
                  <span
                    className="shrink-0"
                    style={{
                      fontFamily: "'Manrope', sans-serif",
                      fontSize: '0.625rem',
                      fontWeight: 600,
                      padding: '0.125rem 0.5rem',
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
                  lineHeight: 1.4,
                  margin: '0.25rem 0 0',
                }}>
                  {issue.question}
                </p>
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
