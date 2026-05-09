import api from './index';

export const templatesApi = {
  getList: (params) => api.get('/templates', { params }),
  getOne: (id) => api.get(`/templates/${id}`),
  download: (id) => api.get(`/templates/${id}/download`, { responseType: 'blob' }),
  getFilled: (id) => api.get(`/templates/${id}/filled`, { responseType: 'blob' }),
  upload: (formData) => api.post('/templates', formData),
  update: (id, data) => api.patch(`/templates/${id}`, data),
  deactivate: (id) => api.delete(`/templates/${id}`),
};
