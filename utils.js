// Available currencies for the dropdown
export const availableCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'INR'];
export const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Function to get the currency symbol
export const getCurrencySymbol = (currency) => {
  switch(currency) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'JPY': return '¥';
    case 'INR': return '₹';
    default: return '$';
  }
};
