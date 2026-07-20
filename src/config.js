// קובץ הגדרות לפורטל האקתון AI מז"פ 2026
// הדבק כאן את כתובת ה-Web App שקיבלת לאחר פריסת ה-Google Apps Script

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwmrm9QzQLITHYLzMEojQ9lgvgI73XDEhY9pIKpyIjZKILtHfBpBvMugEMTWltRYZCq/exec';

// Schedule configuration
const HACKATHON_START = new Date('2026-08-09'); // Sunday
const REGISTRATION_END = new Date('2026-08-27'); // Saturday
const VOTING_START = new Date('2026-08-30'); // Tuesday
const VOTING_END = new Date('2026-09-09'); // Thursday
const HACKATHON_DAY = new Date('2026-09-10'); // Saturday

/**
 * Returns the current phase of the hackathon schedule.
 * Phases: 'REGISTRATION', 'VOTING', 'PREP', 'HACKATHON', 'FINISHED'
 */
// Schedule configuration (already defined above)
function getCurrentPhase() {
  const now = new Date();
  if (now < HACKATHON_START) return 'REGISTRATION';
  if (now >= HACKATHON_START && now <= REGISTRATION_END) return 'REGISTRATION';
  if (now > REGISTRATION_END && now < VOTING_START) return 'PREP';
  if (now >= VOTING_START && now <= VOTING_END) return 'VOTING';
  if (now > VOTING_END && now < HACKATHON_DAY) return 'PREP';
  if (now >= HACKATHON_DAY) return 'HACKATHON';
  return 'FINISHED';
}
// expose globals for other scripts
window.HACKATHON_START = HACKATHON_START;
window.REGISTRATION_END = REGISTRATION_END;
window.VOTING_START = VOTING_START;
window.VOTING_END = VOTING_END;
window.HACKATHON_DAY = HACKATHON_DAY;
window.getCurrentPhase = getCurrentPhase;



