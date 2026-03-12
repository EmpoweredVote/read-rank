import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useReadRankStore } from '../store/useReadRankStore';
import type { IssueData, Quote } from '../store/useReadRankStore';
import { fetchQuotesData, getQuotesForIssue } from '../data/api';
import { shuffleArray } from '../utils/matchingAlgorithm';

const getIssueIcon = (issueId: string) => {
  switch (issueId) {
    case 'cannabis-legalization':
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    case 'education-funding':
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      );
    case 'abortion-rights':
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      );
    default:
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      );
  }
};

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
    return {
      status: 'in-progress',
      text: `Evaluating (${evaluatedQuotes}/${totalQuotes})`,
      percent
    };
  }

  if (progress.phase === 'ranking') {
    return { status: 'in-progress', text: 'Assigning badges', percent: 75 };
  }

  if (progress.phase === 'results') {
    return { status: 'completed', text: 'Completed', percent: 100 };
  }

  return { status: 'not-started', text: 'Not started', percent: 0 };
};

export const IssueHub: React.FC = () => {
  const { issueProgress, selectIssue } = useReadRankStore();
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

    // Get quotes for this issue and shuffle them
    const issueQuotes = getQuotesForIssue(quotes, issueId);
    const shuffledQuotes = shuffleArray(issueQuotes);

    selectIssue(issueId, shuffledQuotes, issue);
  };

  // Count completed issues
  const completedCount = Object.values(issueProgress).filter(p => p.completed).length;
  const totalIssues = issues.length;

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="ev-text-primary text-base md:text-lg">Loading issues...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-8">
      {/* Header */}
      <motion.div
        className="text-center max-w-3xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="ev-heading text-2xl md:text-3xl mb-2">Choose an Issue</h1>
        <p className="ev-text-primary text-base md:text-lg">
          Select an issue to evaluate candidate positions. Each issue is evaluated independently.
        </p>
      </motion.div>

      {/* Progress summary */}
      <motion.div
        className="max-w-md mx-auto bg-ev-light-blue bg-opacity-10 rounded-xl p-4"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <span className="ev-text-primary font-medium">Overall Progress</span>
          <span className="font-manrope font-bold text-ev-light-blue">
            {completedCount} of {totalIssues} issues completed
          </span>
        </div>
        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-ev-light-blue to-ev-teal rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(completedCount / totalIssues) * 100}%` }}
            transition={{ delay: 0.4, duration: 0.6 }}
          />
        </div>
      </motion.div>

      {/* Issue Cards */}
      <div className="max-w-2xl mx-auto space-y-4">
        {issues.map((issue, index) => {
          const progress = issueProgress[issue.id];
          const progressInfo = getProgressInfo(issue.id, progress);

          return (
            <motion.button
              key={issue.id}
              onClick={() => handleSelectIssue(issue.id)}
              className="w-full text-left bg-white rounded-xl border-2 border-gray-100 hover:border-ev-light-blue shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index, duration: 0.4 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="p-4 md:p-6">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`p-3 rounded-xl ${
                    progressInfo.status === 'completed'
                      ? 'bg-green-100 text-green-600'
                      : progressInfo.status === 'in-progress'
                        ? 'bg-ev-light-blue bg-opacity-20 text-ev-light-blue'
                        : 'bg-gray-100 text-gray-500'
                  }`}>
                    {getIssueIcon(issue.id)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-manrope font-bold text-lg text-gray-900 truncate">
                        {issue.title}
                      </h3>
                      {/* Status badge */}
                      <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${
                        progressInfo.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : progressInfo.status === 'in-progress'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}>
                        {progressInfo.text}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {issue.question}
                    </p>

                    {/* Progress bar for in-progress issues */}
                    {progressInfo.status === 'in-progress' && (
                      <div className="mt-3 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-ev-light-blue rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${progressInfo.percent}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Arrow */}
                  <div className="shrink-0 text-gray-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Candidate Profiles Link */}
      {completedCount > 0 && (
        <motion.div
          className="max-w-2xl mx-auto pt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-center text-sm text-gray-500">
            Completed issues will show your alignment with each candidate on their profile page.
          </p>
        </motion.div>
      )}
    </div>
  );
};
