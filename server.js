require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
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

I am writing to invite you to visit [Community Name], a senior living community located in your [district/state] at [Community Address].

Senior living communities play a vital role in caring for older Americans, and we would welcome the opportunity to show you firsthand the meaningful work being done every day by our dedicated staff.

During your visit, you will have the opportunity to:

- Tour our community and meet our residents and staff
- Learn about the services and programs we offer
- Discuss policy issues affecting senior living and older adults
- See the positive impact senior living has on families in your [district/state]

We are flexible with scheduling and would be happy to work with your office to find a convenient time. Please feel free to contact me directly to arrange a visit.

Thank you for your service to our [district/state], and we look forward to welcoming you.

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

Please do not hesitate to reach out if you have any follow-up questions or would like additional information about senior living in your [district/state].

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
  const { street, city, state, zip } = req.body;
  const fullAddress = `${street}, ${city}, ${state} ${zip}`;

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

// Step 3: Write letter
app.get('/letter', (req, res) => {
  if (!req.session.lawmakers) {
    return res.redirect('/');
  }

  res.render('letter', {
    pageTitle: 'Write Your Letter',
    currentStep: 3,
    defaultLetter: DEFAULT_LETTER,
    letter: req.session.letter || null,
    subject: req.session.subject || null
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

// Step 5: Thank you
app.get('/thankyou', (req, res) => {
  res.render('thankyou', {
    pageTitle: 'Thank You',
    currentStep: 5,
    followupLetter: FOLLOWUP_LETTER
  });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`\n  Argentum — Invite Your Lawmaker`);
  console.log(`  Server running at http://localhost:${PORT}`);
  console.log(`  Press Ctrl+C to stop\n`);
});
