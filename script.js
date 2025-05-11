// Google Sheets API configuration
const SPREADSHEET_ID = '1Hj_kCide2ZJbpSKltBGS_wjLyqzYdZM7if0bBgZu2d0';
const SHEET_NAME = 'Expenses';
const CLIENT_ID = '683998895208-c0eappqqhfum6g4s05iq91nkj0e9j98t.apps.googleusercontent.com';
const REDIRECT_URI = 'https://manishkushwaha.dev/expansetracker/';

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    checkAuth();
});

// Initialize app components
function initializeApp() {
    const form = document.getElementById('expenseForm');
    const addPartyForm = document.getElementById('addPartyForm');
    const modal = document.getElementById('addPartyModal');
    const closeBtn = document.querySelector('.close');
    const tabButtons = document.querySelectorAll('.tab-button');

    // Initialize tabs
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const target = button.getAttribute('data-tab');
            switchTab(target);
        });
    });

    // Handle form submission
    form.addEventListener('submit', handleExpenseSubmit);

    // Handle add party form submission
    addPartyForm.addEventListener('submit', handleAddPartySubmit);

    // Close modal when clicking the close button
    closeBtn.onclick = () => modal.style.display = 'none';

    // Close modal when clicking outside
    window.onclick = (e) => {
        if (e.target === modal) modal.style.display = 'none';
    };

    // Initialize theme
    initTheme();
    document.querySelector('.theme-toggle').addEventListener('click', toggleTheme);
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
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    // Update active states
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabPanes.forEach(pane => pane.classList.remove('active'));
    
    // Activate selected tab
    const selectedButton = document.querySelector(`.tab-button[data-tab="${target}"]`);
    const selectedPane = document.querySelector(`.tab-pane[data-tab="${target}"]`);
    
    if (selectedButton && selectedPane) {
        selectedButton.classList.add('active');
        selectedPane.classList.add('active');
        
        // Update content based on selected tab
        if (target === 'summary') {
            updateSummary();
        } else if (target === 'expenses') {
            loadExpenses();
        }
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
    const parties = new Set();
    
    const startIndex = expenses[0]?.[0] === 'Date' ? 1 : 0;
    
    expenses.slice(startIndex).forEach(expense => {
        const [_, spender, receiver] = expense;
        parties.add(spender);
        parties.add(receiver);
    });
    
    filter.innerHTML = '<option value="all">All Parties</option>' +
        Array.from(parties)
            .sort()
            .map(party => `<option value="${party}">${party}</option>`)
            .join('');
    
    filter.onchange = updateSummary;
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

// Function to toggle summary view
function toggleSummaryView() {
    const summarySection = document.getElementById('partySummary');
    const toggleButton = document.querySelector('.summary-toggle');
    
    if (summarySection.style.display === 'none') {
        summarySection.style.display = 'block';
        toggleButton.textContent = 'Hide Summary';
        updatePartySummary();
    } else {
        summarySection.style.display = 'none';
        toggleButton.textContent = 'Show Summary';
    }
}

// Function to update party summary
function updatePartySummary() {
    const expenses = getExpensesFromList();
    const partyFilter = document.getElementById('summaryPartyFilter').value;
    const summaryContent = document.getElementById('summaryContent');
    
    // Calculate summary
    const summary = calculatePartySummary(expenses, partyFilter);
    
    // Create summary table
    const table = document.createElement('table');
    table.className = 'summary-table';
    
    // Add header
    table.innerHTML = `
        <thead>
            <tr>
                <th>Party</th>
                <th>Total Spent</th>
                <th>Total Received</th>
                <th>Net Balance</th>
            </tr>
        </thead>
        <tbody>
            ${Object.entries(summary)
                .map(([party, data]) => `
                    <tr>
                        <td>${party}</td>
                        <td class="amount negative">₹${data.spent.toFixed(2)}</td>
                        <td class="amount positive">₹${data.received.toFixed(2)}</td>
                        <td class="amount ${data.balance >= 0 ? 'positive' : 'negative'}">
                            ₹${data.balance.toFixed(2)}
                        </td>
                    </tr>
                `).join('')}
        </tbody>
    `;
    
    // Add total row
    const totalRow = document.createElement('tr');
    totalRow.className = 'summary-total';
    const totals = calculateTotals(summary);
    totalRow.innerHTML = `
        <td>Total</td>
        <td class="amount negative">₹${totals.spent.toFixed(2)}</td>
        <td class="amount positive">₹${totals.received.toFixed(2)}</td>
        <td class="amount ${totals.balance >= 0 ? 'positive' : 'negative'}">
            ₹${totals.balance.toFixed(2)}
        </td>
    `;
    table.querySelector('tbody').appendChild(totalRow);
    
    // Update summary content
    summaryContent.innerHTML = '';
    summaryContent.appendChild(table);
}

// Function to get expenses from the list
function getExpensesFromList() {
    const expensesList = document.getElementById('expensesList');
    const expenses = [];
    
    expensesList.querySelectorAll('.expense-item').forEach(item => {
        const date = item.querySelector('p:nth-child(1)').textContent.split(': ')[1];
        const spender = item.querySelector('p:nth-child(2)').textContent.split(': ')[1];
        const receiver = item.querySelector('p:nth-child(3)').textContent.split(': ')[1];
        const amount = parseFloat(item.querySelector('.amount').textContent.split('₹')[1]);
        const remarks = item.querySelector('.remarks')?.textContent.split(': ')[1] || '';
        
        expenses.push([date, spender, receiver, amount, remarks]);
    });
    
    return expenses;
}

// Function to calculate party summary
function calculatePartySummary(expenses, partyFilter) {
    const summary = {};
    
    expenses.forEach(([_, spender, receiver, amount]) => {
        // Initialize party data if not exists
        if (!summary[spender]) {
            summary[spender] = { spent: 0, received: 0, balance: 0 };
        }
        if (!summary[receiver]) {
            summary[receiver] = { spent: 0, received: 0, balance: 0 };
        }
        
        // Update summary
        summary[spender].spent += amount;
        summary[spender].balance -= amount;
        summary[receiver].received += amount;
        summary[receiver].balance += amount;
    });
    
    // Filter by party if specified
    if (partyFilter !== 'all') {
        return { [partyFilter]: summary[partyFilter] };
    }
    
    return summary;
}

// Function to calculate totals
function calculateTotals(summary) {
    return Object.values(summary).reduce((totals, data) => ({
        spent: totals.spent + data.spent,
        received: totals.received + data.received,
        balance: totals.balance + data.balance
    }), { spent: 0, received: 0, balance: 0 });
}

// Function to update summary
async function updateSummary() {
    const partyFilter = document.getElementById('summaryPartyFilter');
    const summaryContent = document.getElementById('summaryContent');
    
    if (!partyFilter || !summaryContent) return;

    try {
        const expenses = await loadExpenses();
        const selectedParty = partyFilter.value;
        const filteredExpenses = selectedParty === 'all' 
            ? expenses 
            : expenses.filter(expense => expense[1] === selectedParty || expense[2] === selectedParty);

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

    // Skip header row if it exists
    const startIndex = expenses[0]?.[0] === 'Date' ? 1 : 0;

    expenses.slice(startIndex).forEach(expense => {
        const [_, spender, receiver, amount, remarks] = expense;
        const amountNum = parseFloat(amount);
        summary.total += amountNum;

        // Group by party (spender)
        if (!summary.byParty[spender]) {
            summary.byParty[spender] = 0;
        }
        summary.byParty[spender] += amountNum;

        // Group by party (receiver)
        if (!summary.byParty[receiver]) {
            summary.byParty[receiver] = 0;
        }
        summary.byParty[receiver] -= amountNum;

        // Group by category (using remarks as category)
        const category = remarks || 'Uncategorized';
        if (!summary.byCategory[category]) {
            summary.byCategory[category] = 0;
        }
        summary.byCategory[category] += amountNum;
    });

    return summary;
}

// Function to display summary
function displaySummary(summary, container) {
    const partyList = Object.entries(summary.byParty)
        .map(([party, amount]) => `
            <div class="summary-item">
                <span class="summary-label">${party}</span>
                <span class="summary-value ${amount >= 0 ? 'positive' : 'negative'}">
                    ₹${Math.abs(amount).toFixed(2)}
                    ${amount >= 0 ? '(Received)' : '(Spent)'}
                </span>
            </div>
        `)
        .join('');

    const categoryList = Object.entries(summary.byCategory)
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
} 