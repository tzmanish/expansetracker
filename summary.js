import { loadExpenses, filterExpensesByParty } from './expenses.js';

// Function to update summary
export async function updateSummary() {
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
        
        const filteredExpenses = filterExpensesByParty(expenses, selectedParty);
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