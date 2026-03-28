const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

async function getToken(): Promise<string> {
  // Clerk exposes the session token via the window.__clerk_frontend_api hooks
  // At runtime we import dynamically to avoid circular deps
  const { getAuth } = await import('@clerk/clerk-react');
  // In practice we pass the token from components via a helper — see useApi()
  throw new Error('Use useApi() hook to get an authenticated client');
}

export interface ApiClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
  postForm<T>(path: string, form: FormData): Promise<T>;
}

export function createApiClient(token: string): ApiClient {
  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    isForm = false
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };
    if (!isForm && body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: isForm ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
    }

    return res.json() as Promise<T>;
  }

  return {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
    patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
    postForm: <T>(path: string, form: FormData) => request<T>('POST', path, form, true),
  };
}

// Types mirroring the worker
export interface Shooter {
  id: string;
  email: string | null;
  name: string;
  avatar_url: string | null;
  created_at: number;
}

export interface Arrow {
  score: number;
  is_x: boolean;
}

export interface EndData {
  id: string;
  round_id: string;
  end_number: number;
  arrows: Arrow[];
  total_score: number;
  x_count: number;
  image_key: string | null;
  scoring_method: 'ai' | 'manual';
  image_url?: string;
  created_at: number;
}

export interface Round {
  id: string;
  shooter_id: string;
  label: string;
  ends_total: number;
  arrows_per_end: number;
  max_arrow_score: number;
  status: 'active' | 'completed' | 'abandoned';
  total_score: number | null;
  x_count: number;
  notes: string | null;
  created_at: number;
  completed_at: number | null;
}

export interface RoundWithEnds extends Round {
  ends: EndData[];
  ends_completed: number;
}

export interface AiScoreResponse {
  end_id: string;
  arrows: Arrow[];
  total: number;
  x_count: number;
  confidence: number;
  notes: string;
  image_key: string;
}
