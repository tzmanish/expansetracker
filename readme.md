# Expense Tracker

A modern, responsive web application for tracking expenses and managing party-wise summaries. Built with vanilla JavaScript, HTML, and CSS, this application provides a clean and intuitive interface for managing shared expenses.

## Features

- 📝 Add and track expenses with detailed information
- 👥 Manage multiple parties (spenders and receivers)
- 💰 Track amounts in Indian Rupees (₹)
- 📊 View party-wise expense summaries
- 🌓 Light/Dark mode support
- 📱 Fully responsive design
- 🔍 Filter expenses by party
- 📝 Add optional remarks to expenses
- 📜 View recent expense history
- 📊 Google Sheets integration for data persistence

## Technologies Used

- HTML5
- CSS3 (with CSS Variables for theming)
- Vanilla JavaScript
- Font Awesome for icons
- Google Fonts (Inter and JetBrains Mono)
- Google Sheets API for data storage
- Local Storage for temporary data

## Prerequisites

Before running the application, you'll need to set up Google Sheets API access:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"
4. Configure OAuth consent screen:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Choose "External" user type
   - Fill in the required information
   - Add the following scopes:
     - `https://www.googleapis.com/auth/spreadsheets`
5. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized JavaScript origins (e.g., `http://localhost:8000` for local development)
   - Add authorized redirect URIs (e.g., `http://localhost:8000` for local development)
6. Copy the generated Client ID
7. Create a new Google Sheet and copy its ID from the URL
8. Update the following in `script.js`:
   ```javascript
   const CLIENT_ID = 'your-client-id-here';
   const SPREADSHEET_ID = 'your-spreadsheet-id-here';
   const SHEET_NAME = 'Expenses'; // or your preferred sheet name
   ```

## Getting Started

1. Clone the repository:
   ```bash
   git clone [repository-url]
   ```

2. Follow the Prerequisites section to set up Google Sheets API access

3. Open `index.html` in your web browser

## Usage

1. **Adding a New Party**
   - Click the "+" button next to the Spender or Receiver dropdown
   - Enter the party name in the modal
   - Click "Add Party"

2. **Adding an Expense**
   - Select the spender from the dropdown
   - Select the receiver from the dropdown
   - Enter the amount
   - (Optional) Add remarks
   - Click "Add Expense"

3. **Viewing Summaries**
   - Click "Show Summary" to view party-wise expense summaries
   - Use the party filter to view specific party summaries

4. **Theme Toggle**
   - Click the sun/moon icon in the header to switch between light and dark modes

## Browser Support

The application is compatible with all modern browsers that support:
- CSS Variables
- ES6+ JavaScript features
- Local Storage API

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.

## Author

tzman

---

Made with ❤️ using vanilla web technologies
