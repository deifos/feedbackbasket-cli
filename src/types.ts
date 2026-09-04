// API response types — aligned with FeedbackBasket v3 REST API

export type FeedbackStatus = 'OPEN' | 'UNDER_REVIEW' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETE' | 'CLOSED';
export type FeedbackCloseReason = 'DUPLICATE' | 'NOT_PLANNED' | 'COULD_NOT_REPRODUCE' | 'NOT_ACTIONABLE' | 'NO_LONGER_RELEVANT' | 'SPAM' | 'OTHER';
export type FeedbackCategory = 'BUG' | 'FEATURE_REQUEST' | 'IMPROVEMENT' | 'QUESTION';
export type Sentiment = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
export type Severity = 'high' | 'medium' | 'low';
export type ReplyDelivery = 'email' | 'widget' | 'in-app' | 'both';
export type FeedbackFlowQuestionType = 'text' | 'textarea' | 'single_choice';

export interface FeedbackFlowQuestion {
  id: string;
  label: string;
  type: FeedbackFlowQuestionType;
  placeholder?: string;
  options?: string[];
}

export interface FeedbackFlowType {
  id: string;
  emoji: string;
  label: string;
  description: string;
  questions: FeedbackFlowQuestion[];
}

export interface FeedbackFlowSettings {
  enabled: boolean;
  mode: 'guided';
  types: FeedbackFlowType[];
}

export interface WidgetSettings {
  captureMode?: 'feedback' | 'waitlist';
  widgetType?: string;
  triggerMode?: 'floating' | 'inline';
  buttonColor?: string;
  buttonRadius?: number;
  buttonLabel?: string;
  buttonSize?: 'mini' | 'regular';
  iconOnly?: boolean;
  showIcon?: boolean;
  icon?: string;
  introMessage?: string;
  successMessage?: string;
  position?: string;
  showEmailField?: boolean;
  emailRequired?: boolean;
  emailReadOnly?: boolean;
  hideEmailFieldWhenPrefilled?: boolean;
  allowAttachments?: boolean;
  allowVisitorReplies?: boolean;
  displayMode?: 'modal' | 'popup';
  zIndex?: number;
  showBranding?: boolean;
  allowConsoleErrors?: boolean;
  errorTrackingEnabled?: boolean;
  feedbackFlow?: FeedbackFlowSettings;
}

export interface Project {
  id: string;
  name: string;
  url: string;
  description?: string;
  replyToEmail?: string | null;
  createdAt: string;
  totalFeedback: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
}

export interface MobileIntegrationResponse {
  project: {
    id: string;
    name: string;
    url: string;
  };
  integration: {
    enabled: boolean;
    allowVisitorReplies: boolean;
    publishableKey: string;
    publishableKeyIncluded: boolean;
    hostedFormUrl: string | null;
    bundleIds: string[];
    connection: {
      connected: boolean;
      lastSeenAt: string | null;
      platform: string | null;
      sdkVersion: string | null;
      bundleId: string | null;
    };
  } | null;
  sdk: {
    swiftPackageUrl: string;
    minimumIOSVersion: string;
    productionBaseUrl: string;
  };
}

export interface Feedback {
  id: string;
  content: string;
  email?: string | null;
  status: FeedbackStatus;
  closeReason?: FeedbackCloseReason | null;
  closeNote?: string | null;
  closedAt?: string | null;
  category?: FeedbackCategory | null;
  sentiment?: Sentiment | null;
  aiSummary?: string | null;
  aiPriorityScore?: number | null;
  awaitingOwnerReply?: boolean;
  reasoning?: string | null;
  feedbackType?: {
    id?: string;
    emoji?: string;
    label?: string;
    description?: string;
  } | null;
  followUpAnswers?: Array<{
    questionId: string;
    label: string;
    type: FeedbackFlowQuestionType;
    value: string;
  }> | null;
  metadata?: Record<string, unknown> | null;
  pageUrl?: string | null;
  browser?: string | null;
  os?: string | null;
  device?: string | null;
  language?: string | null;
  hasWidgetAccess?: boolean;
  replyChannel?: 'widget' | 'in_app' | null;
  attachments?: FeedbackAttachment[];
  project: {
    id: string;
    name: string;
    replyToEmail?: string | null;
  };
  notes?: FeedbackNote[];
  createdAt: string;
}

export interface FeedbackAttachment {
  id: string;
  url: string;
  filename: string;
  size?: number;
  mimeType?: string;
  createdAt?: string;
}

export interface FeedbackNote {
  id: string;
  content: string;
  createdAt: string;
  author: { name: string };
}

export interface BugReport extends Feedback {
  severity: Severity;
}

export interface ProjectsResponse {
  projects: Project[];
  totalProjects: number;
}

export interface Pagination {
  totalCount: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface WaitlistEntry {
  id: string;
  email: string;
  name?: string | null;
  pageUrl?: string | null;
  referrerUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WaitlistResponse {
  project: {
    id: string;
    name: string;
    captureMode: 'feedback' | 'waitlist';
  };
  entries: WaitlistEntry[];
  totalSignups: number;
  pagination: Pagination;
}

export interface FeedbackResponse {
  feedback: Feedback[];
  pagination: Pagination;
}

export interface FeedbackCreateInput {
  projectId: string;
  content: string;
  type?: 'bug' | 'feature' | 'general';
  category?: FeedbackCategory;
  status?: FeedbackStatus;
  closeReason?: FeedbackCloseReason;
  closeNote?: string;
  email?: string;
  pageUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface FeedbackCreateResponse {
  id: string;
  url: string;
  feedback: Feedback;
}

export interface FeedbackReplyResponse {
  reply: {
    id: string;
    content: string;
    replyToEmail: string;
    sentBy: string;
    createdAt: string;
  } | null;
  message: {
    id: string;
    senderType: 'OWNER' | 'VISITOR';
    content: string;
    delivery: 'WIDGET' | 'EMAIL' | 'BOTH';
    sentByName: string | null;
    replyId: string | null;
    createdAt: string;
  } | null;
  sentTo: string | null;
  destinations: Array<'email' | 'widget'>;
}

export interface BugReportsResponse {
  bugReports: BugReport[];
  stats: {
    total: number;
    bySeverity: { high: number; medium: number; low: number };
    byStatus: Record<string, number>;
  };
  pagination: Pagination;
}

export interface FeedbackParams {
  projectId?: string;
  category?: FeedbackCategory;
  status?: FeedbackStatus;
  closeReason?: FeedbackCloseReason;
  sentiment?: Sentiment;
  search?: string;
  limit?: number;
  offset?: number;
  includeNotes?: boolean;
}

export interface BugReportParams {
  projectId?: string;
  status?: FeedbackStatus;
  severity?: Severity;
  search?: string;
  limit?: number;
  offset?: number;
  includeNotes?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  organizationId: string;
  organizationName: string;
}
