import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LoginPage from './LoginPage';
import { MemoryRouter } from 'react-router-dom';

// Mocks
const mockLogin = vi.fn();
const mockGoogleLogin = vi.fn();
const mockLogout = vi.fn();
const mockNavigate = vi.fn();

// Mock useAuth
vi.mock('../contexts/AuthContext', () => ({
    useAuth: () => ({
        login: mockLogin,
        logout: mockLogout,
        user: global.mockUser || null, // Dynamic user state
    }),
}));

// Mock API
vi.mock('../services/api', () => ({
    googleLogin: (...args) => mockGoogleLogin(...args),
}));

// Mock Router
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useSearchParams: () => [new URLSearchParams(global.mockSearchParams || ''), vi.fn()],
        useLocation: () => ({ pathname: '/login', state: {} }),
    };
});

// Mock window.location
Object.defineProperty(window, 'location', {
    value: {
        href: '',
        origin: 'http://localhost:3000',
    },
    writable: true,
});

describe('LoginPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.mockUser = null;
        global.mockSearchParams = '';
        window.location.href = '';
        localStorage.clear();
    });

    it('renders login form', () => {
        render(
            <MemoryRouter>
                <LoginPage />
            </MemoryRouter>
        );
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('saves redirect_uri to localStorage when clicking Google Sign In', () => {
        global.mockSearchParams = 'redirect_uri=http://external-app.com';
        render(
            <MemoryRouter>
                <LoginPage />
            </MemoryRouter>
        );

        const googleBtn = screen.getByText(/sign in with google/i);
        fireEvent.click(googleBtn);

        expect(localStorage.getItem('auth_redirect_uri')).toBe('http://external-app.com');
        expect(mockGoogleLogin).toHaveBeenCalledWith('http://external-app.com', null);
    });

    it('redirects to external app if user is already logged in and redirect_uri is in params', () => {
        global.mockUser = { email: 'test@example.com' };
        global.mockSearchParams = 'redirect_uri=http://external-app.com';
        localStorage.setItem('accessToken', 'mock-token-123');

        render(
            <MemoryRouter>
                <LoginPage />
            </MemoryRouter>
        );

        // Expect window.location.href to be set
        expect(window.location.href).toBe('http://external-app.com#access_token=mock-token-123');
    });

    it('redirects to external app if user is already logged in and redirect_uri is in localStorage', () => {
        global.mockUser = { email: 'test@example.com' };
        localStorage.setItem('accessToken', 'mock-token-123');
        localStorage.setItem('auth_redirect_uri', 'http://stored-app.com');

        render(
            <MemoryRouter>
                <LoginPage />
            </MemoryRouter>
        );

        expect(window.location.href).toBe('http://stored-app.com#access_token=mock-token-123');
        expect(localStorage.getItem('auth_redirect_uri')).toBeNull(); // Should actully be removed? The code removes it.
    });
});
