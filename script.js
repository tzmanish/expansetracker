// Google Sheets API configuration
const SPREADSHEET_ID = '1Hj_kCide2ZJbpSKltBGS_wjLyqzYdZM7if0bBgZu2d0';
const SHEET_NAME = 'Expenses';
const CLIENT_ID = '683998895208-c0eappqqhfum6g4s05iq91nkj0e9j98t.apps.googleusercontent.com';
const REDIRECT_URI = 'https://manishkushwaha.dev/expansetracker/';

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Wait for a short delay to ensure all elements are rendered
    setTimeout(() => {
        initializeApp();
        checkAuth();
    }, 100);
});

// Initialize app components
function initializeApp() {
    try {
        const form = document.getElementById('expenseForm');
        const addPartyForm = document.getElementById('addPartyForm');
        const modal = document.getElementById('addPartyModal');
        const closeBtn = document.querySelector('.close');
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabPanes = document.querySelectorAll('.tab-pane');

        // Validate all required elements exist
        const requiredElements = {
            form,
            addPartyForm,
            modal,
            closeBtn,
            tabButtons,
            tabPanes
        };

        const missingElements = Object.entries(requiredElements)
            .filter(([_, element]) => !element || (Array.isArray(element) && element.length === 0))
            .map(([name]) => name);

        if (missingElements.length > 0) {
            console.error('Missing required elements:', missingElements);
            return;
        }

        // Initialize tabs
        tabButtons.forEach(button => {
            const target = button.getAttribute('data-tab');
            if (!target) {
                console.error('Tab button missing data-tab attribute:', button);
                return;
            }

            // Verify corresponding tab pane exists
            const tabPane = document.querySelector(`.tab-pane[data-tab="${target}"]`);
            if (!tabPane) {
                console.error(`Tab pane not found for tab: ${target}`);
                return;
            }

            button.addEventListener('click', () => switchTab(target));
        });

        // Handle form submission
        form.addEventListener('submit', handleExpenseSubmit);
        addPartyForm.addEventListener('submit', handleAddPartySubmit);

        // Close modal when clicking the close button or outside
        closeBtn.onclick = () => modal.style.display = 'none';
        window.onclick = (e) => {
            if (e.target === modal) modal.style.display = 'none';
        };

        // Initialize theme
        initTheme();
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', toggleTheme);
        }

        // Set initial active tab
        const initialTab = document.querySelector('.tab-button.active');
        if (initialTab) {
            const target = initialTab.getAttribute('data-tab');
            if (target) {
                switchTab(target);
            }
        } else {
            // If no active tab is set, activate the first tab
            const firstTab = tabButtons[0];
            if (firstTab) {
                const target = firstTab.getAttribute('data-tab');
                if (target) {
                    switchTab(target);
                }
            }
        }
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

// Handle expense form submission
async function handleExpenseSubmit(e) {
    e.preventDefault();

    if (!isAuthenticated()) {
        alert('Please sign in to add expenses');
        return;
    }

    const formData = {
        spender: document.getElementById('spender').value,
        receiver: document.getElementById('receiver').value,
        amount: document.getElementById('amount').value,
        remarks: document.getElementById('remarks').value,
        date: new Date().toISOString()
    };

    try {
        await addExpense(formData);
        e.target.reset();
        await loadExpenses();
    } catch (error) {
        console.error('Error adding expense:', error);
        alert('Failed to add expense. Please try again.');
    }
}

// Handle add party form submission
function handleAddPartySubmit(e) {
    e.preventDefault();
    const newPartyName = document.getElementById('newPartyName').value;
    const targetField = e.target.closest('.modal').dataset.target;
    
    addPartyToDropdowns(newPartyName);
    document.getElementById(targetField).value = newPartyName;
    
    e.target.closest('.modal').style.display = 'none';
    e.target.reset();
}

// Switch between tabs
function switchTab(target) {
    try {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabPanes = document.querySelectorAll('.tab-pane');
        
        if (!tabButtons.length || !tabPanes.length) {
            console.error('Tab elements not found');
            return;
        }
        
        // Find the target elements
        const selectedButton = Array.from(tabButtons).find(btn => btn.getAttribute('data-tab') === target);
        const selectedPane = Array.from(tabPanes).find(pane => pane.getAttribute('data-tab') === target);
        
        if (!selectedButton || !selectedPane) {
            console.error(`Tab elements for "${target}" not found`);
            return;
        }
        
        // Update active states
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.remove('active'));
        
        // Activate selected tab
        selectedButton.classList.add('active');
        selectedPane.classList.add('active');
        
        // Update content based on selected tab
        if (target === 'summary') {
            updateSummary();
        } else if (target === 'expenses') {
            loadExpenses();
        }
    } catch (error) {
        console.error('Error switching tabs:', error);
    }
}

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

        // Update dropdown options
        filter.innerHTML = `
            <option value="all">All Parties</option>
            ${sortedParties.map(party => `<option value="${party}">${party}</option>`).join('')}
        `;

        // Add change event listener if not already present
        if (!filter.hasEventListener) {
            filter.addEventListener('change', () => updateSummary());
            filter.hasEventListener = true;
        }
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
        
        // Filter expenses based on selected party
        const filteredExpenses = selectedParty === 'all' 
            ? expenses 
            : expenses.filter(expense => {
                const [_, spender, receiver] = expense;
                return spender === selectedParty || receiver === selectedParty;
            });

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