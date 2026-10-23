/* =====================================================================
   WEDDING DETAILS  —  EDIT EVERYTHING FOR YOUR WEDDING IN THIS FILE
   =====================================================================
   This is the ONLY file you need to change to personalise the website.

   • Anything shown in [square brackets] is a PLACEHOLDER. Replace the whole
     thing, brackets included, with your real information.
   • While a value is still in [brackets] the website highlights it with a
     dotted underline so you can spot what is left to fill in.
   • Leave a value as "" (empty text) to hide that item where noted.
   • Keep the quotation marks "..." and commas , exactly as they are.
   ===================================================================== */

window.WEDDING_CONFIG = {

  /* ---- 1. THE COUPLE ------------------------------------------------ */
  couple: {
    partnerOne: "[Partner One]",
    partnerTwo: "[Partner Two]",
    // Short form used in the top navigation bar, e.g. "A & B"
    initials: "[A & B]",
    // Small line above the names, e.g. "Together with their families"
    preface: "Together with their families",
    // Line below the names
    invitationLine: "request the pleasure of your company at the celebration of their wedding"
  },

  /* ---- 2. WELCOME MESSAGE ------------------------------------------- */
  welcomeMessage:
    "[Write a short, warm welcome message to your guests here. Two or three sentences work beautifully.]",

  /* ---- 3. DATE & TIME ----------------------------------------------- */
  date: {
    // Text shown to guests, e.g. "Saturday, 12 December 2026"
    display: "[Wedding Date]",
    // Time text shown to guests, e.g. "4:00 PM onwards"
    time: "[Start Time]",
    // OPTIONAL. Machine-readable start in LOCAL time: "YYYY-MM-DDTHH:MM",
    // e.g. "2026-12-12T16:00". When filled in, the site shows a live
    // countdown and an "Add to Calendar" button. Leave "" to hide both.
    iso: "",
    // Length of the event in hours (used for the calendar file)
    durationHours: 4
  },

  /* ---- 4. VENUE ----------------------------------------------------- */
  venue: {
    name: "[Venue Name]",
    address: "[Street Address, City, Postcode]",
    // OPTIONAL. A Google Maps / Apple Maps share link. "" hides the button.
    mapUrl: "",
    // Dress code or other short note for guests. "" hides this card.
    note: "[Dress code or any note for guests]"
  },

  /* ---- 5. EVENT SCHEDULE ------------------------------------------- */
  // Add, remove or reorder rows freely. Each row: time, title, description.
  schedule: [
    { time: "[Time]", title: "[Event 1 — e.g. Ceremony]",     description: "[Short description or location]" },
    { time: "[Time]", title: "[Event 2 — e.g. Cocktail Hour]", description: "[Short description or location]" },
    { time: "[Time]", title: "[Event 3 — e.g. Reception]",     description: "[Short description or location]" },
    { time: "[Time]", title: "[Event 4 — e.g. Dinner & Dancing]", description: "[Short description or location]" }
  ],

  /* ---- 6. RSVP ------------------------------------------------------ */
  rsvp: {
    // Text shown above the form, e.g. "Kindly reply by 1 November 2026"
    deadline: "[RSVP Deadline]",
    // The email address that receives replies. Guests' email app opens with
    // their answer pre-filled (a free "mailto:" link — no server needed).
    email: "[your-email@example.com]",
    // Subject line of the reply email
    subject: "Wedding RSVP",
    // Highest number of guests one reply may include
    maxGuests: 6
  },

  /* ---- 7. FOOTER ---------------------------------------------------- */
  footer: {
    closingMessage:
      "[Closing message — e.g. “Thank you for being part of our story. We can’t wait to celebrate with you.”]",
    // OPTIONAL hashtag, e.g. "#OurWedding". "" hides it.
    hashtag: "",
    // Browser tab title. Shown as-is.
    pageTitle: "Wedding Invitation"
  }
};
