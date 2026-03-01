import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
export const API_URL = `${API_BASE_URL}/api`;

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Lead APIs
export const leadsApi = {
  getAll: (params?: { status?: string; rep_id?: string; min_score?: number }) =>
    api.get('/leads', { params }),
  getOne: (id: string) => api.get(`/leads/${id}`),
  create: (data: any) => api.post('/leads', data),
  update: (id: string, data: any) => api.put(`/leads/${id}`, data),
  rescore: (id: string) => api.post(`/leads/${id}/rescore`),
};

// Territory APIs
export const territoriesApi = {
  getAll: (params?: { rep_id?: string }) => api.get('/territories', { params }),
  getOne: (id: string) => api.get(`/territories/${id}`),
  create: (data: any) => api.post('/territories', data),
  update: (id: string, data: any) => api.put(`/territories/${id}`, data),
  getHeatmapData: () => api.get('/territories/heatmap/data'),
};

// Rep APIs
export const repsApi = {
  getAll: () => api.get('/reps'),
  getOne: (id: string) => api.get(`/reps/${id}`),
  create: (data: any) => api.post('/reps', data),
  update: (id: string, data: any) => api.put(`/reps/${id}`, data),
  getLeaderboard: () => api.get('/leaderboard'),
};

// Appointment APIs
export const appointmentsApi = {
  getAll: (params?: { rep_id?: string; status?: string; date?: string }) =>
    api.get('/appointments', { params }),
  getToday: (repId: string) => api.get(`/appointments/today/${repId}`),
  create: (data: any) => api.post('/appointments', data),
  update: (id: string, data: any) => api.put(`/appointments/${id}`, data),
};

// Installation APIs
export const installationsApi = {
  getAll: (params?: { rep_id?: string; territory_id?: string; status?: string }) =>
    api.get('/installations', { params }),
  create: (data: any) => api.post('/installations', data),
  update: (id: string, data: any) => api.put(`/installations/${id}`, data),
};

// Analytics APIs
export const analyticsApi = {
  getDashboard: (repId: string) => api.get(`/analytics/dashboard/${repId}`),
  getRevenue: () => api.get('/analytics/revenue'),
  getPerformance: () => api.get('/analytics/performance'),
};

// Partner APIs
export const partnersApi = {
  getAll: () => api.get('/partners'),
  getOne: (id: string) => api.get(`/partners/${id}`),
  getDashboard: (id: string) => api.get(`/partners/${id}/dashboard`),
  create: (data: any) => api.post('/partners', data),
  update: (id: string, data: any) => api.put(`/partners/${id}`, data),
};

// Ledger APIs (Blockchain)
export const ledgerApi = {
  getAll: (params?: { limit?: number; transaction_type?: string }) =>
    api.get('/ledger', { params }),
  getSummary: () => api.get('/ledger/summary'),
  verify: () => api.get('/ledger/verify'),
  addEntry: (data: any) => api.post('/ledger/entry', null, { params: data }),
};

// Compliance APIs
export const complianceApi = {
  getPermits: (params?: { status?: string; permit_type?: string; installation_id?: string }) =>
    api.get('/permits', { params }),
  getPermit: (id: string) => api.get(`/permits/${id}`),
  createPermit: (data: any) => api.post('/permits', data),
  updatePermit: (id: string, data: any) => api.put(`/permits/${id}`, data),
  getStatus: () => api.get('/compliance/status'),
};

// Forecast APIs
export const forecastApi = {
  getOverall: (months?: number) => api.get('/forecast/overall', { params: { months } }),
  getTerritory: (territoryId: string, months?: number) =>
    api.get(`/forecast/territory/${territoryId}`, { params: { months } }),
  generate: (data: { territory_id?: string; months_ahead?: number }) =>
    api.post('/forecast', data),
};

// SMS APIs
export const smsApi = {
  getStatus: () => api.get('/sms/status'),
  send: (data: { to_phone: string; message: string }) => api.post('/sms/send', data),
  sendLeadFollowup: (leadId: string) => api.post(`/sms/lead-followup/${leadId}`),
  sendAppointmentReminder: (appointmentId: string) =>
    api.post(`/sms/appointment-reminder/${appointmentId}`),
};

// Seed API (for development)
export const seedApi = {
  seed: () => api.post('/seed'),
};

export default api;
