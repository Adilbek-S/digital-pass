import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export default api;

// ── Auth ────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
};

// ── Reference ──────────────────────────────────────────────────────────
export const refApi = {
  departments: () => api.get("/reference/departments"),
  countries: () => api.get("/reference/countries"),
  employees: (departmentId?: number) =>
    api.get("/reference/employees", { params: { department_id: departmentId } }),
};

// ── Visits ─────────────────────────────────────────────────────────────
export const visitApi = {
  createPublic: (data: Record<string, unknown>) => api.post("/visits/public", data),
  createInvite: (data: Record<string, unknown>) => api.post("/visits/invite", data),
  list: (params?: Record<string, unknown>) => api.get("/visits", { params }),
  get: (id: number) => api.get(`/visits/${id}`),
  status: (token: string) => api.get(`/visits/status/${token}`),
  cancel: (token: string) => api.post(`/visits/status/${token}/cancel`),
  update: (token: string, data: Record<string, unknown>) =>
    api.patch(`/visits/status/${token}/update`, data),
  approve: (id: number) => api.post(`/visits/${id}/approve`),
  reject: (id: number, reason: string) =>
    api.post(`/visits/${id}/reject`, null, { params: { reason } }),
  revoke: (id: number, reason: string) =>
    api.post(`/visits/${id}/revoke`, null, { params: { reason } }),
  requestChanges: (id: number, note: string) =>
    api.post(`/visits/${id}/request-changes`, null, { params: { note } }),
  myPending: () => api.get("/visits/my-pending"),
  myToday: () => api.get("/visits/my-today"),
  uploadDocument: (token: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post(`/visits/public/${token}/upload`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// ── Guard ──────────────────────────────────────────────────────────────
export const guardApi = {
  scan: (qr_token: string) => api.post("/guard/scan", null, { params: { qr_token } }),
  lookup: (visitId: number) => api.post(`/guard/lookup/${visitId}`),
  checkin: (visitId: number) => api.post(`/guard/checkin/${visitId}`),
  checkout: (visitId: number) => api.post(`/guard/checkout/${visitId}`),
};

// ── Reports ────────────────────────────────────────────────────────────
export const reportsApi = {
  byDate: (date: string) => api.get("/reports/visitors-by-date", { params: { target_date: date } }),
  inside: () => api.get("/reports/inside-now"),
  history: (from?: string, to?: string) =>
    api.get("/reports/history", { params: { from_date: from, to_date: to } }),
  avgApproval: () => api.get("/reports/approval-time"),
  rejected: () => api.get("/reports/rejected"),
  noShows: () => api.get("/reports/no-shows"),
};

// ── Admin ──────────────────────────────────────────────────────────────
export const adminApi = {
  users: () => api.get("/admin/users"),
  createUser: (data: Record<string, unknown>) => api.post("/admin/users", data),
  updateUser: (id: number, data: Record<string, unknown>) =>
    api.patch(`/admin/users/${id}`, data),
  deactivate: (id: number) => api.delete(`/admin/users/${id}`),
  departments: () => api.get("/admin/departments"),
  createDept: (name: string, code: string) =>
    api.post("/admin/departments", null, { params: { name, code } }),
  updateDept: (id: number, data: Record<string, unknown>) =>
    api.patch(`/admin/departments/${id}`, data),
};
