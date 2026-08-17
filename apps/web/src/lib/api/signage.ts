import { apiRequest } from '@/lib/api-client';

export interface SignageContent { id: string; title: string; description?: string; mediaType: string; mediaUrl: string; thumbnailUrl?: string; duration: number; status: string; siteId?: string; site?: { id: string; name: string }; playlist?: { id: string; name: string }; approvals?: Approval[]; [key: string]: unknown }
export interface Approval { id: string; status: string; comment?: string; createdAt: string; approvedBy?: { firstName?: string; lastName?: string } }
export interface Playlist { id: string; name: string; siteId?: string; site?: { id: string; name: string }; contents?: SignageContent[]; _count?: { contents?: number }; [key: string]: unknown }
export interface Schedule { id: string; siteId: string; playlistId: string; dayOfWeek: number[]; startTime: string; endTime: string; playlist?: Playlist; [key: string]: unknown }
export interface Screen { id: string; name?: string; siteId: string; lastHeartbeat?: string; status?: string; [key: string]: unknown }
const qs = (p: Record<string, unknown> = {}) => { const s = new URLSearchParams(); Object.entries(p).forEach(([k,v]) => v !== undefined && v !== '' && s.set(k, String(v))); const q=s.toString(); return q ? `?${q}` : ''; };
export const getSignageContent = (params: Record<string, unknown> = {}) => apiRequest<{ items: SignageContent[]; total: number }>(`/signage/content${qs(params)}`);
export const getSignageContentItem = (id: string) => apiRequest<SignageContent>(`/signage/content/${id}`);
export const createSignageContent = (data: Record<string, unknown>) => apiRequest<SignageContent>('/signage/content', { method:'POST', body:JSON.stringify(data) });
export const updateSignageContent = (id:string,data:Record<string,unknown>) => apiRequest<SignageContent>(`/signage/content/${id}`, { method:'PATCH', body:JSON.stringify(data) });
const transition = (id:string, action:string, body?: unknown) => apiRequest<SignageContent>(`/signage/content/${id}/${action}`, { method:'POST', body: body ? JSON.stringify(body) : undefined });
export const submitContent = (id:string) => transition(id,'submit');
export const approveContent = (id:string) => transition(id,'approve');
export const rejectContent = (id:string, comment:string) => transition(id,'reject',{comment});
export const goLiveContent = (id:string) => transition(id,'go-live');
export const expireContent = (id:string) => transition(id,'expire');
export const getPlaylists = (params:Record<string,unknown> = {}) => apiRequest<Playlist[]>(`/signage/playlists${qs(params)}`);
export const createPlaylist = (data:Record<string,unknown>) => apiRequest<Playlist>('/signage/playlists',{method:'POST',body:JSON.stringify(data)});
export const addContentToPlaylist = (playlistId:string,contentId:string) => apiRequest<Playlist>(`/signage/playlists/${playlistId}/content`,{method:'POST',body:JSON.stringify({contentId})});
export const getSchedules = (params:Record<string,unknown> = {}) => apiRequest<Schedule[]>(`/signage/schedules/${params.siteId ?? ''}`);
export const createSchedule = (data:Record<string,unknown>) => apiRequest<Schedule>('/signage/schedules',{method:'POST',body:JSON.stringify(data)});
export const deleteSchedule = (id:string) => apiRequest(`/signage/schedules/${id}`,{method:'DELETE'});
export const getActiveSignage = (siteId:string) => apiRequest<SignageContent[]>(`/signage/active/${siteId}`);
export const getScreens = (params:Record<string,unknown> = {}) => apiRequest<Screen[]>(`/signage/screens/${params.siteId ?? ''}`);
export const screenHeartbeat = (data:Record<string,unknown>) => apiRequest('/signage/screens/heartbeat',{method:'POST',body:JSON.stringify(data)});
