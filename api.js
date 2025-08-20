// Mock function to simulate fetching exchange rates from an API
// In a real application, you would replace this with a fetch call to a real API.
export const fetchExchangeRates = async () => {
  // Simulating an API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Mock rates against USD, including INR
  return {
    'USD': { 'USD': 1.0, 'EUR': 0.92, 'GBP': 0.79, 'JPY': 150.0, 'INR': 83.0 },
    'EUR': { 'USD': 1.09, 'EUR': 1.0, 'GBP': 0.86, 'JPY': 163.0, 'INR': 90.0 },
    'GBP': { 'USD': 1.27, 'EUR': 1.16, 'GBP': 1.0, 'JPY': 190.0, 'INR': 105.0 },
    'JPY': { 'USD': 0.0067, 'EUR': 0.0061, 'GBP': 0.0053, 'JPY': 1.0, 'INR': 0.55 },
    'INR': { 'USD': 0.012, 'EUR': 0.011, 'GBP': 0.0095, 'JPY': 1.8, 'INR': 1.0 }
  };
};
