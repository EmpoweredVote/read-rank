import React from 'react';
import { motion } from 'framer-motion';

interface BadgeIconProps {
  isActive: boolean;
  isDisabled: boolean;
  onClick: () => void;
  size?: number;
}

export const DiamondBadge: React.FC<BadgeIconProps> = ({
  isActive,
  isDisabled,
  onClick,
  size = 32
}) => {
  return (
    <motion.button
      onClick={onClick}
      disabled={isDisabled && !isActive}
      className={`
        relative p-1.5 rounded-lg transition-all duration-200
        ${isActive
          ? 'bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-cyan-500/40'
          : isDisabled
            ? 'bg-gray-200 opacity-40 cursor-not-allowed'
            : 'bg-gray-200 hover:bg-gray-300 cursor-pointer'
        }
      `}
      whileHover={!isDisabled || isActive ? { scale: 1.1 } : {}}
      whileTap={!isDisabled || isActive ? { scale: 0.95 } : {}}
      animate={isActive ? {
        boxShadow: [
          '0 0 0 0 rgba(34, 211, 238, 0)',
          '0 0 20px 4px rgba(34, 211, 238, 0.4)',
          '0 0 0 0 rgba(34, 211, 238, 0)'
        ]
      } : {}}
      transition={isActive ? {
        boxShadow: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
      } : {}}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Diamond shape with facets */}
        <defs>
          <linearGradient id="diamondGradientActive" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E0F7FF" />
            <stop offset="30%" stopColor="#67E8F9" />
            <stop offset="60%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#0891B2" />
          </linearGradient>
          <linearGradient id="diamondGradientInactive" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9CA3AF" />
            <stop offset="100%" stopColor="#6B7280" />
          </linearGradient>
        </defs>

        {/* Main diamond body */}
        <path
          d="M12 2L4 9L12 22L20 9L12 2Z"
          fill={isActive ? 'url(#diamondGradientActive)' : 'url(#diamondGradientInactive)'}
          stroke={isActive ? '#0E7490' : '#4B5563'}
          strokeWidth="0.5"
        />

        {/* Top facet */}
        <path
          d="M12 2L4 9H20L12 2Z"
          fill={isActive ? '#A5F3FC' : '#D1D5DB'}
          opacity="0.7"
        />

        {/* Left facet line */}
        <path
          d="M4 9L12 22L12 9H4Z"
          fill={isActive ? '#22D3EE' : '#9CA3AF'}
          opacity="0.5"
        />

        {/* Highlight */}
        <path
          d="M8 6L10 9L8 9L8 6Z"
          fill={isActive ? '#FFFFFF' : '#E5E7EB'}
          opacity="0.8"
        />
      </svg>

      {isActive && (
        <motion.div
          className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        >
          <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
            <path d="M2 6L5 9L10 3" stroke="#0891B2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>
      )}
    </motion.button>
  );
};

export const GoldBadge: React.FC<BadgeIconProps> = ({
  isActive,
  isDisabled,
  onClick,
  size = 32
}) => {
  return (
    <motion.button
      onClick={onClick}
      disabled={isDisabled && !isActive}
      className={`
        relative p-1.5 rounded-lg transition-all duration-200
        ${isActive
          ? 'bg-gradient-to-br from-yellow-400 to-amber-600 shadow-lg shadow-amber-500/40'
          : isDisabled
            ? 'bg-gray-200 opacity-40 cursor-not-allowed'
            : 'bg-gray-200 hover:bg-gray-300 cursor-pointer'
        }
      `}
      whileHover={!isDisabled || isActive ? { scale: 1.1 } : {}}
      whileTap={!isDisabled || isActive ? { scale: 0.95 } : {}}
      animate={isActive ? {
        boxShadow: [
          '0 0 0 0 rgba(251, 191, 36, 0)',
          '0 0 20px 4px rgba(251, 191, 36, 0.4)',
          '0 0 0 0 rgba(251, 191, 36, 0)'
        ]
      } : {}}
      transition={isActive ? {
        boxShadow: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
      } : {}}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Gold medal with ribbon */}
        <defs>
          <linearGradient id="goldGradientActive" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FEF3C7" />
            <stop offset="30%" stopColor="#FCD34D" />
            <stop offset="60%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
          <linearGradient id="goldGradientInactive" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9CA3AF" />
            <stop offset="100%" stopColor="#6B7280" />
          </linearGradient>
          <linearGradient id="ribbonGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={isActive ? '#DC2626' : '#6B7280'} />
            <stop offset="50%" stopColor={isActive ? '#EF4444' : '#9CA3AF'} />
            <stop offset="100%" stopColor={isActive ? '#DC2626' : '#6B7280'} />
          </linearGradient>
        </defs>

        {/* Ribbon tails */}
        <path
          d="M8 4L6 1H9L10.5 4"
          fill="url(#ribbonGradient)"
        />
        <path
          d="M16 4L18 1H15L13.5 4"
          fill="url(#ribbonGradient)"
        />

        {/* Medal circle */}
        <circle
          cx="12"
          cy="14"
          r="8"
          fill={isActive ? 'url(#goldGradientActive)' : 'url(#goldGradientInactive)'}
          stroke={isActive ? '#92400E' : '#4B5563'}
          strokeWidth="0.5"
        />

        {/* Inner circle */}
        <circle
          cx="12"
          cy="14"
          r="5.5"
          fill="none"
          stroke={isActive ? '#B45309' : '#6B7280'}
          strokeWidth="0.75"
        />

        {/* Star on medal */}
        <path
          d="M12 10L13.09 12.26L15.5 12.63L13.75 14.34L14.18 16.73L12 15.58L9.82 16.73L10.25 14.34L8.5 12.63L10.91 12.26L12 10Z"
          fill={isActive ? '#FEF3C7' : '#D1D5DB'}
          stroke={isActive ? '#B45309' : '#6B7280'}
          strokeWidth="0.3"
        />

        {/* Highlight */}
        <ellipse
          cx="9.5"
          cy="11.5"
          rx="1.5"
          ry="1"
          fill={isActive ? '#FFFFFF' : '#E5E7EB'}
          opacity="0.6"
        />
      </svg>

      {isActive && (
        <motion.div
          className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        >
          <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
            <path d="M2 6L5 9L10 3" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>
      )}
    </motion.button>
  );
};

// Label component for accessibility and clarity
export const BadgeLabel: React.FC<{ badge: 'diamond' | 'gold'; isActive: boolean }> = ({ badge, isActive }) => {
  const labels = {
    diamond: { active: 'Top Pick', inactive: 'Diamond' },
    gold: { active: 'Runner Up', inactive: 'Gold' },
  };

  return (
    <span className={`
      text-xs font-manrope font-semibold
      ${isActive
        ? badge === 'diamond'
          ? 'text-cyan-600'
          : 'text-amber-600'
        : 'text-gray-400'
      }
    `}>
      {isActive ? labels[badge].active : labels[badge].inactive}
    </span>
  );
};
