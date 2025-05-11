import { handleAuthClick, checkAuth } from './auth.js';
import { handleExpenseSubmit, handleAddPartySubmit, showAddPartyModal, initTheme, toggleTheme, switchTab } from './ui.js';
import { loadExpenses } from './expenses.js';

// Google Sheets API configuration
const SPREADSHEET_ID = '1Hj_kCide2ZJbpSKltBGS_wjLyqzYdZM7if0bBgZu2d0';
const SHEET_NAME = 'Expenses';
const CLIENT_ID = '683998895208-c0eappqqhfum6g4s05iq91nkj0e9j98t.apps.googleusercontent.com';
const REDIRECT_URI = 'https://manishkushwaha.dev/expansetracker/';

// Initialize the application
function initializeApp() {
    try {
        // Initialize theme
        initTheme();

        // Set up event listeners
        document.getElementById('expenseForm')?.addEventListener('submit', handleExpenseSubmit);
        document.getElementById('addPartyForm')?.addEventListener('submit', handleAddPartySubmit);
        document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);

        // Add party modal buttons
        document.querySelectorAll('.add-party-btn').forEach(btn => {
            btn.addEventListener('click', () => showAddPartyModal(btn.dataset.target));
        });

        // Tab switching
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => switchTab(button.getAttribute('data-tab')));
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('addPartyModal');
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        // Check authentication status
        checkAuth();

        // Load initial data
        loadExpenses();
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Authentication functions
function handleAuthClick() {
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=token&scope=https://www.googleapis.com/auth/spreadsheets&include_granted_scopes=true`;
    window.location.href = authUrl;
}

function showLoginButton() {
    const appContent = document.querySelector('.app-content');
    const authSection = document.getElementById('authSection');
    const tabs = document.querySelector('.tabs');
    const tabContent = document.querySelector('.tab-content');
    
    appContent.classList.remove('authenticated');
    authSection.style.display = 'block';
    tabs.style.display = 'none';
    tabContent.style.display = 'none';
}

function isAuthenticated() {
    return !!localStorage.getItem('access_token');
}

function handleAuthCallback() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    
    if (accessToken) {
        localStorage.setItem('access_token', accessToken);
        window.location.hash = '';
        showAuthenticatedContent();
        loadExpenses();
    }
}

function showAuthenticatedContent() {
    const appContent = document.querySelector('.app-content');
    const authSection = document.getElementById('authSection');
    const tabs = document.querySelector('.tabs');
    const tabContent = document.querySelector('.tab-content');
    
    appContent.classList.add('authenticated');
    authSection.style.display = 'none';
    tabs.style.display = 'flex';
    tabContent.style.display = 'block';
}

async function checkAuth() {
    const token = localStorage.getItem('access_token');
    
    if (token) {
        try {
            await loadExpenses();
            showAuthenticatedContent();
        } catch (error) {
            localStorage.removeItem('access_token');
            showLoginButton();
        }
    } else {
        showLoginButton();
    }
}

// API functions
async function addExpense(expense) {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:E:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('access_token')
        },
        body: JSON.stringify({
            values: [[
                expense.date,
                expense.spender,
                expense.receiver,
                expense.amount,
                expense.remarks
            ]]
        })
    });

    if (!response.ok) {
        if (response.status === 401) {
            localStorage.removeItem('access_token');
            showLoginButton();
            throw new Error('Please sign in again');
        }
        throw new Error('Failed to add expense');
    }
}

async function loadExpenses() {
    try {
        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:E`, {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('access_token')
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('access_token');
                showLoginButton();
                throw new Error('Please sign in again');
            }
            throw new Error('Failed to load expenses');
        }

        const data = await response.json();
        const expenses = data.values || [];
        
        // Update UI elements
        updatePartyDropdowns(expenses);
        displayExpenses(expenses);
        updatePartyFilter(expenses);
        
        return expenses;
    } catch (error) {
        console.error('Error loading expenses:', error);
        const expensesList = document.getElementById('expensesList');
        expensesList.innerHTML = '<p class="error-message">Error loading expenses. Please try again.</p>';
        throw error;
    }
}

// UI helper functions
function showAddPartyModal(targetField) {
    const modal = document.getElementById('addPartyModal');
    modal.dataset.target = targetField;
    modal.style.display = 'block';
    document.getElementById('newPartyName').focus();
}

function addPartyToDropdowns(partyName) {
    const spenderSelect = document.getElementById('spender');
    const receiverSelect = document.getElementById('receiver');
    
    if (!Array.from(spenderSelect.options).some(option => option.value === partyName)) {
        spenderSelect.add(new Option(partyName, partyName));
    }
    
    if (!Array.from(receiverSelect.options).some(option => option.value === partyName)) {
        receiverSelect.add(new Option(partyName, partyName));
    }
}

function updatePartyDropdowns(expenses) {
    const parties = new Set();
    const startIndex = expenses[0]?.[0] === 'Date' ? 1 : 0;
    
    expenses.slice(startIndex).forEach(expense => {
        const [_, spender, receiver] = expense;
        parties.add(spender);
        parties.add(receiver);
    });
    
    parties.forEach(party => addPartyToDropdowns(party));
}

function displayExpenses(expenses) {
    const expensesList = document.getElementById('expensesList');
    if (!expensesList) return;

    expensesList.innerHTML = '';

    // Skip header row if it exists
    const startIndex = expenses[0]?.[0] === 'Date' ? 1 : 0;

    if (expenses.length <= startIndex) {
        expensesList.innerHTML = '<p class="no-expenses">No expenses recorded yet.</p>';
        return;
    }

    expenses.slice(startIndex).reverse().forEach(expense => {
        const [date, spender, receiver, amount, remarks] = expense;
        const expenseElement = document.createElement('div');
        expenseElement.className = 'expense-item';
        expenseElement.innerHTML = `
            <p><strong>Date:</strong> ${new Date(date).toLocaleDateString()}</p>
            <p><strong>Spender:</strong> ${spender}</p>
            <p><strong>Receiver:</strong> ${receiver}</p>
            <p class="amount"><strong>Amount:</strong> ₹${parseFloat(amount).toFixed(2)}</p>
            ${remarks ? `<p class="remarks"><strong>Remarks:</strong> ${remarks}</p>` : ''}
        `;
        expensesList.appendChild(expenseElement);
    });
}

function updatePartyFilter(expenses) {
    const filter = document.getElementById('summaryPartyFilter');
    if (!filter) {
        console.error('Summary party filter element not found');
        return;
    }

    try {
        // Get unique parties from expenses
        const parties = new Set();
        const startIndex = expenses[0]?.[0] === 'Date' ? 1 : 0;
        
        expenses.slice(startIndex).forEach(expense => {
            const [_, spender, receiver] = expense;
            if (spender) parties.add(spender);
            if (receiver) parties.add(receiver);
        });

        // Sort parties alphabetically
        const sortedParties = Array.from(parties).sort();

        // Store current selection
        const currentSelection = filter.value;

        // Update dropdown options
        filter.innerHTML = `
            <option value="all">All Parties</option>
            ${sortedParties.map(party => `<option value="${party}">${party}</option>`).join('')}
        `;

        // Restore selection if it still exists
        if (currentSelection && sortedParties.includes(currentSelection)) {
            filter.value = currentSelection;
        }

        // Remove existing event listener if any
        const newFilter = filter.cloneNode(true);
        filter.parentNode.replaceChild(newFilter, filter);

        // Add new event listener
        newFilter.addEventListener('change', () => {
            console.log('Party filter changed to:', newFilter.value);
            updateSummary();
        });
    } catch (error) {
        console.error('Error updating party filter:', error);
    }
}

// Theme functions
function initTheme() {
    const theme = localStorage.getItem('theme') || 
                 (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Check for OAuth callback
if (window.location.hash) {
    handleAuthCallback();
}

// Function to update summary
async function updateSummary() {
    const partyFilter = document.getElementById('summaryPartyFilter');
    const summaryContent = document.getElementById('summaryContent');
    
    if (!partyFilter || !summaryContent) {
        console.error('Summary elements not found');
        return;
    }

    try {
        // Show loading state
        summaryContent.innerHTML = '<div class="loading">Loading summary...</div>';

        const expenses = await loadExpenses();
        const selectedParty = partyFilter.value;
        console.log('Selected party:', selectedParty);
        
        // Filter expenses based on selected party
        const filteredExpenses = selectedParty === 'all' 
            ? expenses 
            : expenses.filter(expense => {
                const [_, spender, receiver] = expense;
                return spender === selectedParty || receiver === selectedParty;
            });

        console.log('Filtered expenses:', filteredExpenses.length);
        const summary = calculateSummary(filteredExpenses);
        displaySummary(summary, summaryContent);
    } catch (error) {
        console.error('Error updating summary:', error);
        summaryContent.innerHTML = '<p class="error-message">Error loading summary. Please try again.</p>';
    }
}

// Function to calculate summary
function calculateSummary(expenses) {
    const summary = {
        total: 0,
        byParty: {},
        byCategory: {}
    };

    try {
        // Skip header row if it exists
        const startIndex = expenses[0]?.[0] === 'Date' ? 1 : 0;

        expenses.slice(startIndex).forEach(expense => {
            const [_, spender, receiver, amount, remarks] = expense;
            const amountNum = parseFloat(amount) || 0;
            
            // Update total
            summary.total += amountNum;

            // Update party summary
            if (!summary.byParty[spender]) {
                summary.byParty[spender] = { spent: 0, received: 0, balance: 0 };
            }
            if (!summary.byParty[receiver]) {
                summary.byParty[receiver] = { spent: 0, received: 0, balance: 0 };
            }

            summary.byParty[spender].spent += amountNum;
            summary.byParty[spender].balance -= amountNum;
            summary.byParty[receiver].received += amountNum;
            summary.byParty[receiver].balance += amountNum;

            // Update category summary
            const category = remarks || 'Uncategorized';
            if (!summary.byCategory[category]) {
                summary.byCategory[category] = 0;
            }
            summary.byCategory[category] += amountNum;
        });

        return summary;
    } catch (error) {
        console.error('Error calculating summary:', error);
        return {
            total: 0,
            byParty: {},
            byCategory: {}
        };
    }
}

// Function to display summary
function displaySummary(summary, container) {
    try {
        const partyList = Object.entries(summary.byParty)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([party, data]) => `
                <div class="summary-item">
                    <span class="summary-label">${party}</span>
                    <div class="summary-details">
                        <span class="summary-value negative">Spent: ₹${data.spent.toFixed(2)}</span>
                        <span class="summary-value positive">Received: ₹${data.received.toFixed(2)}</span>
                        <span class="summary-value ${data.balance >= 0 ? 'positive' : 'negative'}">
                            Balance: ₹${Math.abs(data.balance).toFixed(2)}
                            ${data.balance >= 0 ? '(Net Received)' : '(Net Spent)'}
                        </span>
                    </div>
                </div>
            `)
            .join('');

        const categoryList = Object.entries(summary.byCategory)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([category, amount]) => `
                <div class="summary-item">
                    <span class="summary-label">${category}</span>
                    <span class="summary-value">₹${amount.toFixed(2)}</span>
                </div>
            `)
            .join('');

        container.innerHTML = `
            <div class="summary-section">
                <h3>Total Expenses</h3>
                <div class="summary-total">₹${summary.total.toFixed(2)}</div>
            </div>
            <div class="summary-section">
                <h3>Party-wise Summary</h3>
                <div class="summary-list">
                    ${partyList}
                </div>
            </div>
            <div class="summary-section">
                <h3>Category-wise Summary</h3>
                <div class="summary-list">
                    ${categoryList}
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error displaying summary:', error);
        container.innerHTML = '<p class="error-message">Error displaying summary. Please try again.</p>';
    }
} 