const fs = require('fs');
const path = require('path');

// Load legislator data once at startup
const dataPath = path.join(__dirname, '..', 'data', 'legislators-current.json');
const legislators = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Load scheduler contacts
const schedulerPath = path.join(__dirname, '..', 'data', 'scheduler-contacts.json');
let schedulerContacts = {};
try {
  const raw = JSON.parse(fs.readFileSync(schedulerPath, 'utf8'));
  // Filter out instruction/example keys
  for (const [key, val] of Object.entries(raw)) {
    if (!key.startsWith('_')) {
      schedulerContacts[key] = val;
    }
  }
} catch (e) {
  console.warn('Could not load scheduler contacts:', e.message);
}

// State abbreviation to full name mapping
const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia', AS: 'American Samoa', GU: 'Guam', MP: 'Northern Mariana Islands',
  PR: 'Puerto Rico', VI: 'U.S. Virgin Islands'
};

/**
 * Find the two U.S. Senators for a given state abbreviation.
 */
function findSenators(state) {
  return legislators.filter(l => l.type === 'sen' && l.state === state);
}

/**
 * Find the U.S. Representative for a given state and district.
 * District 0 = at-large states (AK, DE, MT, ND, SD, VT, WY).
 */
function findRepresentative(state, district) {
  return legislators.filter(l =>
    l.type === 'rep' &&
    l.state === state &&
    l.district === district
  );
}

/**
 * Find all lawmakers (2 senators + 1 rep) for a state/district.
 * Adds photo URL and scheduler contact info to each.
 */
function findLawmakers(state, district) {
  const senators = findSenators(state);
  const reps = findRepresentative(state, district);
  const all = [...senators, ...reps];

  return all.map(l => ({
    ...l,
    state_name: STATE_NAMES[l.state] || l.state,
    photo_url: `https://bioguide.congress.gov/bioguide/photo/${l.bioguide_id[0]}/${l.bioguide_id}.jpg`,
    title: l.type === 'sen' ? 'Senator' : 'Representative',
    district_label: l.type === 'sen'
      ? `${STATE_NAMES[l.state] || l.state}`
      : (l.district === 0
        ? `${STATE_NAMES[l.state] || l.state} (At-Large)`
        : `${STATE_NAMES[l.state] || l.state}, District ${l.district}`),
    scheduler: schedulerContacts[l.bioguide_id] || null
  }));
}

/**
 * Get the state full name from abbreviation.
 */
function getStateName(abbrev) {
  return STATE_NAMES[abbrev] || abbrev;
}

module.exports = { findSenators, findRepresentative, findLawmakers, getStateName };
