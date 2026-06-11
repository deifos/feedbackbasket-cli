import axios, { AxiosInstance, AxiosError } from 'axios';
import { USER_AGENT } from './version.js';
import { errAuth, errForbidden, errRateLimit, errNetwork, errAPI } from './output/errors.js';
import type {
  ProjectsResponse,
  FeedbackResponse,
  BugReportsResponse,
  FeedbackParams,
  FeedbackCreateInput,
  FeedbackCreateResponse,
  BugReportParams,
  UserProfile,
  Project,
  Feedback,
  WidgetSettings,
} from './types.js';

export class FeedbackBasketClient {
  private http: AxiosInstance;

  constructor(token: string, baseUrl: string) {
    this.http = axios.create({
      baseURL: `${baseUrl}/api/v1`,
      timeout: 30_000,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT,
      },
    });
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

  async getWidgetScript(projectId: string): Promise<{ projectId: string; projectName: string; embedCode: string; scriptUrl: string }> {
    return this.request('GET', `/projects/${encodeURIComponent(projectId)}/widget-script`);
  }

  // Write operations
  async updateFeedback(id: string, data: { status?: string; category?: string; sentiment?: string }): Promise<Feedback> {
    return this.request<Feedback>('PATCH', `/feedback/${encodeURIComponent(id)}`, data);
  }

  async createNote(feedbackId: string, content: string): Promise<{ id: string; content: string; createdAt: string }> {
    return this.request('POST', `/feedback/${encodeURIComponent(feedbackId)}/notes`, { content });
  }

  async sendReply(feedbackId: string, content: string, replyToEmail?: string): Promise<{ reply: { id: string; content: string; replyToEmail: string; sentBy: string; createdAt: string }; sentTo: string }> {
    const body: Record<string, string> = { content };
    if (replyToEmail) body['replyToEmail'] = replyToEmail;
    return this.request('POST', `/feedback/${encodeURIComponent(feedbackId)}/replies`, body);
  }

  async listReplies(feedbackId: string): Promise<{ replies: Array<{ id: string; content: string; replyToEmail: string; sentBy: string; createdAt: string }>; total: number }> {
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
    const response = await this.http.get(`/projects/${encodeURIComponent(projectId)}/export?format=${format}`);
    return typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2);
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
    try {
      const response = await this.http.request<T>({ method, url: path, data });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): Error {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const message = error.response?.data?.error
        ?? error.response?.data?.message
        ?? error.message;

      if (!error.response) {
        return errNetwork(error);
      }

      switch (status) {
        case 401: return errAuth(message);
        case 403: return errForbidden(message);
        case 404: return errAPI(404, message);
        case 429: return errRateLimit();
        default:  return errAPI(status ?? 500, message);
      }
    }
    return error instanceof Error ? error : new Error(String(error));
  }
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
