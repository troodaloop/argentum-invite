require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const { lookupAddress } = require('./utils/geocodio');
const { findLawmakers, getStateName } = require('./utils/legislators');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'argentum-invite-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 60 * 1000 }  // 30 minutes
}));

// --- EJS layout helper ---
// Wraps each view in the shared layout
app.use((req, res, next) => {
  const originalRender = res.render.bind(res);
  res.render = function (view, locals = {}) {
    // Render the view partial first
    app.render(view, { ...locals, settings: app.settings }, (err, body) => {
      if (err) return next(err);
      // Then render it inside the layout
      originalRender('layout', {
        ...locals,
        body
      });
    });
  };
  next();
});

// --- Default invitation letter ---
const DEFAULT_LETTER = `Dear [Lawmaker Name],

I am writing to invite you to visit [Community Name], a senior living community located in [State] at [Community Address].

Senior living communities play a vital role in caring for older Americans, and we would welcome the opportunity to show you firsthand the meaningful work being done every day by our dedicated staff.

During your visit, you will have the opportunity to:

- Tour our community and meet our residents and staff
- Learn about the services and programs we offer
- Discuss policy issues affecting senior living and older adults
- See the positive impact senior living has on families in [State]

We are flexible with scheduling and would be happy to work with your office to find a convenient time. Please feel free to contact me directly to arrange a visit.

Thank you for your service to [State], and we look forward to welcoming you.

Sincerely,
[Your Name]
[Your Title]
[Community Name]
[Phone Number]
[Email Address]`;

const FOLLOWUP_LETTER = `Dear [Lawmaker/Staff Name],

Thank you for taking the time to visit [Community Name] on [Date of Visit]. We truly appreciated the opportunity to showcase the important work being done every day in senior living.

We hope the visit provided valuable insight into the experiences of our residents and the dedication of our staff. [Personalize with specific moments from the tour.]

As a reminder, [mention any policy topics discussed]. We would welcome the opportunity to serve as an ongoing resource to your office on issues affecting senior living and older adults.

Please do not hesitate to reach out if you have any follow-up questions or would like additional information about senior living in [State].

Thank you again for your time and commitment to our community.

Sincerely,
[Your Name]
[Your Title]
[Community Name]
[Phone Number]
[Email Address]`;

// =========================================
// ROUTES
// =========================================

// Step 1: Landing page
app.get('/', (req, res) => {
  res.render('index', {
    pageTitle: 'Home',
    currentStep: 1,
    error: null,
    formData: {}
  });
});

// Address lookup (form POST from Step 1)
app.post('/lookup', async (req, res) => {
  const { street, city, state, zip, firstName, lastName, title, email, communityName, residentCount } = req.body;
  const fullAddress = `${street}, ${city}, ${state} ${zip}`;

  // Store user info in session
  req.session.userInfo = { firstName, lastName, title, email, communityName, residentCount };

  try {
    const result = await lookupAddress(fullAddress);

    // Find the lawmakers
    const lawmakers = findLawmakers(result.state, result.district);

    if (lawmakers.length === 0) {
      return res.render('index', {
        pageTitle: 'Home',
        currentStep: 1,
        error: 'We could not find any lawmakers for that address. Please double-check and try again.',
        formData: req.body
      });
    }

    // Store in session
    req.session.lawmakers = lawmakers;
    req.session.address = result.formatted_address;
    req.session.state = result.state;
    req.session.district = result.district;

    res.redirect('/lawmakers');
  } catch (err) {
    console.error('Lookup error:', err.message);
    res.render('index', {
      pageTitle: 'Home',
      currentStep: 1,
      error: err.message || 'Something went wrong. Please try again.',
      formData: req.body
    });
  }
});

// Step 2: Show lawmakers
app.get('/lawmakers', (req, res) => {
  if (!req.session.lawmakers) {
    return res.redirect('/');
  }

  res.render('lawmakers', {
    pageTitle: 'Your Lawmakers',
    currentStep: 2,
    lawmakers: req.session.lawmakers,
    address: req.session.address
  });
});

// Helper: auto-populate letter placeholders with user info
function populateLetter(template, userInfo, address, state) {
  const stateName = getStateName(state) || state;
  let letter = template;
  letter = letter.replace(/\[Your Name\]/g, `${userInfo.firstName} ${userInfo.lastName}`);
  letter = letter.replace(/\[Your Title\]/g, userInfo.title);
  letter = letter.replace(/\[Email Address\]/g, userInfo.email);
  letter = letter.replace(/\[Phone Number\]/g, '');
  letter = letter.replace(/\[Community Name\]/g, userInfo.communityName);
  letter = letter.replace(/\[Community Address\]/g, address || '');
  letter = letter.replace(/\[State\]/g, stateName);
  return letter;
}

// Step 3: Write letter
app.get('/letter', (req, res) => {
  if (!req.session.lawmakers) {
    return res.redirect('/');
  }

  const userInfo = req.session.userInfo || {};
  const hasUserInfo = userInfo.firstName && userInfo.communityName;

  // Auto-populate default letter if user info available
  let populatedLetter = DEFAULT_LETTER;
  let populatedSubject = `Invitation to Visit ${userInfo.communityName || '[Community Name]'} - Senior Living Community Tour`;
  if (hasUserInfo) {
    populatedLetter = populateLetter(DEFAULT_LETTER, userInfo, req.session.address, req.session.state);
  }

  res.render('letter', {
    pageTitle: 'Write Your Letter',
    currentStep: 3,
    defaultLetter: populatedLetter,
    letter: req.session.letter || null,
    subject: req.session.subject || null,
    defaultSubject: populatedSubject
  });
});

// Step 4: Contact page (receives letter from Step 3)
app.post('/contact', (req, res) => {
  if (!req.session.lawmakers) {
    return res.redirect('/');
  }

  // Save letter to session
  req.session.letter = req.body.letter;
  req.session.subject = req.body.subject;

  res.render('contact', {
    pageTitle: 'Send Your Letter',
    currentStep: 4,
    lawmakers: req.session.lawmakers,
    letter: req.session.letter,
    subject: req.session.subject
  });
});

// Also allow GET to contact (back navigation)
app.get('/contact', (req, res) => {
  if (!req.session.lawmakers || !req.session.letter) {
    return res.redirect('/letter');
  }

  res.render('contact', {
    pageTitle: 'Send Your Letter',
    currentStep: 4,
    lawmakers: req.session.lawmakers,
    letter: req.session.letter,
    subject: req.session.subject
  });
});

// Submit report (from Step 4 "I've Sent My Letters")
app.post('/submit-report', (req, res) => {
  const userInfo = req.session.userInfo || {};
  const lawmakers = req.session.lawmakers || [];

  const report = {
    timestamp: new Date().toISOString(),
    user: {
      name: `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim(),
      title: userInfo.title || '',
      email: userInfo.email || '',
      community: userInfo.communityName || '',
      residents: userInfo.residentCount || ''
    },
    address: req.session.address || '',
    lawmakers: lawmakers.map(lm => ({
      name: lm.name,
      party: lm.party,
      district: lm.district_label
    })),
    letter: req.session.letter || '',
    subject: req.session.subject || ''
  };

  // Append to reports.json
  const reportsPath = path.join(__dirname, 'data', 'reports.json');
  let reports = [];
  try {
    if (fs.existsSync(reportsPath)) {
      reports = JSON.parse(fs.readFileSync(reportsPath, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading reports:', e.message);
  }
  reports.push(report);
  try {
    fs.writeFileSync(reportsPath, JSON.stringify(reports, null, 2));
    console.log(`Report logged: ${report.user.name} — ${report.lawmakers.length} lawmakers`);
  } catch (e) {
    console.error('Error writing report:', e.message);
  }

  res.redirect('/thankyou');
});

// Calendar reminder (.ics file download)
app.get('/api/calendar-reminder', (req, res) => {
  const userInfo = req.session.userInfo || {};
  const lawmakers = req.session.lawmakers || [];
  const lawmakerNames = lawmakers.map(lm => `${lm.title} ${lm.name}`).join(', ');
  const communityName = userInfo.communityName || 'your community';

  // 5 business days from now
  const now = new Date();
  let bizDays = 0;
  const followUp = new Date(now);
  while (bizDays < 5) {
    followUp.setDate(followUp.getDate() + 1);
    const day = followUp.getDay();
    if (day !== 0 && day !== 6) bizDays++;
  }

  const pad = (n) => String(n).padStart(2, '0');
  const formatDate = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const dtStart = formatDate(followUp);
  const dtEnd = dtStart; // All-day event

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Argentum//Invite Your Lawmaker//EN',
    'BEGIN:VEVENT',
    `DTSTART;VALUE=DATE:${dtStart}`,
    `DTEND;VALUE=DATE:${dtEnd}`,
    `SUMMARY:Follow Up: Lawmaker Tour Invitation`,
    `DESCRIPTION:Follow up on your invitation to ${lawmakerNames} to visit ${communityName}. Call the scheduler's office if you haven't heard back.`,
    `STATUS:CONFIRMED`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  res.set({
    'Content-Type': 'text/calendar; charset=utf-8',
    'Content-Disposition': 'attachment; filename="lawmaker-followup-reminder.ics"'
  });
  res.send(ics);
});

// Step 5: Thank you
app.get('/thankyou', (req, res) => {
  const userInfo = req.session.userInfo || {};
  const hasUserInfo = userInfo.firstName && userInfo.communityName;

  let populatedFollowup = FOLLOWUP_LETTER;
  if (hasUserInfo) {
    populatedFollowup = populateLetter(FOLLOWUP_LETTER, userInfo, req.session.address, req.session.state);
  }

  res.render('thankyou', {
    pageTitle: 'Thank You',
    currentStep: 5,
    followupLetter: populatedFollowup,
    userInfo
  });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`\n  Argentum — Invite Your Lawmaker`);
  console.log(`  Server running at http://localhost:${PORT}`);
  console.log(`  Press Ctrl+C to stop\n`);
});
