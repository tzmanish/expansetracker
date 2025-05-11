import { CLIENT_ID, REDIRECT_URI } from './config.js';

// Authentication state
let isAuthenticated = false;

// Authentication functions
export function handleAuthClick() {
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=token&scope=https://www.googleapis.com/auth/spreadsheets&include_granted_scopes=true`;
    window.location.href = authUrl;
}

export function showLoginButton() {
    const appContent = document.querySelector('.app-content');
    const authSection = document.getElementById('authSection');
    const tabs = document.querySelector('.tabs');
    const tabContent = document.querySelector('.tab-content');
    
    appContent.classList.remove('authenticated');
    authSection.style.display = 'block';
    tabs.style.display = 'none';
    tabContent.style.display = 'none';
    isAuthenticated = false;
}

export function isUserAuthenticated() {
    return !!localStorage.getItem('access_token');
}

export function handleAuthCallback() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    
    if (accessToken) {
        localStorage.setItem('access_token', accessToken);
        window.location.hash = '';
        showAuthenticatedContent();
        return true;
    }
    return false;
}

export function showAuthenticatedContent() {
    const appContent = document.querySelector('.app-content');
    const authSection = document.getElementById('authSection');
    const tabs = document.querySelector('.tabs');
    const tabContent = document.querySelector('.tab-content');
    
    appContent.classList.add('authenticated');
    authSection.style.display = 'none';
    tabs.style.display = 'flex';
    tabContent.style.display = 'block';
    isAuthenticated = true;
}

export async function checkAuth() {
    const token = localStorage.getItem('access_token');
    
    if (token) {
        try {
            showAuthenticatedContent();
            return true;
        } catch (error) {
            localStorage.removeItem('access_token');
            showLoginButton();
            return false;
        }
    } else {
        showLoginButton();
        return false;
    }
}

export function getAuthToken() {
    return localStorage.getItem('access_token');
}

export function clearAuth() {
    localStorage.removeItem('access_token');
    showLoginButton();
} 