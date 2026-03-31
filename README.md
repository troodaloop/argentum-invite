# Argentum — Invite Your Lawmaker to Visit Senior Living

A web application that helps senior living community staff invite their federal lawmakers (U.S. Senators and Representatives) to tour their community. Built for [Argentum](https://www.argentum.org/).

## How It Works

1. **Find Lawmakers** — Enter your community's address to identify your 2 U.S. Senators and 1 Representative
2. **Review Lawmakers** — See your matched lawmakers with official photos
3. **Write Letter** — Customize a pre-written invitation letter with your community's details
4. **Send Letter** — Get scheduler contact info and pre-filled email links to send your invitation
5. **Thank You** — Access a follow-up letter template and the Value of Assisted Living infographic for visit prep

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or later)
- A free [Geocodio API key](https://www.geocod.io/) (for address-to-congressional-district lookups)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/argentum-invite.git
cd argentum-invite

# 2. Install dependencies
npm install

# 3. Set up your environment variables
cp .env.example .env
# Then edit .env and add your Geocodio API key

# 4. Start the server
npm start
```

The app will be running at **http://localhost:3000**

### Development Mode (auto-reload on file changes)

```bash
npm run dev
```

## Project Structure

```
argentum-invite/
├── server.js              # Express app & routes
├── data/
│   ├── legislators-current.json   # 538 members of 119th Congress
│   └── scheduler-contacts.json    # Scheduler emails (manually maintained)
├── utils/
│   ├── geocodio.js        # Address → congressional district lookup
│   └── legislators.js     # Legislator data & matching
├── views/                 # EJS templates for each step
├── public/
│   ├── css/styles.css     # All styles (CSS variables for branding)
│   ├── js/app.js          # Client-side interactivity
│   └── documents/         # Downloadable resources (PDFs)
└── .env.example           # Environment variable template
```

## Updating Scheduler Contacts

The file `data/scheduler-contacts.json` contains scheduler email addresses for congressional offices. To add or update an entry:

1. Find the lawmaker's `bioguide_id` in `data/legislators-current.json`
2. Add an entry to `scheduler-contacts.json`:

```json
{
  "B000944": {
    "scheduler_name": "Jane Smith",
    "scheduler_email": "scheduler@lawmaker.senate.gov",
    "scheduler_phone": "(202) 555-0100",
    "title": "Scheduler"
  }
}
```

If no scheduler entry exists for a lawmaker, the app automatically falls back to showing the office's general phone number, address, and official contact form.

## Customizing Branding

All colors are defined as CSS variables at the top of `public/css/styles.css`:

```css
:root {
  --primary: #1a3a5c;       /* Main navy */
  --accent: #c4a035;        /* Gold accent */
  /* ... more variables */
}
```

To update with Argentum's official branding, just change these values.

## Questions?

Contact Kyle Loeber — [kloeber@argentum.org](mailto:kloeber@argentum.org)
