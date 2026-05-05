import api from '../lib/api';

interface LoginResponse {
  access_token: string;
  role: string;
  email: string;
  org: string;
}

export const authService = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }),
};
