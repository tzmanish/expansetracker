// Google Sheets API configuration
const SPREADSHEET_ID = '1Hj_kCide2ZJbpSKltBGS_wjLyqzYdZM7if0bBgZu2d0';
const SHEET_NAME = 'Sheet1';
const CLIENT_ID = '683998895208-c0eappqqhfum6g4s05iq91nkj0e9j98t.apps.googleusercontent.com'; // Replace with your OAuth 2.0 Client ID

// Initialize the form and expenses list
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('expenseForm');
    const addPartyForm = document.getElementById('addPartyForm');
    const modal = document.getElementById('addPartyModal');
    const closeBtn = document.querySelector('.close');

    // Check if user is authenticated
    checkAuth();

    // Handle form submission
    form.addEventListener('submit', async (e) => {
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
            form.reset();
            loadExpenses();
        } catch (error) {
            console.error('Error adding expense:', error);
            alert('Failed to add expense. Please try again.');
        }
    });

    // Handle add party form submission
    addPartyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newPartyName = document.getElementById('newPartyName').value;
        const targetField = modal.dataset.target;
        
        // Add new party to both dropdowns
        addPartyToDropdowns(newPartyName);
        
        // Select the new party in the target dropdown
        document.getElementById(targetField).value = newPartyName;
        
        // Close modal and reset form
        modal.style.display = 'none';
        addPartyForm.reset();
    });

    // Close modal when clicking the close button
    closeBtn.onclick = () => {
        modal.style.display = 'none';
    };

    // Close modal when clicking outside
    window.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    };
});

// Function to show add party modal
function showAddPartyModal(targetField) {
    const modal = document.getElementById('addPartyModal');
    modal.dataset.target = targetField;
    modal.style.display = 'block';
    document.getElementById('newPartyName').focus();
}

// Function to add party to dropdowns
function addPartyToDropdowns(partyName) {
    const spenderSelect = document.getElementById('spender');
    const receiverSelect = document.getElementById('receiver');
    
    // Add to spender dropdown if not exists
    if (!Array.from(spenderSelect.options).some(option => option.value === partyName)) {
        const spenderOption = new Option(partyName, partyName);
        spenderSelect.add(spenderOption);
    }
    
    // Add to receiver dropdown if not exists
    if (!Array.from(receiverSelect.options).some(option => option.value === partyName)) {
        const receiverOption = new Option(partyName, partyName);
        receiverSelect.add(receiverOption);
    }
}

// Function to update party dropdowns from expenses
function updatePartyDropdowns(expenses) {
    const parties = new Set();
    
    // Skip header row if it exists
    const startIndex = expenses[0]?.[0] === 'Date' ? 1 : 0;
    
    // Collect unique parties
    expenses.slice(startIndex).forEach(expense => {
        const [_, spender, receiver] = expense;
        parties.add(spender);
        parties.add(receiver);
    });
    
    // Add parties to dropdowns
    parties.forEach(party => addPartyToDropdowns(party));
}

// Function to check authentication status
async function checkAuth() {
    const token = localStorage.getItem('access_token');
    if (token) {
        try {
            // Verify token is still valid
            await loadExpenses();
        } catch (error) {
            // Token expired or invalid
            localStorage.removeItem('access_token');
            showLoginButton();
        }
    } else {
        showLoginButton();
    }
}

// Function to show login button
function showLoginButton() {
    const appContent = document.querySelector('.app-content');
    const loginButton = document.createElement('button');
    loginButton.textContent = 'Sign in with Google';
    loginButton.className = 'login-button';
    loginButton.onclick = handleAuthClick;
    
    // Insert login button at the top of the app content
    appContent.insertBefore(loginButton, appContent.firstChild);
}

// Function to handle login button click
function handleAuthClick() {
    // Using currentonly scope but with a specific spreadsheet context
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(window.location.href)}` +
        `&response_type=token` +
        `&scope=${encodeURIComponent('https://www.googleapis.com/auth/spreadsheets.currentonly')}` +
        `&include_granted_scopes=true` +
        `&prompt=consent` +
        `&state=${encodeURIComponent(SPREADSHEET_ID)}`; // Pass spreadsheet ID in state parameter

    window.location.href = authUrl;
}

// Function to check if user is authenticated
function isAuthenticated() {
    return !!localStorage.getItem('access_token');
}

// Function to handle OAuth callback
function handleAuthCallback() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const state = params.get('state'); // Get the spreadsheet ID from state
    
    if (accessToken) {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('spreadsheet_id', state); // Store the spreadsheet ID
        window.location.hash = ''; // Clear the hash
        loadExpenses();
    }
}

// Check for OAuth callback
if (window.location.hash) {
    handleAuthCallback();
}

// Function to add a new expense
async function addExpense(expense) {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:E:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('access_token'),
            'X-Goog-Spreadsheet-Id': SPREADSHEET_ID // Add spreadsheet ID in header
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
            // Token expired
            localStorage.removeItem('access_token');
            showLoginButton();
            throw new Error('Please sign in again');
        }
        throw new Error('Failed to add expense');
    }
}

// Function to load expenses
async function loadExpenses() {
    try {
        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:E`, {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('access_token'),
                'X-Goog-Spreadsheet-Id': SPREADSHEET_ID // Add spreadsheet ID in header
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Token expired
                localStorage.removeItem('access_token');
                showLoginButton();
                throw new Error('Please sign in again');
            }
            throw new Error('Failed to load expenses');
        }

        const data = await response.json();
        const expenses = data.values || [];
        updatePartyDropdowns(expenses);
        displayExpenses(expenses);
        
        // Update party filter options
        updatePartyFilter(expenses);
        
        // Update summary if visible
        if (document.getElementById('partySummary').style.display !== 'none') {
            updatePartySummary();
        }
    } catch (error) {
        console.error('Error loading expenses:', error);
        alert('Failed to load expenses. Please refresh the page.');
    }
}

// Function to display expenses
function displayExpenses(expenses) {
    const expensesList = document.getElementById('expensesList');
    expensesList.innerHTML = '';

    // Skip header row if it exists
    const startIndex = expenses[0]?.[0] === 'Date' ? 1 : 0;

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

// Function to update party filter options
function updatePartyFilter(expenses) {
    const filter = document.getElementById('summaryPartyFilter');
    const parties = new Set();
    
    // Skip header row if it exists
    const startIndex = expenses[0]?.[0] === 'Date' ? 1 : 0;
    
    // Collect unique parties
    expenses.slice(startIndex).forEach(expense => {
        const [_, spender, receiver] = expense;
        parties.add(spender);
        parties.add(receiver);
    });
    
    // Update filter options
    filter.innerHTML = '<option value="all">All Parties</option>' +
        Array.from(parties)
            .sort()
            .map(party => `<option value="${party}">${party}</option>`)
            .join('');
    
    // Add change event listener
    filter.onchange = updatePartySummary;
}

// Theme handling
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

// Initialize theme
initTheme();

// Add theme toggle event listener
document.querySelector('.theme-toggle').addEventListener('click', toggleTheme); 