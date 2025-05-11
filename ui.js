import { addExpense, loadExpenses } from './expenses.js';
import { updateSummary } from './summary.js';
import { isUserAuthenticated } from './auth.js';

// UI helper functions
export function showAddPartyModal(targetField) {
    const modal = document.getElementById('addPartyModal');
    modal.dataset.target = targetField;
    modal.style.display = 'block';
    document.getElementById('newPartyName').focus();
}

export function addPartyToDropdowns(partyName) {
    const spenderSelect = document.getElementById('spender');
    const receiverSelect = document.getElementById('receiver');
    
    if (!Array.from(spenderSelect.options).some(option => option.value === partyName)) {
        spenderSelect.add(new Option(partyName, partyName));
    }
    
    if (!Array.from(receiverSelect.options).some(option => option.value === partyName)) {
        receiverSelect.add(new Option(partyName, partyName));
    }
}

export function updatePartyDropdowns(expenses) {
    const parties = new Set();
    const startIndex = expenses[0]?.[0] === 'Date' ? 1 : 0;
    
    expenses.slice(startIndex).forEach(expense => {
        const [_, spender, receiver] = expense;
        if (spender) parties.add(spender);
        if (receiver) parties.add(receiver);
    });
    
    parties.forEach(party => addPartyToDropdowns(party));
}

export function displayExpenses(expenses) {
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

export function updatePartyFilter(expenses) {
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

// Event handlers
export async function handleExpenseSubmit(e) {
    e.preventDefault();

    if (!isUserAuthenticated()) {
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

export function handleAddPartySubmit(e) {
    e.preventDefault();
    const newPartyName = document.getElementById('newPartyName').value;
    const targetField = e.target.closest('.modal').dataset.target;
    
    addPartyToDropdowns(newPartyName);
    document.getElementById(targetField).value = newPartyName;
    
    e.target.closest('.modal').style.display = 'none';
    e.target.reset();
}

// Theme functions
export function initTheme() {
    const theme = localStorage.getItem('theme') || 
                 (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
}

export function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Tab functions
export function switchTab(target) {
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