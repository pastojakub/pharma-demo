import Cookies from 'js-cookie';

const COOKIE_OPTIONS = { expires: 1, path: '/' };
const COOKIE_NAMES = ['auth_token', 'user_role', 'user_email', 'user_org'] as const;

export const authCookies = {
  set: (token: string, role: string, email: string, org: string) => {
    Cookies.set('auth_token', token, COOKIE_OPTIONS);
    Cookies.set('user_role', role, COOKIE_OPTIONS);
    Cookies.set('user_email', email, COOKIE_OPTIONS);
    Cookies.set('user_org', org, COOKIE_OPTIONS);
  },
  get: () => ({
    token: Cookies.get('auth_token'),
    role: Cookies.get('user_role'),
    email: Cookies.get('user_email'),
    org: Cookies.get('user_org'),
  }),
  clear: () => {
    COOKIE_NAMES.forEach((name) => Cookies.remove(name, { path: '/' }));
  },
};
