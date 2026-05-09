import api from './index';

export const requestsApi = {
  getList: (params) => api.get('/requests', { params }),
  getOne: (id) => api.get(`/requests/${id}`),
  create: (data) => api.post('/requests', data),
  updateStatus: (id, data) => api.patch(`/requests/${id}/status`, data),
  addComment: (id, text) => api.post(`/requests/${id}/comment`, { text }),
  remove: (id) => api.delete(`/requests/${id}`),
  getFilled: (id) => api.get(`/requests/${id}/filled`, { responseType: 'blob' }),
};
