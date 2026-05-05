import api from '../lib/api';
import type { FileMetadata } from '../types';

export const uploadService = {
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<FileMetadata>('/upload/file', formData);
  },

  uploadMultiple: (files: File[]) => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    return api.post<FileMetadata[]>('/upload/multiple', formData);
  },
};
