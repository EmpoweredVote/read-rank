import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useReadRankStore } from '../store/useReadRankStore';
import type { Quote, Candidate, IssueProgress } from '../store/useReadRankStore';
import { fetchQuotesData } from '../data/api';
import { buildEssentialsProfileUrl } from '../utils/verdictFragment';

interface QuoteResultCardProps {
  quote: Quote;
  verdict: 'agreed' | 'disagreed';
  index: number;
  candidates: Candidate[];
  issueProgress: Record<string, IssueProgress>;
  topicId: string | null;
  onViewAlignment: (candidateId: string) => void;
  address?: string;
}

const QuoteResultCard: React.FC<QuoteResultCardProps> = ({ quote, verdict, index, candidates, issueProgress, topicId, onViewAlignment, address }) => {
  const candidate = candidates.find(c => c.id === quote.candidateId);
  if (!candidate) return null;

  const borderLeftColor = verdict === 'agreed' ? '#00657c' : '#d4cdc3';

  const getStatusBadge = () => {
    if (verdict === 'agreed') {
      return (
        <span style={{
          fontFamily: "'Manrope', sans-serif",
          fontSize: '0.6875rem',
          fontWeight: 600,
          color: '#0e7490',
          backgroundColor: '#ecfeff',
          padding: '0.25rem 0.625rem',
          borderRadius: '9999px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
          Agreed
        </span>
      );
    }
    return (
      <span style={{
        fontFamily: "'Manrope', sans-serif",
        fontSize: '0.6875rem',
        fontWeight: 600,
        color: '#78716c',
        backgroundColor: '#f5f5f4',
        padding: '0.25rem 0.625rem',
        borderRadius: '9999px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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
        borderRadius: '0.625rem',
        overflow: 'hidden',
      }}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Candidate header */}
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e8e2d9', backgroundColor: '#faf7f2' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={candidate.photo}
              alt={candidate.name}
              style={{
                width: '2.75rem',
                height: '2.75rem',
                borderRadius: '9999px',
                objectFit: 'cover',
                border: '2px solid #fffefb',
                boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              }}
            />
            <div>
              <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '1rem', color: '#1a1a2e', margin: 0 }}>
                {candidate.name}
              </h3>
              <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.75rem', color: '#64748b' }}>
                {candidate.office}
              </span>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </div>

      {/* Quote */}
      <div style={{ padding: '1.25rem 1.25rem 1rem' }}>
        <p className="ev-quote-text" style={{ fontSize: '0.9375rem', margin: 0 }}>
          &ldquo;{quote.text}&rdquo;
        </p>
        {quote.sourceUrl && (
          <a
            href={quote.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              marginTop: '0.75rem',
              fontFamily: "'Manrope', sans-serif",
              fontSize: '0.8125rem',
              color: '#00657c',
              textDecoration: 'none',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span>{quote.sourceName || 'Source'}</span>
          </a>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: '0 1.25rem 1.25rem', display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={() => onViewAlignment(candidate.id)}
          className="ev-button-primary"
          style={{ flex: 1, fontSize: '0.8125rem', padding: '0.625rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}
        >
          View Alignment
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <a
          href={buildEssentialsProfileUrl(candidate.id, issueProgress, topicId || undefined, address)}
          target="_blank"
          rel="noopener noreferrer"
          className="ev-button-secondary"
          style={{ flex: 1, fontSize: '0.8125rem', padding: '0.625rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', textDecoration: 'none' }}
        >
          Essentials
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </motion.div>
  );
};

export const ResultsPhase: React.FC = () => {
  const navigate = useNavigate();
  const { goToHub, issueProgress, currentIssueId, getCurrentIssueProgress, locationFilter } = useReadRankStore();
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const progress = getCurrentIssueProgress();
  const rankedQuotes = progress?.rankedQuotes ?? [];
  const disagreedQuotes = progress?.disagreedQuotes ?? [];

  useEffect(() => {
    fetchQuotesData().then(data => {
      setCandidates(data.candidates);
      const timer = setTimeout(() => setLoading(false), 800);
      return () => clearTimeout(timer);
    });
  }, []);

  const organizedQuotes = useMemo(() => {
    const result: { quote: Quote; verdict: 'agreed' | 'disagreed' }[] = [];
    rankedQuotes.forEach(quote => result.push({ quote, verdict: 'agreed' }));
    disagreedQuotes.forEach(quote => result.push({ quote, verdict: 'disagreed' }));
    return result;
  }, [rankedQuotes, disagreedQuotes]);

  const handleViewAlignment = (candidateId: string) => {
    navigate(`/candidate/${candidateId}/alignment`);
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <motion.div
          className="inline-block w-6 h-6 border-2 rounded-full"
          style={{ borderColor: '#e8e2d9', borderTopColor: '#00657c' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <p className="mt-4" style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', color: '#64748b', fontSize: '1rem' }}>
          Revealing who said what...
        </p>
      </div>
    );
  }

  return (
    <div className="pb-12">
      {/* Header */}
      <motion.div
        className="text-center max-w-2xl mx-auto mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <h2 style={{
          fontFamily: "'Fraunces', serif",
          fontWeight: 700,
          fontSize: 'clamp(1.5rem, 4vw, 2rem)',
          color: '#1a1a2e',
          marginBottom: '0.375rem',
          letterSpacing: '-0.02em',
        }}>
          Here&rsquo;s Who Said What
        </h2>
        <p style={{ fontFamily: "'Manrope', sans-serif", color: '#64748b', fontSize: '0.9375rem' }}>
          See how your preferences align with each candidate
        </p>
      </motion.div>

      {/* Summary Stats */}
      <motion.div
        className="max-w-lg mx-auto mb-8"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        style={{
          backgroundColor: '#fffefb',
          border: '1px solid #e8e2d9',
          borderRadius: '0.625rem',
          padding: '1.25rem',
        }}
      >
        <div className="grid grid-cols-2 gap-4 text-center">
          {[
            { label: 'Agreed', value: rankedQuotes.length, color: '#00657c' },
            { label: 'Disagreed', value: disagreedQuotes.length, color: '#78716c' },
          ].map(stat => (
            <div key={stat.label}>
              <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: '1.5rem', color: stat.color }}>
                {stat.value}
              </div>
              <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.6875rem', color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Result Cards */}
      <div className="max-w-2xl mx-auto space-y-4">
        {organizedQuotes.map(({ quote, verdict }, index) => (
          <QuoteResultCard
            key={quote.id}
            quote={quote}
            verdict={verdict}
            index={index}
            candidates={candidates}
            issueProgress={issueProgress}
            topicId={currentIssueId}
            onViewAlignment={handleViewAlignment}
            address={locationFilter?.address}
          />
        ))}
      </div>

      {/* Back to Issues */}
      <motion.div
        className="flex justify-center pt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <motion.button
          onClick={() => goToHub()}
          className="ev-button-primary"
          style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
        >
          Explore More Issues
        </motion.button>
      </motion.div>
    </div>
  );
};
