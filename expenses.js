import { SPREADSHEET_ID, SHEET_NAME } from './config.js';
import { getAuthToken, clearAuth } from './auth.js';
import { updatePartyDropdowns } from './ui.js';

// API functions
export async function addExpense(expense) {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:E:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + getAuthToken()
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
            clearAuth();
            throw new Error('Please sign in again');
        }
        throw new Error('Failed to add expense');
    }
}

export async function loadExpenses() {
    try {
        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:E`, {
            headers: {
                'Authorization': 'Bearer ' + getAuthToken()
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                clearAuth();
                throw new Error('Please sign in again');
            }
            throw new Error('Failed to load expenses');
        }

        const data = await response.json();
        const expenses = data.values || [];
        
        // Update UI elements
        updatePartyDropdowns(expenses);
        
        return expenses;
    } catch (error) {
        console.error('Error loading expenses:', error);
        throw error;
    }
}

// Helper functions
export function getUniqueParties(expenses) {
    const parties = new Set();
    const startIndex = expenses[0]?.[0] === 'Date' ? 1 : 0;
    
    expenses.slice(startIndex).forEach(expense => {
        const [_, spender, receiver] = expense;
        if (spender) parties.add(spender);
        if (receiver) parties.add(receiver);
    });
    
    return Array.from(parties).sort();
}

export function filterExpensesByParty(expenses, party) {
    if (party === 'all') return expenses;
    
    const startIndex = expenses[0]?.[0] === 'Date' ? 1 : 0;
    return expenses.slice(startIndex).filter(expense => {
        const [_, spender, receiver] = expense;
        return spender === party || receiver === party;
    });
} 