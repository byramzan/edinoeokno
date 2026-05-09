import api from './index';

export const attachmentsApi = {
  upload: (requestId, file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/requests/${requestId}/attachments`, form);
  },
  download: (requestId, fileId) =>
    api.get(`/requests/${requestId}/attachments/${fileId}`, { responseType: 'blob' }),
  remove: (requestId, fileId) =>
    api.delete(`/requests/${requestId}/attachments/${fileId}`),
  uploadResult: (requestId, file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/requests/${requestId}/result`, form);
  },
};
