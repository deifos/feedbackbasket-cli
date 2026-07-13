import { USER_AGENT } from './version.js';
import { CLIError, errAuth, errForbidden, errRateLimit, errNetwork, errAPI } from './output/errors.js';
import type {
  ProjectsResponse,
  FeedbackResponse,
  BugReportsResponse,
  FeedbackParams,
  FeedbackCreateInput,
  FeedbackCreateResponse,
  FeedbackReplyResponse,
  BugReportParams,
  UserProfile,
  Project,
  Feedback,
  WidgetSettings,
  WaitlistResponse,
  MobileIntegrationResponse,
} from './types.js';

export class FeedbackBasketClient {
  private readonly apiBaseUrl: string;
  private readonly token: string;

  constructor(token: string, baseUrl: string) {
    this.apiBaseUrl = `${baseUrl.replace(/\/$/, '')}/api/v1`;
    this.token = token;
  }

  async me(): Promise<UserProfile> {
    return this.request<UserProfile>('GET', '/auth/me');
  }

  async listProjects(): Promise<ProjectsResponse> {
    return this.request<ProjectsResponse>('GET', '/projects');
  }

  async getProject(id: string): Promise<Project> {
    return this.request<Project>('GET', `/projects/${encodeURIComponent(id)}`);
  }

  async createProject(data: { name: string; url: string; description?: string }): Promise<{ project: Project }> {
    return this.request<{ project: Project }>('POST', '/projects', data);
  }

  async updateProject(id: string, data: { name?: string; url?: string; description?: string; replyToEmail?: string | null }): Promise<Project> {
    return this.request<Project>('PATCH', `/projects/${encodeURIComponent(id)}`, data);
  }

  async deleteProject(id: string): Promise<{ deleted: boolean; id: string; name: string }> {
    return this.request<{ deleted: boolean; id: string; name: string }>('DELETE', `/projects/${encodeURIComponent(id)}`);
  }

  async getFeedback(params: FeedbackParams = {}): Promise<FeedbackResponse> {
    const query = buildQuery(params as Record<string, unknown>);
    return this.request<FeedbackResponse>('GET', `/feedback${query}`);
  }

  async getFeedbackById(id: string): Promise<Feedback> {
    return this.request<Feedback>('GET', `/feedback/${encodeURIComponent(id)}`);
  }

  async getBugReports(params: BugReportParams = {}): Promise<BugReportsResponse> {
    const query = buildQuery(params as Record<string, unknown>);
    return this.request<BugReportsResponse>('GET', `/feedback/bugs${query}`);
  }

  async getBugStats(params: { projectId?: string } = {}): Promise<BugReportsResponse['stats']> {
    const query = params.projectId ? `?projectId=${encodeURIComponent(params.projectId)}` : '';
    return this.request<BugReportsResponse['stats']>('GET', `/feedback/bugs/stats${query}`);
  }

  async searchFeedback(query: string, opts: { projectId?: string; category?: string; limit?: number } = {}): Promise<FeedbackResponse> {
    return this.getFeedback({ search: query, ...opts } as FeedbackParams);
  }

  async createFeedback(data: FeedbackCreateInput): Promise<FeedbackCreateResponse> {
    return this.request<FeedbackCreateResponse>('POST', '/feedback', data);
  }

  // Widget
  async getWidgetSettings(projectId: string): Promise<{ projectId: string; projectName: string; settings: WidgetSettings }> {
    return this.request('GET', `/projects/${encodeURIComponent(projectId)}/widget`);
  }

  async updateWidgetSettings(projectId: string, settings: Partial<WidgetSettings>): Promise<{ projectId: string; projectName: string; settings: WidgetSettings }> {
    return this.request('PATCH', `/projects/${encodeURIComponent(projectId)}/widget`, settings);
  }

  async getWidgetScript(projectId: string): Promise<{ projectId: string; projectName: string; captureMode: 'feedback' | 'waitlist'; embedCode: string; scriptUrl: string }> {
    return this.request('GET', `/projects/${encodeURIComponent(projectId)}/widget-script`);
  }

  // Mobile feedback
  async getMobileIntegration(projectId: string, includePublishableKey = false): Promise<MobileIntegrationResponse> {
    const query = includePublishableKey ? '?includePublishableKey=true' : '';
    return this.request('GET', `/projects/${encodeURIComponent(projectId)}/mobile${query}`);
  }

  async updateMobileIntegration(
    projectId: string,
    data: { enabled?: boolean; allowVisitorReplies?: boolean; addBundleIds?: string[]; removeBundleIds?: string[] },
    includePublishableKey = false,
  ): Promise<MobileIntegrationResponse> {
    const query = includePublishableKey ? '?includePublishableKey=true' : '';
    return this.request('PATCH', `/projects/${encodeURIComponent(projectId)}/mobile${query}`, data);
  }

  async rotateMobileProjectKey(projectId: string, includePublishableKey = false): Promise<MobileIntegrationResponse> {
    const query = includePublishableKey ? '?includePublishableKey=true' : '';
    return this.request('POST', `/projects/${encodeURIComponent(projectId)}/mobile/rotate-key${query}`);
  }

  async getWaitlist(projectId: string, params: { search?: string; limit?: number; offset?: number } = {}): Promise<WaitlistResponse> {
    const query = buildQuery(params as Record<string, unknown>);
    return this.request('GET', `/projects/${encodeURIComponent(projectId)}/waitlist${query}`);
  }

  async exportWaitlist(projectId: string): Promise<string> {
    const data = await this.request<unknown>('GET', `/projects/${encodeURIComponent(projectId)}/waitlist/export`);
    return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  }

  // Write operations
  async updateFeedback(id: string, data: { status?: string; category?: string; sentiment?: string }): Promise<Feedback> {
    return this.request<Feedback>('PATCH', `/feedback/${encodeURIComponent(id)}`, data);
  }

  async createNote(feedbackId: string, content: string): Promise<{ id: string; content: string; createdAt: string }> {
    return this.request('POST', `/feedback/${encodeURIComponent(feedbackId)}/notes`, { content });
  }

  async sendReply(feedbackId: string, content: string, opts: { replyToEmail?: string; destinations?: Array<'email' | 'widget'> } = {}): Promise<FeedbackReplyResponse> {
    const body: { content: string; replyToEmail?: string; destinations?: Array<'email' | 'widget'> } = { content };
    if (opts.destinations) body.destinations = opts.destinations;
    const replyToEmail = opts.replyToEmail;
    if (replyToEmail) body['replyToEmail'] = replyToEmail;
    return this.request('POST', `/feedback/${encodeURIComponent(feedbackId)}/replies`, body);
  }

  async listReplies(feedbackId: string): Promise<{ replies: Array<{ id: string; content: string; replyToEmail: string; sentBy: string; createdAt: string }>; messages?: NonNullable<FeedbackReplyResponse['message']>[]; total: number }> {
    return this.request('GET', `/feedback/${encodeURIComponent(feedbackId)}/replies`);
  }

  async deleteFeedback(id: string): Promise<{ deleted: boolean; id: string }> {
    return this.request('DELETE', `/feedback/${encodeURIComponent(id)}`);
  }

  async bulkUpdateStatus(ids: string[], status: string): Promise<{ updated: number; status: string }> {
    return this.request('POST', '/feedback/bulk-update', { ids, status });
  }

  async updateNote(feedbackId: string, noteId: string, content: string): Promise<{ id: string; content: string; createdAt: string }> {
    return this.request('PATCH', `/feedback/${encodeURIComponent(feedbackId)}/notes/${encodeURIComponent(noteId)}`, { content });
  }

  async deleteNote(feedbackId: string, noteId: string): Promise<{ deleted: boolean; id: string }> {
    return this.request('DELETE', `/feedback/${encodeURIComponent(feedbackId)}/notes/${encodeURIComponent(noteId)}`);
  }

  async exportFeedback(projectId: string, format: 'csv' | 'md' | 'json' = 'csv'): Promise<string> {
    const data = await this.request<unknown>('GET', `/projects/${encodeURIComponent(projectId)}/export?format=${format}`);
    return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  }

  // Team
  async listTeam(): Promise<{ members: Array<{ memberId: string; userId: string; name: string; email: string; role: string; joinedAt: string }>; totalMembers: number }> {
    return this.request('GET', '/team');
  }

  async updateMemberRole(memberId: string, role: string): Promise<{ memberId: string; name: string; email: string; role: string }> {
    return this.request('PATCH', `/team/${encodeURIComponent(memberId)}`, { role });
  }

  async removeMember(memberId: string): Promise<{ removed: boolean; memberId: string; name: string; email: string }> {
    return this.request('DELETE', `/team/${encodeURIComponent(memberId)}`);
  }

  private async request<T>(method: string, path: string, data?: unknown): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(`${this.apiBaseUrl}${path}`, {
        method,
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'User-Agent': USER_AGENT,
        },
        body: data === undefined ? undefined : JSON.stringify(data),
      });

      const contentType = response.headers.get('content-type') ?? '';
      const payload: unknown = contentType.includes('application/json')
        ? await response.json().catch(() => null)
        : await response.text();

      if (!response.ok) {
        const message = getErrorMessage(payload, response.statusText);
        switch (response.status) {
          case 401: throw errAuth(message);
          case 403: throw errForbidden(message);
          case 404: throw errAPI(404, message);
          case 429: throw errRateLimit();
          default: throw errAPI(response.status, message);
        }
      }

      return payload as T;
    } catch (error) {
      if (error instanceof CLIError) throw error;
      const cause = error instanceof Error ? error : new Error(String(error));
      throw errNetwork(cause);
    } finally {
      clearTimeout(timeout);
    }
  }
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object') {
    const value = payload as Record<string, unknown>;
    if (typeof value.error === 'string') return value.error;
    if (typeof value.message === 'string') return value.message;
  }
  if (typeof payload === 'string' && payload.trim()) return payload;
  return fallback || 'Request failed';
}

function buildQuery(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}
