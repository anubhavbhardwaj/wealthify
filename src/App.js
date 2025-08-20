import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList
} from 'recharts';
import { Home as HomeIcon, Wallet, Sun, Moon, PlusCircle, ArrowLeftCircle, Loader2, Menu } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// Mock function to simulate fetching exchange rates from an API
const fetchExchangeRates = async () => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return {
    'USD': { 'USD': 1.0, 'EUR': 0.92, 'GBP': 0.79, 'JPY': 150.0, 'INR': 83.0 },
    'EUR': { 'USD': 1.09, 'EUR': 1.0, 'GBP': 0.86, 'JPY': 163.0, 'INR': 90.0 },
    'GBP': { 'USD': 1.27, 'EUR': 1.16, 'GBP': 1.0, 'JPY': 190.0, 'INR': 105.0 },
    'JPY': { 'USD': 0.0067, 'EUR': 0.0061, 'GBP': 0.0053, 'JPY': 1.0, 'INR': 0.55 },
    'INR': { 'USD': 0.012, 'EUR': 0.011, 'GBP': 0.0095, 'JPY': 1.8, 'INR': 1.0 }
  };
};

const availableCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'INR'];
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const getCurrencySymbol = (currency) => {
  switch(currency) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'JPY': return '¥';
    case 'INR': return '₹';
    default: return '$';
  }
};

// Home Page Component (The main chart view)
const HomePage = ({ chartData, accounts, baseCurrency, isLoadingRates }) => {
  const tooltipFormatter = (value, name) => {
    return [`${getCurrencySymbol(baseCurrency)}${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, name];
  };

  const xAxisTickFormatter = (tick) => {
    const [year, month] = tick.split('-');
    const monthIndex = parseInt(month) - 1;
    return `${monthNames[monthIndex]} '${year.slice(-2)}`;
  };

  return (
    <div className="flex flex-col w-full h-full p-4">
      <div className="flex flex-col items-center text-center">
        <h2 className="text-xl md:text-3xl font-bold mb-2">Wealth Overview</h2>
        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Consolidated wealth across all accounts, converted to {baseCurrency}.</p>
      </div>

      <div className="w-full h-96 mt-8">
        {isLoadingRates ? (
          <div className="flex items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
            <Loader2 className="animate-spin mr-2" />
            <p>Fetching exchange rates...</p>
          </div>
        ) : chartData.length > 0 && accounts.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-600" />
              <XAxis dataKey="month" className="text-xs" tick={{ fill: 'currentColor' }} axisLine={{ stroke: 'currentColor' }} tickFormatter={xAxisTickFormatter} />
              <YAxis className="text-xs" tick={{ fill: 'currentColor' }} axisLine={{ stroke: 'currentColor' }} />
              <Tooltip
                formatter={tooltipFormatter}
                labelFormatter={(label) => `Date: ${label}`}
                cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                contentStyle={{ backgroundColor: 'var(--tooltip-bg)', border: 'none', borderRadius: '8px', color: 'var(--tooltip-text)', fontSize: '12px' }}
              />
              <Legend className="text-xs" />
              {accounts.map((account, index) => (
                <Bar
                  key={account.name}
                  dataKey={account.name}
                  stackId="a"
                  fill={`hsl(${index * 50}, 70%, 50%)`}
                  barSize={40}
                >
                  <LabelList dataKey={account.name} position="center" formatter={(value) => value > 0 ? value.toLocaleString() : ''} style={{ fill: 'white', fontSize: 10, fontWeight: 'bold' }} />
                </Bar>
              ))}
              <LabelList dataKey="total" position="top" formatter={(value) => `${getCurrencySymbol(baseCurrency)}${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} style={{ fill: 'currentColor', fontSize: 10, fontWeight: 'bold' }} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
            <p>Add some accounts and monthly data to see the chart here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Component for a single account's details and monthly change chart
const AccountDetailsPage = ({ account, baseCurrency, setPage }) => {
  const monthlyValuesData = account.monthlyData.map(data => ({
    month: data.month,
    endingBalance: data.ending
  }));
  const monthlyChangeData = account.monthlyData.map(data => ({
    month: data.month,
    change: data.ending - data.opening
  }));

  const xAxisTickFormatter = (tick) => {
    const [year, month] = tick.split('-');
    const monthIndex = parseInt(month) - 1;
    return `${monthNames[monthIndex]} '${year.slice(-2)}`;
  };

  const tooltipFormatter = (value, name) => [`${getCurrencySymbol(account.currency)}${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, name];

  return (
    <div className="flex flex-col w-full h-full p-4">
      <div className="flex items-center mb-4">
        <button
          onClick={() => setPage('accounts')}
          className="p-2 mr-2 text-gray-500 dark:text-gray-400 hover:text-emerald-500 transition-colors duration-200 rounded-full"
          aria-label="Go back to accounts list"
        >
          <ArrowLeftCircle size={24} />
        </button>
        <h2 className="text-xl md:text-3xl font-bold">Performance for {account.name}</h2>
      </div>
      
      {monthlyValuesData.length > 0 ? (
        <div className="w-full space-y-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl">
            <h3 className="text-lg md:text-xl font-semibold mb-4">Monthly Ending Balance</h3>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyValuesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-600" />
                  <XAxis dataKey="month" className="text-xs" tickFormatter={xAxisTickFormatter} />
                  <YAxis className="text-xs" />
                  <Tooltip
                    formatter={tooltipFormatter}
                    labelFormatter={(label) => `Date: ${label}`}
                    contentStyle={{ backgroundColor: 'var(--tooltip-bg)', border: 'none', borderRadius: '8px', color: 'var(--tooltip-text)', fontSize: '12px' }}
                  />
                  <Legend />
                  <Bar dataKey="endingBalance" name="Ending Balance" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl">
            <h3 className="text-lg md:text-xl font-semibold mb-4">Monthly Change (Profit/Loss)</h3>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChangeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-600" />
                  <XAxis dataKey="month" className="text-xs" tickFormatter={xAxisTickFormatter} />
                  <YAxis className="text-xs" />
                  <Tooltip
                    formatter={tooltipFormatter}
                    labelFormatter={(label) => `Date: ${label}`}
                    contentStyle={{ backgroundColor: 'var(--tooltip-bg)', border: 'none', borderRadius: '8px', color: 'var(--tooltip-text)', fontSize: '12px' }}
                  />
                  <Legend />
                  <Bar dataKey="change" name="Change">
                    {monthlyChangeData.map((entry, index) => (
                      <Bar key={index} fill={entry.change >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
          <p>Enter data for this account on the "Edit Data" page to see its performance charts here.</p>
        </div>
      )}
    </div>
  );
};

// Component for adding/editing monthly data
const MonthlyDataForm = ({ account, setEditingAccount, onSave }) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const [selectedMonth, setSelectedMonth] = useState('01');
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [openingBalance, setOpeningBalance] = useState('');
  const [endingBalance, setEndingBalance] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    const monthYear = `${selectedYear}-${selectedMonth}`;
    if (!openingBalance || !endingBalance) {
      alert("Please fill in both opening and ending balances.");
      return;
    }
    onSave(monthYear, openingBalance, endingBalance);
    setOpeningBalance('');
    setEndingBalance('');
  };

  return (
    <div className="flex flex-col w-full h-full p-4">
      <div className="flex items-center mb-4">
        <button
          onClick={() => setEditingAccount(null)}
          className="p-2 mr-2 text-gray-500 dark:text-gray-400 hover:text-emerald-500 transition-colors duration-200 rounded-full"
          aria-label="Go back to accounts list"
        >
          <ArrowLeftCircle size={24} />
        </button>
        <h2 className="text-xl md:text-3xl font-bold">Edit Monthly Data for {account.name}</h2>
      </div>

      <form onSubmit={handleSave} className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-inner mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label htmlFor="month-select" className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Month</label>
            <select
              id="month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              {monthNames.map((name, index) => (
                <option key={name} value={String(index + 1).padStart(2, '0')}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="year-select" className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="opening" className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Opening ({account.currency})</label>
            <input
              type="number"
              id="opening"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="e.g., 50000"
            />
          </div>
          <div>
            <label htmlFor="ending" className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ending ({account.currency})</label>
            <input
              type="number"
              id="ending"
              value={endingBalance}
              onChange={(e) => setEndingBalance(e.target.value)}
              className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="e.g., 55000"
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full px-6 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors duration-200 shadow-md font-semibold"
        >
          Add/Update Month
        </button>
      </form>

      <div>
        <h3 className="text-xl font-semibold mb-3">Data for {account.name}</h3>
        {account.monthlyData.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No data has been entered for this account yet.</p>
        ) : (
          <ul className="space-y-3">
            {account.monthlyData.map((data, index) => (
              <li key={index} className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div className="flex items-center space-x-3">
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{data.month}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                      Open: {getCurrencySymbol(account.currency)}{data.opening.toLocaleString()} | End: {getCurrencySymbol(account.currency)}{data.ending.toLocaleString()}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// Account List and Add/Edit Page
const AccountsPage = ({ accounts, setAccounts, setPage, setSelectedAccount }) => {
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountCurrency, setNewAccountCurrency] = useState('USD');
  const [errorMessage, setErrorMessage] = useState(null);
  const [editingAccount, setEditingAccount] = useState(null);

  // Handle adding a new account
  const handleAddAccount = () => {
    setErrorMessage(null);
    if (!newAccountName.trim()) {
      setErrorMessage("Account name cannot be empty.");
      return;
    }
    const isDuplicate = accounts.some(acc => acc.name.toLowerCase() === newAccountName.trim().toLowerCase());
    if (isDuplicate) {
      setErrorMessage("An account with this name already exists.");
      return;
    }

    setAccounts([...accounts, { name: newAccountName.trim(), currency: newAccountCurrency, monthlyData: [] }]);
    setNewAccountName('');
  };

  // Handle removing an account
  const handleRemoveAccount = (accountToRemove) => {
    setAccounts(accounts.filter(acc => acc.name !== accountToRemove.name));
    setEditingAccount(null); // Clear editing state if the account is removed
  };

  // Handle adding/editing monthly data for a specific account
  const handleSaveMonthlyData = (monthYear, opening, ending) => {
    if (!editingAccount) return;

    const updatedAccounts = accounts.map(acc => {
      if (acc.name === editingAccount.name) {
        // Create a new monthly data entry or update an existing one
        const updatedMonthlyData = [...acc.monthlyData];
        const existingMonthIndex = updatedMonthlyData.findIndex(d => d.month === monthYear);

        if (existingMonthIndex > -1) {
          updatedMonthlyData[existingMonthIndex] = { month: monthYear, opening: parseFloat(opening), ending: parseFloat(ending) };
        } else {
          updatedMonthlyData.push({ month: monthYear, opening: parseFloat(opening), ending: parseFloat(ending) });
        }
        // Sort data by month to ensure chart is chronological. YYYY-MM format sorts lexicographically.
        const sortedData = updatedMonthlyData.sort((a, b) => a.month.localeCompare(b.month));
        return { ...acc, monthlyData: sortedData };
      }
      return acc;
    });
    setAccounts(updatedAccounts);
    setEditingAccount({ ...editingAccount, monthlyData: updatedAccounts.find(acc => acc.name === editingAccount.name).monthlyData });
  };

  // Function to view a single account's details
  const handleViewDetails = (account) => {
    setSelectedAccount(account);
    setPage('accountDetails');
  };

  // If a user is editing an account's monthly data, show the specific form
  if (editingAccount) {
    return (
      <MonthlyDataForm
        account={editingAccount}
        setEditingAccount={setEditingAccount}
        onSave={handleSaveMonthlyData}
      />
    );
  }

  // Otherwise, show the list of accounts and the add account form
  return (
    <div className="flex flex-col w-full h-full p-4">
      <div className="flex items-center mb-4">
        <button
          onClick={() => setPage('home')}
          className="p-2 mr-2 text-gray-500 dark:text-gray-400 hover:text-emerald-500 transition-colors duration-200 rounded-full"
          aria-label="Go back to Home"
        >
          <ArrowLeftCircle size={24} />
        </button>
        <h2 className="text-3xl font-bold">Your Accounts</h2>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-inner mb-6">
        <h3 className="text-xl font-semibold mb-3">Add a New Account</h3>
        {errorMessage && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-md mb-4" role="alert">
            <p>{errorMessage}</p>
          </div>
        )}
        <div className="flex flex-col md:flex-row md:items-end space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <label htmlFor="account-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Name</label>
            <input
              type="text"
              id="account-name"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-200"
              placeholder="e.g., Vanguard, eToro"
            />
          </div>
          <div className="w-full md:w-auto">
            <label htmlFor="account-currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency</label>
            <select
              id="account-currency"
              value={newAccountCurrency}
              onChange={(e) => setNewAccountCurrency(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-200"
            >
              {availableCurrencies.map(currency => (
                <option key={currency} value={currency}>{currency}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAddAccount}
            className="w-full md:w-auto px-6 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors duration-200 shadow-md font-semibold flex items-center justify-center space-x-2"
          >
            <PlusCircle size={20} />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-3">Your Existing Accounts</h3>
        {accounts.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">You haven't added any accounts yet.</p>
        ) : (
          <ul className="space-y-3">
            {accounts.map((account, index) => (
              <li key={index} className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div className="flex items-center space-x-3">
                  <Wallet size={20} className="text-emerald-500" />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{account.name}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">({account.currency})</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleViewDetails(account)}
                    className="px-3 py-1 text-sm bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors duration-200"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => setEditingAccount(account)}
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200"
                  >
                    Edit Data
                  </button>
                  <button
                    onClick={() => handleRemoveAccount(account)}
                    className="px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// Main App Component
const App = () => {
  const [currentPage, setPage] = useState('home');
  const [darkMode, setDarkMode] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [wealthData, setWealthData] = useState([]);
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [exchangeRates, setExchangeRates] = useState(null);
  const [isLoadingRates, setIsLoadingRates] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const isInitialLoad = useRef(true);

  // Firestore & Firebase setup
  useEffect(() => {
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
    const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

    if (!Object.keys(firebaseConfig).length) {
      console.error("Firebase config is missing. Data persistence will not work.");
      setLoading(false);
      return;
    }

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'wealth', 'accounts');

        const unsubscribeSnapshot = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("Data loaded from Firestore:", data);
            if (data.accounts) {
              const parsedAccounts = data.accounts.map(acc => ({
                ...acc,
                monthlyData: JSON.parse(acc.monthlyData)
              }));
              setAccounts(parsedAccounts);
            }
            if (data.baseCurrency) {
              setBaseCurrency(data.baseCurrency);
            }
          } else {
            console.log("No wealth data found for this user. Starting fresh.");
          }
          isInitialLoad.current = false;
          setLoading(false);
        }, (error) => {
          console.error("Error listening to Firestore document:", error);
          isInitialLoad.current = false;
          setLoading(false);
        });

        return () => unsubscribeSnapshot();
      } else {
        try {
          if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
          } else {
            await signInAnonymously(auth);
          }
        } catch (error) {
          console.error("Error during anonymous sign-in:", error);
          setLoading(false);
        }
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Effect to save data to Firestore
  useEffect(() => {
    const saveToDb = async () => {
      if (!userId || isInitialLoad.current) return;

      try {
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        const docRef = doc(db, 'artifacts', appId, 'users', userId, 'wealth', 'accounts');

        const serializableAccounts = accounts.map(acc => ({
          ...acc,
          monthlyData: JSON.stringify(acc.monthlyData)
        }));

        await setDoc(docRef, {
          accounts: serializableAccounts,
          baseCurrency,
        });
        console.log("Data saved to Firestore successfully.");
      } catch (e) {
        console.error("Error adding document: ", e);
      }
    };
    saveToDb();
  }, [accounts, baseCurrency, userId]);
  
  // Effect to fetch exchange rates
  useEffect(() => {
    const getRates = async () => {
      setIsLoadingRates(true);
      const rates = await fetchExchangeRates();
      setExchangeRates(rates);
      setIsLoadingRates(false);
    };
    getRates();
  }, []);

  // Function to process and prepare data for the chart
  const processDataForChart = useCallback(() => {
    if (!exchangeRates) {
      setWealthData([]);
      return;
    }

    const allMonths = new Set();
    accounts.forEach(acc => {
      acc.monthlyData.forEach(data => allMonths.add(data.month));
    });

    const sortedMonths = Array.from(allMonths).sort();

    const consolidatedData = sortedMonths.map(month => {
      const monthEntry = { month };
      let totalWealth = 0;
      accounts.forEach(acc => {
        const monthlyValue = acc.monthlyData.find(d => d.month === month)?.ending || 0;
        const rate = exchangeRates[acc.currency]?.[baseCurrency] || 1.0;
        const convertedValue = monthlyValue * rate;
        monthEntry[acc.name] = convertedValue;
        totalWealth += convertedValue;
      });
      monthEntry.total = totalWealth;
      return monthEntry;
    });
    setWealthData(consolidatedData);
  }, [accounts, baseCurrency, exchangeRates]);

  useEffect(() => {
    processDataForChart();
  }, [accounts, baseCurrency, exchangeRates, processDataForChart]);

  // Handle dark mode toggle
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Sidebar Navigation */}
      <nav className="flex flex-col p-4 bg-white dark:bg-gray-800 shadow-lg w-20 md:w-56 transition-all duration-300">
        <div className="flex-1 space-y-2">
          <button
            onClick={() => setPage('home')}
            className={`flex items-center space-x-4 p-3 rounded-lg w-full text-left transition-colors duration-200 ${currentPage === 'home' ? 'bg-emerald-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
          >
            <HomeIcon size={24} />
            <span className="hidden md:inline">Homepage</span>
          </button>
          <button
            onClick={() => setPage('accounts')}
            className={`flex items-center space-x-4 p-3 rounded-lg w-full text-left transition-colors duration-200 ${currentPage === 'accounts' ? 'bg-emerald-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
          >
            <Wallet size={24} />
            <span className="hidden md:inline">Accounts</span>
          </button>
        </div>

        {/* Dark Mode Toggle and Currency Selector */}
        <div className="flex flex-col items-center space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-3 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
            aria-label="Toggle Dark Mode"
          >
            {darkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
          <div className="w-full">
            <label htmlFor="base-currency" className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-center">Base Currency</label>
            <select
              id="base-currency"
              value={baseCurrency}
              onChange={(e) => setBaseCurrency(e.target.value)}
              className="w-full px-2 md:px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-200"
            >
              {availableCurrencies.map(currency => (
                <option key={currency} value={currency}>{currency}</option>
              ))}
            </select>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center p-4 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center w-full h-full text-center text-gray-500 dark:text-gray-400">
            <p>Loading your data...</p>
          </div>
        ) : (
          (() => {
            switch (currentPage) {
              case 'home':
                return (
                  <HomePage
                    chartData={wealthData}
                    accounts={accounts}
                    baseCurrency={baseCurrency}
                    isLoadingRates={isLoadingRates}
                  />
                );
              case 'accounts':
                return <AccountsPage accounts={accounts} setAccounts={setAccounts} setPage={setPage} setSelectedAccount={setSelectedAccount} />;
              case 'accountDetails':
                return <AccountDetailsPage account={selectedAccount} baseCurrency={baseCurrency} setPage={setPage} />;
              default:
                return null;
            }
          })()
        )}
        <div className="text-xs text-gray-400 dark:text-gray-600 mt-4">
          User ID: {userId || 'Authenticating...'}
        </div>
      </main>
    </div>
  );
};

export default App;
