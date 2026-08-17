/**
 * OmniOps Customer App — Surveys API client.
 *
 * Talks to the public (no-auth) survey endpoints of the OmniOps API:
 *   GET  /api/surveys/public/:publicSlug
 *   POST /api/surveys/public/:publicSlug/responses
 *
 * Base URL resolution:
 *   process.env.EXPO_PUBLIC_API_URL  — set at bundle time (Metro inlines it).
 *   Defaults to http://localhost:4000/api (works for iOS simulator / Expo Go
 *   on the same machine as the API). On a physical device set
 *   EXPO_PUBLIC_API_URL to the machine's LAN address, e.g.
 *   EXPO_PUBLIC_API_URL=http://192.168.1.50:4000/api
 */
import { SurveyQuestionType } from '@omniops/shared';

export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api';

// ─── Types (mirror of the API's sanitized public payload) ───

export interface SurveyOption {
  id: string;
  label: string;
  value: string;
}

export interface SurveyQuestion {
  id: string;
  type: SurveyQuestionType;
  prompt: string;
  required: boolean;
  order: number;
  options: SurveyOption[];
}

export interface PublicSurvey {
  id: string;
  title: string;
  siteName: string;
  channel: string;
  questions: SurveyQuestion[];
}

export interface SubmitAnswer {
  questionId: string;
  answerText?: string;
  ratingValue?: number;
  choiceValues?: string[];
}

export interface SubmittedResponse {
  id: string;
  submittedAt: string;
}

export interface ApiErrorBody {
  success: false;
  data: null;
  error: { code: string; message: string };
}

/** Error thrown by the API client with a human-friendly message. */
export class ApiRequestError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

async function parseError(res: Response): Promise<ApiRequestError> {
  let message = `Request failed (${res.status})`;
  try {
    const body = (await res.json()) as Partial<ApiErrorBody>;
    message = body?.error?.message ?? message;
  } catch {
    // Non-JSON error body — keep the generic message.
  }
  return new ApiRequestError(message, res.status);
}

export async function fetchPublicSurvey(publicSlug: string): Promise<PublicSurvey> {
  const res = await fetch(
    `${API_BASE_URL}/surveys/public/${encodeURIComponent(publicSlug)}`,
    {
      method: 'GET',
      headers: { Accept: 'application/json' },
    },
  );
  if (!res.ok) {
    throw await parseError(res);
  }
  const body = (await res.json()) as { success: boolean; data: PublicSurvey };
  return body.data;
}

export async function submitSurveyResponse(
  publicSlug: string,
  answers: SubmitAnswer[],
): Promise<SubmittedResponse> {
  const res = await fetch(
    `${API_BASE_URL}/surveys/public/${encodeURIComponent(publicSlug)}/responses`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ answers }),
    },
  );
  if (!res.ok) {
    throw await parseError(res);
  }
  const body = (await res.json()) as { success: boolean; data: SubmittedResponse };
  return body.data;
}

/**
 * Accepts a raw user input (survey code, full link, or deep link) and returns
 * the publicSlug, or null if none can be found.
 *   sv-msj7wp4k-3eaf43
 *   https://host/survey/sv-msj7wp4k-3eaf43
 *   omniops://s/sv-msj7wp4k-3eaf43
 *   https://host/?survey=sv-msj7wp4k-3eaf43
 */
export function extractSurveySlug(input: string): string | null {
  const trimmed = input.trim().replace(/\/+$/, '');
  if (!trimmed) return null;

  if (/^sv-[A-Za-z0-9-]+$/.test(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(/(sv-[A-Za-z0-9-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}
