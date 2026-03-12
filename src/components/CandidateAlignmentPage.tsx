import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useReadRankStore } from '../store/useReadRankStore';
import type { Quote, IssueData, Candidate } from '../store/useReadRankStore';
import { fetchQuotesData } from '../data/api';

// Display-only badge icons
const DiamondBadgeDisplay: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <div className="bg-gradient-to-br from-cyan-400 to-blue-600 p-2 rounded-xl shadow-lg shadow-cyan-500/40">
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="diamondGradientAlign" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E0F7FF" />
          <stop offset="30%" stopColor="#67E8F9" />
          <stop offset="60%" stopColor="#22D3EE" />
          <stop offset="100%" stopColor="#0891B2" />
        </linearGradient>
      </defs>
      <path d="M12 2L4 9L12 22L20 9L12 2Z" fill="url(#diamondGradientAlign)" stroke="#0E7490" strokeWidth="0.5" />
      <path d="M12 2L4 9H20L12 2Z" fill="#A5F3FC" opacity="0.7" />
      <path d="M4 9L12 22L12 9H4Z" fill="#22D3EE" opacity="0.5" />
      <path d="M8 6L10 9L8 9L8 6Z" fill="#FFFFFF" opacity="0.8" />
    </svg>
  </div>
);

const GoldBadgeDisplay: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <div className="bg-gradient-to-br from-yellow-400 to-amber-600 p-2 rounded-xl shadow-lg shadow-amber-500/40">
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="goldGradientAlign" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF3C7" />
          <stop offset="30%" stopColor="#FCD34D" />
          <stop offset="60%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id="ribbonGradientAlign" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#DC2626" />
          <stop offset="50%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#DC2626" />
        </linearGradient>
      </defs>
      <path d="M8 4L6 1H9L10.5 4" fill="url(#ribbonGradientAlign)" />
      <path d="M16 4L18 1H15L13.5 4" fill="url(#ribbonGradientAlign)" />
      <circle cx="12" cy="14" r="8" fill="url(#goldGradientAlign)" stroke="#92400E" strokeWidth="0.5" />
      <circle cx="12" cy="14" r="5.5" fill="none" stroke="#B45309" strokeWidth="0.75" />
      <path d="M12 10L13.09 12.26L15.5 12.63L13.75 14.34L14.18 16.73L12 15.58L9.82 16.73L10.25 14.34L8.5 12.63L10.91 12.26L12 10Z" fill="#FEF3C7" stroke="#B45309" strokeWidth="0.3" />
      <ellipse cx="9.5" cy="11.5" rx="1.5" ry="1" fill="#FFFFFF" opacity="0.6" />
    </svg>
  </div>
);

interface QuoteCardProps {
  quote: Quote;
  badge: 'diamond' | 'gold' | 'agreed' | 'disagreed';
  index: number;
}

const QuoteCard: React.FC<QuoteCardProps> = ({ quote, badge, index }) => {
  const getBorderColor = () => {
    switch (badge) {
      case 'diamond': return 'border-l-cyan-500';
      case 'gold': return 'border-l-amber-500';
      case 'agreed': return 'border-l-green-500';
      case 'disagreed': return 'border-l-red-400';
      default: return 'border-l-gray-300';
    }
  };

  const getStatusLabel = () => {
    switch (badge) {
      case 'diamond':
        return (
          <div className="inline-flex items-center gap-1.5 text-cyan-700 text-sm font-semibold">
            <DiamondBadgeDisplay size={20} />
            <span>Your Top Pick</span>
          </div>
        );
      case 'gold':
        return (
          <div className="inline-flex items-center gap-1.5 text-amber-700 text-sm font-semibold">
            <GoldBadgeDisplay size={20} />
            <span>Your Runner Up</span>
          </div>
        );
      case 'agreed':
        return (
          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            You Agreed
          </span>
        );
      case 'disagreed':
        return (
          <span className="inline-flex items-center gap-1 bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs font-medium">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            You Disagreed
          </span>
        );
    }
  };

  return (
    <motion.div
      className={`bg-white rounded-lg border-l-4 ${getBorderColor()} shadow-sm p-4`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
    >
      <div className="flex items-center justify-end mb-2">
        {getStatusLabel()}
      </div>
      <p className="text-gray-700 text-sm leading-relaxed italic">"{quote.text}"</p>
      {quote.sourceUrl && (
        <a
          href={quote.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-3 text-sm text-ev-light-blue hover:text-ev-teal transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span>{quote.sourceName || 'View Source'}</span>
        </a>
      )}
    </motion.div>
  );
};

export const CandidateAlignmentPage: React.FC = () => {
  const { candidateId } = useParams<{ candidateId: string }>();
  const navigate = useNavigate();
  const { issueProgress } = useReadRankStore();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [issues, setIssues] = useState<IssueData[]>([]);

  useEffect(() => {
    fetchQuotesData().then(data => {
      setCandidates(data.candidates);
      setQuotes(data.quotes);
      setIssues(data.issues);
    });
  }, []);

  const candidate = candidates.find(c => c.id === candidateId);

  // Group candidate's quotes by issue and determine their status
  const quotesByIssue = useMemo(() => {
    // Get all quotes for this candidate
    const candidateQuotes = quotes.filter(q => q.candidateId === candidateId);

    // Group by issue
    const grouped: Record<string, {
      issueId: string;
      issueTitle: string;
      evaluated: boolean;
      quotes: { quote: Quote; badge: 'diamond' | 'gold' | 'agreed' | 'disagreed' | 'unevaluated' }[];
    }> = {};

    issues.forEach((issue: IssueData) => {
      const issueQuotes = candidateQuotes.filter(q => q.issue === issue.id);
      const progress = issueProgress[issue.id];

      grouped[issue.id] = {
        issueId: issue.id,
        issueTitle: issue.title,
        evaluated: progress?.completed || false,
        quotes: []
      };

      issueQuotes.forEach(quote => {
        if (!progress) {
          // Issue not started
          grouped[issue.id].quotes.push({ quote, badge: 'unevaluated' });
        } else {
          // Check badge assignments for this issue
          if (progress.badgeAssignments.diamond === quote.id) {
            grouped[issue.id].quotes.push({ quote, badge: 'diamond' });
          } else if (progress.badgeAssignments.gold === quote.id) {
            grouped[issue.id].quotes.push({ quote, badge: 'gold' });
          } else if (progress.agreedQuotes.find(q => q.id === quote.id) ||
                     progress.rankedQuotes.find(q => q.id === quote.id)) {
            grouped[issue.id].quotes.push({ quote, badge: 'agreed' });
          } else if (progress.disagreedQuotes.find(q => q.id === quote.id)) {
            grouped[issue.id].quotes.push({ quote, badge: 'disagreed' });
          } else {
            // Issue in progress but quote not yet evaluated
            grouped[issue.id].quotes.push({ quote, badge: 'unevaluated' });
          }
        }
      });

      // Sort quotes: diamond first, gold second, agreed, disagreed, unevaluated last
      const badgeOrder = { diamond: 0, gold: 1, agreed: 2, disagreed: 3, unevaluated: 4 };
      grouped[issue.id].quotes.sort((a, b) => badgeOrder[a.badge] - badgeOrder[b.badge]);
    });

    return grouped;
  }, [candidateId, issueProgress, quotes, issues]);

  // Calculate aggregate stats across all issues
  const aggregateStats = useMemo(() => {
    let diamonds = 0;
    let golds = 0;
    let agreed = 0;
    let disagreed = 0;
    let totalEvaluated = 0;

    Object.values(quotesByIssue).forEach(issueData => {
      issueData.quotes.forEach(({ badge }) => {
        if (badge !== 'unevaluated') {
          totalEvaluated++;
          switch (badge) {
            case 'diamond': diamonds++; break;
            case 'gold': golds++; break;
            case 'agreed': agreed++; break;
            case 'disagreed': disagreed++; break;
          }
        }
      });
    });

    const completedIssues = Object.values(quotesByIssue).filter(i => i.evaluated).length;

    return { diamonds, golds, agreed, disagreed, totalEvaluated, completedIssues };
  }, [quotesByIssue]);

  if (!candidate) {
    return (
      <div className="min-h-screen bg-ev-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Candidate not found</p>
          <button
            onClick={() => navigate('/')}
            className="ev-button-primary"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ev-white">
      {/* Header with back button */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-ev-light-blue hover:text-ev-teal transition-colors font-manrope font-medium"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Results</span>
          </button>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Candidate Profile Header */}
        <motion.div
          className="bg-white rounded-xl shadow-lg overflow-hidden mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="bg-gradient-to-r from-ev-light-blue to-ev-teal p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <img
                src={candidate.photo}
                alt={candidate.name}
                className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-white shadow-lg"
              />
              <div className="text-center md:text-left">
                <h1 className="font-manrope font-bold text-2xl md:text-3xl text-white mb-1">
                  {candidate.name}
                </h1>
                <p className="text-white/90 text-lg mb-1">{candidate.office}</p>
                <p className={`font-medium text-white/80`}>{candidate.party}</p>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="p-6 bg-gray-50">
            <h2 className="font-manrope font-semibold text-lg text-gray-800 mb-4 text-center">
              Your Alignment with {candidate.name.split(' ')[0]}
              <span className="block text-sm font-normal text-gray-500 mt-1">
                Across {aggregateStats.completedIssues} of {issues.length} issues evaluated
              </span>
            </h2>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <DiamondBadgeDisplay size={28} />
                </div>
                <div className="font-manrope font-bold text-2xl text-cyan-600">{aggregateStats.diamonds}</div>
                <div className="text-xs text-gray-500">Diamond</div>
              </div>
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <GoldBadgeDisplay size={28} />
                </div>
                <div className="font-manrope font-bold text-2xl text-amber-600">{aggregateStats.golds}</div>
                <div className="text-xs text-gray-500">Gold</div>
              </div>
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <div className="bg-green-100 p-2 rounded-xl">
                    <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="font-manrope font-bold text-2xl text-green-600">{aggregateStats.agreed}</div>
                <div className="text-xs text-gray-500">Agreed</div>
              </div>
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <div className="bg-red-100 p-2 rounded-xl">
                    <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
                <div className="font-manrope font-bold text-2xl text-red-500">{aggregateStats.disagreed}</div>
                <div className="text-xs text-gray-500">Disagreed</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quotes by Issue Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h2 className="font-manrope font-semibold text-xl text-gray-800 mb-4">
            Issue-by-Issue Breakdown
          </h2>

          <div className="space-y-6">
            {Object.values(quotesByIssue).map((issueData, issueIndex) => (
              <motion.div
                key={issueData.issueId}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * issueIndex, duration: 0.4 }}
              >
                {/* Issue Header */}
                <div className={`px-4 py-3 border-b ${
                  issueData.evaluated
                    ? 'bg-ev-light-blue bg-opacity-10 border-ev-light-blue/20'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-manrope font-bold text-lg text-gray-800">
                      {issueData.issueTitle}
                    </h3>
                    {issueData.evaluated ? (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">
                        Evaluated
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-200 text-gray-500">
                        Not Evaluated
                      </span>
                    )}
                  </div>
                </div>

                {/* Issue Quotes - only show evaluated quotes */}
                <div className="p-4 space-y-3">
                  {issueData.quotes.filter(q => q.badge !== 'unevaluated').length === 0 ? (
                    <p className="text-gray-500 text-sm">No evaluated quotes for this issue yet.</p>
                  ) : (
                    issueData.quotes
                      .filter(({ badge }) => badge !== 'unevaluated')
                      .map(({ quote, badge }, quoteIndex) => (
                        <QuoteCard
                          key={quote.id}
                          quote={quote}
                          badge={badge as 'diamond' | 'gold' | 'agreed' | 'disagreed'}
                          index={quoteIndex}
                        />
                      ))
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Back to Results Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/')}
            className="ev-button-primary px-8 py-3"
          >
            Back to All Results
          </button>
        </div>
      </main>
    </div>
  );
};
