import api from './index';

export const docTypesApi = {
  getList: () => api.get('/doc-types'),
  getOne: (id) => api.get(`/doc-types/${id}`),
};
