import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useReadRankStore } from '../store/useReadRankStore';
import type { Quote, IssueData, Candidate } from '../store/useReadRankStore';
import { fetchQuotesData } from '../data/api';
import { buildEssentialsProfileUrl } from '../utils/verdictFragment';

interface QuoteCardProps {
  quote: Quote;
  verdict: 'agreed' | 'disagreed';
  index: number;
}

const QuoteCard: React.FC<QuoteCardProps> = ({ quote, verdict, index }) => {
  const borderLeftColor = verdict === 'agreed' ? '#00657c' : '#d4cdc3';

  const getStatusLabel = () => {
    if (verdict === 'agreed') {
      return (
        <span style={{
          fontFamily: "'Manrope', sans-serif", fontSize: '0.6875rem', fontWeight: 600,
          color: '#0e7490', backgroundColor: '#ecfeff',
          padding: '0.1875rem 0.5rem', borderRadius: '9999px',
          display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
          Agreed
        </span>
      );
    }
    return (
      <span style={{
        fontFamily: "'Manrope', sans-serif", fontSize: '0.6875rem', fontWeight: 600,
        color: '#78716c', backgroundColor: '#f5f5f4',
        padding: '0.1875rem 0.5rem', borderRadius: '9999px',
        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
        Disagreed
      </span>
    );
  };

  return (
    <motion.div
      style={{
        backgroundColor: '#fffefb',
        border: '1px solid #e8e2d9',
        borderLeft: `3px solid ${borderLeftColor}`,
        borderRadius: '0.5rem',
        padding: '1rem',
      }}
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-center justify-end mb-2">
        {getStatusLabel()}
      </div>
      <p className="ev-quote-text" style={{ fontSize: '0.875rem', margin: 0 }}>
        &ldquo;{quote.text}&rdquo;
      </p>
      {quote.sourceUrl && (
        <a
          href={quote.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
            marginTop: '0.625rem',
            fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem',
            color: '#00657c', textDecoration: 'none',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span>{quote.sourceName || 'Source'}</span>
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

  const quotesByIssue = useMemo(() => {
    const candidateQuotes = quotes.filter(q => q.candidateId === candidateId);
    const grouped: Record<string, {
      issueId: string;
      issueTitle: string;
      evaluated: boolean;
      quotes: { quote: Quote; verdict: 'agreed' | 'disagreed' | 'unevaluated' }[];
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
          grouped[issue.id].quotes.push({ quote, verdict: 'unevaluated' });
        } else if (progress.agreedQuotes.find(q => q.id === quote.id) ||
                   progress.rankedQuotes.find(q => q.id === quote.id)) {
          grouped[issue.id].quotes.push({ quote, verdict: 'agreed' });
        } else if (progress.disagreedQuotes.find(q => q.id === quote.id)) {
          grouped[issue.id].quotes.push({ quote, verdict: 'disagreed' });
        } else {
          grouped[issue.id].quotes.push({ quote, verdict: 'unevaluated' });
        }
      });

      const verdictOrder = { agreed: 0, disagreed: 1, unevaluated: 2 };
      grouped[issue.id].quotes.sort((a, b) => verdictOrder[a.verdict] - verdictOrder[b.verdict]);
    });

    return grouped;
  }, [candidateId, issueProgress, quotes, issues]);

  const aggregateStats = useMemo(() => {
    let agreed = 0, disagreed = 0;

    Object.values(quotesByIssue).forEach(issueData => {
      issueData.quotes.forEach(({ verdict }) => {
        if (verdict === 'agreed') agreed++;
        else if (verdict === 'disagreed') disagreed++;
      });
    });

    const completedIssues = Object.values(quotesByIssue).filter(i => i.evaluated).length;
    return { agreed, disagreed, completedIssues };
  }, [quotesByIssue]);

  if (!candidate) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#faf7f2' }}>
        <div className="text-center">
          <p style={{ fontFamily: "'Manrope', sans-serif", color: '#64748b', marginBottom: '1rem' }}>Candidate not found</p>
          <button onClick={() => navigate('/')} className="ev-button-primary">Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#faf7f2' }}>
      {/* Back bar */}
      <div style={{ backgroundColor: '#fffefb', borderBottom: '1px solid #e8e2d9' }}>
        <div className="container mx-auto px-4 py-3 max-w-4xl">
          <button
            onClick={() => navigate('/')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              fontFamily: "'Manrope', sans-serif", fontWeight: 500, fontSize: '0.875rem',
              color: '#00657c', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Results</span>
          </button>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Candidate Profile Header */}
        <motion.div
          style={{ backgroundColor: '#fffefb', border: '1px solid #e8e2d9', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '2rem' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Hero band */}
          <div style={{ background: 'linear-gradient(135deg, #00657c, #004d5c)', padding: '2rem' }}>
            <div className="flex flex-col md:flex-row items-center gap-5">
              <img
                src={candidate.photo}
                alt={candidate.name}
                style={{
                  width: '5.5rem', height: '5.5rem', borderRadius: '9999px',
                  objectFit: 'cover', border: '3px solid rgba(255,255,255,0.9)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                }}
              />
              <div className="text-center md:text-left">
                <h1 style={{
                  fontFamily: "'Fraunces', serif", fontWeight: 700,
                  fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: '#ffffff',
                  margin: '0 0 0.25rem',
                }}>
                  {candidate.name}
                </h1>
                <p style={{ fontFamily: "'Manrope', sans-serif", color: 'rgba(255,255,255,0.8)', fontSize: '1rem', margin: 0 }}>
                  {candidate.office}
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ padding: '1.5rem', backgroundColor: '#faf7f2' }}>
            <h2 style={{
              fontFamily: "'Manrope', sans-serif", fontWeight: 600, fontSize: '0.9375rem',
              color: '#2d2d44', textAlign: 'center', marginBottom: '0.25rem',
            }}>
              Your Alignment with {candidate.name.split(' ')[0]}
            </h2>
            <p style={{
              fontFamily: "'Manrope', sans-serif", fontSize: '0.75rem', color: '#94a3b8',
              textAlign: 'center', marginBottom: '1rem',
            }}>
              {aggregateStats.completedIssues} of {issues.length} issues evaluated
            </p>

            <div className="grid grid-cols-2 gap-4 text-center">
              {[
                { label: 'Agreed', value: aggregateStats.agreed, color: '#00657c', iconColor: '#0e7490', iconBg: '#ecfeff', path: <path d="M5 13l4 4L19 7" /> },
                { label: 'Disagreed', value: aggregateStats.disagreed, color: '#78716c', iconColor: '#78716c', iconBg: '#f5f5f4', path: <><path d="M18 6L6 18" /><path d="M6 6l12 12" /></> },
              ].map(stat => (
                <div key={stat.label}>
                  <div className="flex justify-center mb-1.5">
                    <div style={{ backgroundColor: stat.iconBg, padding: '0.375rem', borderRadius: '0.5rem' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stat.iconColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        {stat.path}
                      </svg>
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: '1.375rem', color: stat.color }}>
                    {stat.value}
                  </div>
                  <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.625rem', color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-center">
              <a
                href={buildEssentialsProfileUrl(candidate.id, issueProgress)}
                target="_blank"
                rel="noopener noreferrer"
                className="ev-button-secondary"
                style={{ fontSize: '0.8125rem', textDecoration: 'none' }}
              >
                View on Essentials
              </a>
            </div>
          </div>
        </motion.div>

        {/* Issue-by-Issue Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h2 style={{
            fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '1.25rem',
            color: '#1a1a2e', marginBottom: '1rem',
          }}>
            Issue-by-Issue Breakdown
          </h2>

          <div className="space-y-5">
            {Object.values(quotesByIssue).map((issueData, issueIndex) => (
              <motion.div
                key={issueData.issueId}
                style={{
                  backgroundColor: '#fffefb',
                  border: '1px solid #e8e2d9',
                  borderRadius: '0.625rem',
                  overflow: 'hidden',
                }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * issueIndex, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Issue Header */}
                <div style={{
                  padding: '0.875rem 1rem',
                  borderBottom: '1px solid #e8e2d9',
                  backgroundColor: issueData.evaluated ? '#f0f7f9' : '#faf7f2',
                }}>
                  <div className="flex items-center justify-between">
                    <h3 style={{
                      fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '1rem',
                      color: '#1a1a2e', margin: 0,
                    }}>
                      {issueData.issueTitle}
                    </h3>
                    <span style={{
                      fontFamily: "'Manrope', sans-serif", fontSize: '0.625rem', fontWeight: 600,
                      padding: '0.1875rem 0.5rem', borderRadius: '9999px',
                      letterSpacing: '0.04em', textTransform: 'uppercase' as const,
                      backgroundColor: issueData.evaluated ? '#e8f4f6' : '#f5f0e8',
                      color: issueData.evaluated ? '#00657c' : '#94a3b8',
                    }}>
                      {issueData.evaluated ? 'Evaluated' : 'Not Evaluated'}
                    </span>
                  </div>
                </div>

                {/* Quotes */}
                <div style={{ padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {issueData.quotes.filter(q => q.verdict !== 'unevaluated').length === 0 ? (
                    <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem', color: '#94a3b8' }}>
                      No evaluated quotes for this issue yet.
                    </p>
                  ) : (
                    issueData.quotes
                      .filter(({ verdict }) => verdict !== 'unevaluated')
                      .map(({ quote, verdict }, quoteIndex) => (
                        <QuoteCard
                          key={quote.id}
                          quote={quote}
                          verdict={verdict as 'agreed' | 'disagreed'}
                          index={quoteIndex}
                        />
                      ))
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Back */}
        <div className="mt-8 text-center">
          <button onClick={() => navigate('/')} className="ev-button-primary" style={{ padding: '0.75rem 2rem' }}>
            Back to All Results
          </button>
        </div>
      </main>
    </div>
  );
};
