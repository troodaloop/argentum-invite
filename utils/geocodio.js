const axios = require('axios');

const GEOCODIO_BASE = 'https://api.geocod.io/v1.7';

/**
 * Look up congressional district info for a given address.
 * Returns { state, district, formatted_address } or throws on error.
 */
async function lookupAddress(address) {
  const apiKey = process.env.GEOCODIO_API_KEY;
  if (!apiKey || apiKey === 'your_geocodio_api_key_here') {
    throw new Error('GEOCODIO_API_KEY is not configured. Sign up free at geocod.io.');
  }

  const response = await axios.get(`${GEOCODIO_BASE}/geocode`, {
    params: {
      q: address,
      fields: 'cd',
      api_key: apiKey
    }
  });

  const results = response.data.results;
  if (!results || results.length === 0) {
    throw new Error('Could not find that address. Please check and try again.');
  }

  const result = results[0];
  const cd = result.fields && result.fields.congressional_districts;

  if (!cd || cd.length === 0) {
    throw new Error('Could not determine congressional district for that address.');
  }

  // Use the district with the highest proportion (in case address spans districts)
  const best = cd.reduce((a, b) => (b.proportion || 1) > (a.proportion || 1) ? b : a);

  // Geocodio uses 98 for at-large/delegate districts; our data uses 0
  const district = best.district_number === 98 ? 0 : best.district_number;

  return {
    state: result.address_components.state,
    district,
    formatted_address: result.formatted_address
  };
}

module.exports = { lookupAddress };
