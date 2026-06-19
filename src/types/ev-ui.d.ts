declare module '@empoweredvote/ev-ui' {
  import { CSSProperties, ReactNode } from 'react';

  export interface NavDropdownItem {
    label: string;
    href: string;
  }

  export interface NavItem {
    label: string;
    href: string;
    dropdown?: NavDropdownItem[];
  }

  export interface CTAButton {
    label: string;
    href: string;
  }

  export interface ProfileMenuItem {
    label: string;
    href?: string;
    onClick?: () => void;
  }

  export interface ProfileMenu {
    label: string | null;
    items: ProfileMenuItem[];
  }

  export interface HeaderProps {
    logoSrc?: string;
    logoAlt?: string;
    logoHref?: string;
    navItems?: NavItem[];
    ctaButton?: CTAButton;
    currentPath?: string;
    onNavigate?: (href: string) => void;
    profileMenu?: ProfileMenu;
    secondaryAction?: ReactNode | { label: string; href: string; target?: string; rel?: string } | false;
    darkMode?: boolean;
    navCollapseBreakpoint?: number;
    style?: CSSProperties;
  }

  export function Header(props: HeaderProps): JSX.Element;

  export interface SiteHeaderProps {
    logoSrc?: string;
    currentPath?: string;
    onNavigate?: (href: string) => void;
    style?: CSSProperties;
  }

  export function SiteHeader(props: SiteHeaderProps): JSX.Element;

  export const defaultNavItems: NavItem[];
  export const defaultCtaButton: CTAButton;

  // Feedback — builds the empowered.vote/feedback URL with auto-detected
  // ?feature= (from hostname) and current ?url=.
  export function getFeedbackUrl(opts?: {
    feature?: string;
    baseUrl?: string;
    includeUrl?: boolean;
  }): string;

  export interface RadarChartCoreProps {
    labels: string[];
    data: number[];
    data2?: number[];
    onSpokeClick?: (index: number) => void;
    invertedSpokes?: boolean[];
  }

  export function RadarChartCore(props: RadarChartCoreProps): JSX.Element;

  // Design tokens
  export const colors: {
    evTeal: string;
    evTealDark: string;
    evTealLight: string;
    evCoral: string;
    evYellow: string;
    bgLight: string;
    bgWhite: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    textWhite: string;
    borderLight: string;
    borderMedium: string;
    error: string;
    success: string;
  };

  export const fonts: {
    primary: string;
    fallback: string;
  };

  export const fontWeights: {
    regular: number;
    medium: number;
    semibold: number;
    bold: number;
  };

  export const fontSizes: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
    '5xl': string;
  };

  export const spacing: Record<string, string>;
  export const borderRadius: Record<string, string>;
  export const shadows: Record<string, string>;
  export const breakpoints: Record<string, string>;

  // Cross-subdomain shared client state via the ev-context broker iframe.
  export interface EvAuthedSlice {
    compass?: Record<string, unknown>;
    address?: Record<string, unknown>;
    verdicts?: Record<string, unknown>;
    // 260426-mw6 — per-userId per-domain dismissal stamp for promotion banner.
    promotionDismissed?: { compass?: boolean; address?: boolean; verdicts?: boolean };
  }
  export const evContext: {
    configure(opts: { brokerUrl?: string }): void;
    preload(): Promise<void>;
    get(): Promise<Record<string, unknown> | null>;
    set(value: Record<string, unknown>): Promise<boolean>;
    clear(): Promise<boolean>;
    subscribe(fn: (value: Record<string, unknown> | null) => void): () => void;
    // userId-stamped authed slice helpers (260426-mc5).
    getAuthedSlice(userId: string): Promise<EvAuthedSlice | null>;
    setAuthedSlice(userId: string, patch: EvAuthedSlice): Promise<boolean>;
    clearAuthedSlice(): Promise<boolean>;
  };

  // 260426-mw6 — guest → authed promotion hook.
  export type EvPromotionDomain = 'compass' | 'address' | 'verdicts';
  export type EvPromotionStatus = 'idle' | 'saving' | 'saved' | 'error';
  export interface UseEvContextPromotionArgs {
    domain: EvPromotionDomain;
    isLoggedIn: boolean;
    userId: string | null | undefined;
    apiData: unknown;
    apiWriter: (payload: unknown) => Promise<unknown>;
    enabled?: boolean;
  }
  export interface UseEvContextPromotionReturn {
    shouldPrompt: boolean;
    payload: unknown;
    promote: () => Promise<void>;
    dismiss: () => Promise<void>;
    status: EvPromotionStatus;
    error: Error | null;
  }
  export function useEvContextPromotion(
    args: UseEvContextPromotionArgs
  ): UseEvContextPromotionReturn;
}
