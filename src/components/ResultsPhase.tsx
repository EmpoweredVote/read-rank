import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useReadRankStore } from '../store/useReadRankStore';
import type { Quote, Candidate } from '../store/useReadRankStore';
import { fetchQuotesData } from '../data/api';

// Display-only badge icons (non-interactive versions)
const DiamondBadgeDisplay: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <div className="bg-gradient-to-br from-cyan-400 to-blue-600 p-1.5 rounded-lg shadow-lg shadow-cyan-500/40">
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="diamondGradientDisplay" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E0F7FF" />
          <stop offset="30%" stopColor="#67E8F9" />
          <stop offset="60%" stopColor="#22D3EE" />
          <stop offset="100%" stopColor="#0891B2" />
        </linearGradient>
      </defs>
      <path d="M12 2L4 9L12 22L20 9L12 2Z" fill="url(#diamondGradientDisplay)" stroke="#0E7490" strokeWidth="0.5" />
      <path d="M12 2L4 9H20L12 2Z" fill="#A5F3FC" opacity="0.7" />
      <path d="M4 9L12 22L12 9H4Z" fill="#22D3EE" opacity="0.5" />
      <path d="M8 6L10 9L8 9L8 6Z" fill="#FFFFFF" opacity="0.8" />
    </svg>
  </div>
);

const GoldBadgeDisplay: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <div className="bg-gradient-to-br from-yellow-400 to-amber-600 p-1.5 rounded-lg shadow-lg shadow-amber-500/40">
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="goldGradientDisplay" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF3C7" />
          <stop offset="30%" stopColor="#FCD34D" />
          <stop offset="60%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id="ribbonGradientDisplay" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#DC2626" />
          <stop offset="50%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#DC2626" />
        </linearGradient>
      </defs>
      <path d="M8 4L6 1H9L10.5 4" fill="url(#ribbonGradientDisplay)" />
      <path d="M16 4L18 1H15L13.5 4" fill="url(#ribbonGradientDisplay)" />
      <circle cx="12" cy="14" r="8" fill="url(#goldGradientDisplay)" stroke="#92400E" strokeWidth="0.5" />
      <circle cx="12" cy="14" r="5.5" fill="none" stroke="#B45309" strokeWidth="0.75" />
      <path d="M12 10L13.09 12.26L15.5 12.63L13.75 14.34L14.18 16.73L12 15.58L9.82 16.73L10.25 14.34L8.5 12.63L10.91 12.26L12 10Z" fill="#FEF3C7" stroke="#B45309" strokeWidth="0.3" />
      <ellipse cx="9.5" cy="11.5" rx="1.5" ry="1" fill="#FFFFFF" opacity="0.6" />
    </svg>
  </div>
);

interface QuoteResultCardProps {
  quote: Quote;
  badge: 'diamond' | 'gold' | 'agreed' | 'disagreed';
  index: number;
  candidates: Candidate[];
  onViewAlignment: (candidateId: string) => void;
}

const QuoteResultCard: React.FC<QuoteResultCardProps> = ({ quote, badge, index, candidates, onViewAlignment }) => {
  const candidate = candidates.find(c => c.id === quote.candidateId);

  if (!candidate) return null;

  const getBorderColor = () => {
    switch (badge) {
      case 'diamond': return 'border-cyan-500';
      case 'gold': return 'border-amber-500';
      case 'agreed': return 'border-green-500';
      case 'disagreed': return 'border-red-400';
      default: return 'border-gray-300';
    }
  };

  const getStatusBadge = () => {
    switch (badge) {
      case 'diamond':
        return (
          <div className="flex items-center gap-2">
            <DiamondBadgeDisplay size={24} />
            <span className="text-sm font-semibold text-cyan-700">Your Top Pick</span>
          </div>
        );
      case 'gold':
        return (
          <div className="flex items-center gap-2">
            <GoldBadgeDisplay size={24} />
            <span className="text-sm font-semibold text-amber-700">Your Runner Up</span>
          </div>
        );
      case 'agreed':
        return (
          <div className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            You Agreed
          </div>
        );
      case 'disagreed':
        return (
          <div className="inline-flex items-center gap-1.5 bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            You Disagreed
          </div>
        );
    }
  };

  const getPartyColor = (party: string) => {
    if (party.toLowerCase().includes('democrat')) return 'text-blue-600';
    if (party.toLowerCase().includes('republican')) return 'text-red-600';
    if (party.toLowerCase().includes('libertarian')) return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <motion.div
      className={`bg-white rounded-xl border-2 ${getBorderColor()} shadow-md overflow-hidden`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      {/* Header with candidate info */}
      <div className="p-4 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={candidate.photo}
              alt={candidate.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-white shadow"
            />
            <div>
              <h3 className="font-manrope font-bold text-lg text-gray-900">{candidate.name}</h3>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">{candidate.office}</span>
                <span className="text-gray-300">•</span>
                <span className={`font-medium ${getPartyColor(candidate.party)}`}>{candidate.party}</span>
              </div>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </div>

      {/* Quote content */}
      <div className="p-4">
        <p className="text-gray-700 text-base leading-relaxed italic">"{quote.text}"</p>
        {quote.sourceUrl && (
          <a
            href={quote.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-3 text-sm text-ev-light-blue hover:text-ev-teal transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span>{quote.sourceName || 'View Source'}</span>
          </a>
        )}
      </div>

      {/* Action footer */}
      <div className="px-4 pb-4">
        <button
          onClick={() => onViewAlignment(candidate.id)}
          className="w-full py-2.5 px-4 bg-ev-light-blue hover:bg-ev-teal text-white font-manrope font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          <span>View Your Alignment</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
};

export const ResultsPhase: React.FC = () => {
  const navigate = useNavigate();
  const { rankedQuotes, agreedQuotes, disagreedQuotes, badgeAssignments, goToHub } = useReadRankStore();
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  useEffect(() => {
    fetchQuotesData().then(data => {
      setCandidates(data.candidates);
      // Brief delay for animation
      const timer = setTimeout(() => setLoading(false), 800);
      return () => clearTimeout(timer);
    });
  }, []);

  // Organize quotes by badge priority: diamond, gold, other agreed, disagreed
  const organizedQuotes = useMemo(() => {
    const result: { quote: Quote; badge: 'diamond' | 'gold' | 'agreed' | 'disagreed' }[] = [];

    // All quotes that were agreed to (from rankedQuotes and agreedQuotes)
    const allAgreedQuotes = [...rankedQuotes, ...agreedQuotes.filter(q =>
      !rankedQuotes.find(rq => rq.id === q.id)
    )];

    // Diamond badge quote first
    if (badgeAssignments.diamond) {
      const diamondQuote = allAgreedQuotes.find(q => q.id === badgeAssignments.diamond);
      if (diamondQuote) {
        result.push({ quote: diamondQuote, badge: 'diamond' });
      }
    }

    // Gold badge quote second
    if (badgeAssignments.gold) {
      const goldQuote = allAgreedQuotes.find(q => q.id === badgeAssignments.gold);
      if (goldQuote) {
        result.push({ quote: goldQuote, badge: 'gold' });
      }
    }

    // Other agreed quotes (not diamond or gold)
    allAgreedQuotes.forEach(quote => {
      if (quote.id !== badgeAssignments.diamond && quote.id !== badgeAssignments.gold) {
        result.push({ quote, badge: 'agreed' });
      }
    });

    // Disagreed quotes last
    disagreedQuotes.forEach(quote => {
      result.push({ quote, badge: 'disagreed' });
    });

    return result;
  }, [rankedQuotes, agreedQuotes, disagreedQuotes, badgeAssignments]);

  const handleViewAlignment = (candidateId: string) => {
    navigate(`/candidate/${candidateId}/alignment`);
  };

  const handleBackToIssues = () => {
    goToHub();
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <motion.div
          className="inline-block w-8 h-8 border-4 border-ev-coral border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <p className="mt-4 ev-text-primary text-base md:text-lg">
          Revealing who said what...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-8">
      {/* Results intro text */}
      <motion.div
        className="text-center max-w-3xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="ev-heading text-2xl md:text-3xl mb-2">Here's Who Said What</h2>
        <p className="ev-text-primary text-base md:text-lg">
          See how your preferences align with each candidate's positions
        </p>
      </motion.div>

      {/* Summary Stats */}
      <motion.div
        className="max-w-2xl mx-auto bg-ev-light-blue bg-opacity-10 rounded-xl p-4 md:p-6"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="font-manrope font-bold text-xl md:text-2xl text-cyan-600">
              {badgeAssignments.diamond ? 1 : 0}
            </div>
            <div className="text-xs md:text-sm ev-text-primary">Diamond</div>
          </div>
          <div>
            <div className="font-manrope font-bold text-xl md:text-2xl text-amber-600">
              {badgeAssignments.gold ? 1 : 0}
            </div>
            <div className="text-xs md:text-sm ev-text-primary">Gold</div>
          </div>
          <div>
            <div className="font-manrope font-bold text-xl md:text-2xl text-green-600">
              {agreedQuotes.length + rankedQuotes.length - (badgeAssignments.diamond ? 1 : 0) - (badgeAssignments.gold ? 1 : 0)}
            </div>
            <div className="text-xs md:text-sm ev-text-primary">Agreed</div>
          </div>
          <div>
            <div className="font-manrope font-bold text-xl md:text-2xl text-red-500">
              {disagreedQuotes.length}
            </div>
            <div className="text-xs md:text-sm ev-text-primary">Disagreed</div>
          </div>
        </div>
      </motion.div>

      {/* Quote Cards */}
      <div className="max-w-3xl mx-auto space-y-4">
        {organizedQuotes.map(({ quote, badge }, index) => (
          <QuoteResultCard
            key={quote.id}
            quote={quote}
            badge={badge}
            index={index}
            candidates={candidates}
            onViewAlignment={handleViewAlignment}
          />
        ))}
      </div>

      {/* Back to Issues Button */}
      <motion.div
        className="flex justify-center pt-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <motion.button
          onClick={handleBackToIssues}
          className="relative overflow-hidden bg-gradient-to-r from-ev-light-blue to-ev-muted-blue hover:from-ev-muted-blue hover:to-ev-light-blue text-white font-manrope font-bold text-base md:text-lg px-8 py-3 rounded-xl shadow-lg shadow-ev-light-blue/30 hover:shadow-xl hover:shadow-ev-light-blue/40 transition-all duration-300"
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.span
            className="absolute inset-0 bg-white/20"
            initial={{ x: '-100%', skewX: '-15deg' }}
            animate={{ x: '200%' }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
          />
          <span className="relative flex items-center gap-2">
            Explore More Issues
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </motion.button>
      </motion.div>
    </div>
  );
};
