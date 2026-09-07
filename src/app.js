// לוגיקת האפליקציה - פורטל האקתון AI מז"פ 2026

document.addEventListener('DOMContentLoaded', () => {
  // איניציאליזציה של הממשק
  initCommonUI();
  
  // זיהוי העמוד הנוכחי
  if (document.body.id === 'judge-page') {
    initJudgeUI();
  } else {
    initPortalUI();
    initChatbotUI();
  }
});

// ==========================================
// פונקציות עזר גלובליות לשליחת בקשות API
// ==========================================

// פונקציה לשליחת בקשות GET בטוחות ל-Google Apps Script Web App
async function apiGet(params = {}) {
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL === 'YOUR_GOOGLE_SCRIPT_WEB_APP_URL_HERE') {
    console.warn('כתובת ה-API אינה מוגדרת בקובץ config.js');
    return { status: 'error', message: 'כתובת ה-API אינה מוגדרת' };
  }

  // בניית מחרוזת הפרמטרים
  const queryString = new URLSearchParams(params).toString();
  const url = `${GOOGLE_SCRIPT_URL}?${queryString}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors'
    });
    
    if (!response.ok) throw new Error('שגיאת רשת במשיכת נתונים');
    return await response.json();
  } catch (error) {
    console.error('API GET Error:', error);
    return { status: 'error', message: error.message };
  }
}

// פונקציה לשליחת בקשות POST בטוחות (Simple Requests) למניעת בעיות CORS עם מנגנון Timeout
async function apiPost(payload = {}) {
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL === 'YOUR_GOOGLE_SCRIPT_WEB_APP_URL_HERE') {
    showToast('שגיאה: כתובת ה-API של גוגל אינה מוגדרת ב-config.js', 'error');
    return { status: 'error', message: 'כתובת ה-API אינה מוגדרת' };
  }

  // הגדרת Timeout של 45 שניות למניעת תקיעות ומתן זמן מענה ל-Google Apps Script
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    // שליחה בפורמט text/plain היא "Simple Request" ואינה דורשת OPTIONS Preflight
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'cors', // הדפדפן יעבד את ההפניה של גוגל
      headers: {
        'Content-Type': 'text/plain' 
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // בגלל השימוש ב-cors, גוגל מפנה אותנו לכתובת script.googleusercontent.com
    // הדפדפן עוקב אחר ההפניה ומחזיר את התוצאה
    const data = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('API POST Error:', error);
    if (error.name === 'AbortError') {
      return { status: 'error', message: 'שגיאת תקשורת: שרת האפליקציה לא הגיב תוך 45 שניות (קיימת איטיות זמנית בגוגל)' };
    }
    return { status: 'error', message: error.message };
  }
}

// מציג הודעת קופצת (Toast) מעוצבת
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast-container');
  const toastMsg = document.getElementById('toast-message');
  const toastIcon = document.getElementById('toast-icon');
  
  if (!toast) return;

  toastMsg.textContent = message;
  toast.className = 'toast-notification active';
  
  if (type === 'success') {
    toast.classList.add('toast-success');
    toastIcon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
  } else {
    toast.classList.add('toast-error');
    toastIcon.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i>';
  }

  setTimeout(() => {
    toast.classList.remove('active');
  }, 4000);
}

// ==========================================
// לוגיקה משותפת (חלונות מודאלים ועוד)
// ==========================================
function initCommonUI() {
  // סגירת חלונות מודאלים על ידי לחיצה על ה-X או מחוץ לחלון
  const modals = document.querySelectorAll('.modal-overlay');
  modals.forEach(modal => {
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
      });
    }
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });
}

// ==========================================
// לוגיקת פורטל המשתמשים (עמוד הבית)
// ==========================================
let allTeammates = [];

function initPortalUI() {
  // פתיחת מודאלים
  const submitIdeaBtn = document.getElementById('open-submit-idea-btn');
  const ideaModal = document.getElementById('submit-idea-modal');
  if (submitIdeaBtn && ideaModal) {
    submitIdeaBtn.addEventListener('click', () => {
      ideaModal.classList.add('active');
    });
  }

  const recruitBtn = document.getElementById('open-recruit-btn');
  const recruitBtn2 = document.getElementById('open-recruit-btn-2');
  const recruitModal = document.getElementById('recruit-modal');
  
  const openRecruit = () => {
    if (recruitModal) recruitModal.classList.add('active');
  };
  
  if (recruitBtn) recruitBtn.addEventListener('click', openRecruit);
  if (recruitBtn2) recruitBtn2.addEventListener('click', openRecruit);

  // הגשת טופס רעיון (עם Honeypot)
  const ideaForm = document.getElementById('idea-form');
  if (ideaForm) {
    ideaForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // הגנת ספאם Honeypot
      const hp = ideaForm.querySelector('input[name="email_confirm"]').value;
      if (hp) {
        console.warn('Spam detected via honeypot');
        showToast('ההרשמה התקבלה בהצלחה (Spam Filtered)');
        ideaModal.classList.remove('active');
        ideaForm.reset();
        return;
      }

      const submitBtn = ideaForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> שולח...';

      const payload = {
        action: 'submit_idea',
        title: document.getElementById('idea-title').value,
        problem: document.getElementById('idea-problem').value,
        teammates: document.getElementById('idea-teammates').value
      };

      const result = await apiPost(payload);
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> שלח מועמדות לפרויקט';

      if (result.status === 'success') {
        showToast('הרעיון שלך נרשם בהצלחה במערכת! בהצלחה 🚀');
        ideaModal.classList.remove('active');
        ideaForm.reset();
      } else {
        showToast('שגיאה בשמירת הנתונים: ' + (result.message || 'אנא נסה שוב'), 'error');
      }
    });
  }

  // הגשת מודעת גיוס שותפים (עם Honeypot)
  const recruitForm = document.getElementById('recruit-form');
  if (recruitForm) {
    recruitForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const hp = recruitForm.querySelector('input[name="email_confirm"]').value;
      if (hp) {
        showToast('המודעה פורסמה בהצלחה');
        recruitModal.classList.remove('active');
        recruitForm.reset();
        return;
      }

      const submitBtn = recruitForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> מפרסם...';

      const payload = {
        action: 'add_teammate_wanted',
        name: document.getElementById('recruit-name').value,
        department: '',
        description: document.getElementById('recruit-desc').value,
        contact: document.getElementById('recruit-contact').value
      };

      const result = await apiPost(payload);
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-share-nodes"></i> פרסם מודעה ללוח';

      if (result.status === 'success') {
        showToast('המודעה שלך נוספה ללוח בהצלחה!');
        recruitModal.classList.remove('active');
        recruitForm.reset();
        loadPortalData(); // רענון הלוח
      } else {
        showToast('שגיאה בפרסום המודעה: ' + (result.message || 'אנא נסה שוב'), 'error');
      }
    });
  }

  // טעינת נתונים ראשונית
function setTimelineDates() {
  const formatDate = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date)) return 'TBD';
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
  };
  
  // נסה לשלוף מה-window (אם עודכן), ואם לא אז מהמשתנים הגלובליים
  const hackStart = window.HACKATHON_START || (typeof HACKATHON_START !== 'undefined' ? HACKATHON_START : null);
  const regEnd = window.REGISTRATION_END || (typeof REGISTRATION_END !== 'undefined' ? REGISTRATION_END : null);
  const voteStart = window.VOTING_START || (typeof VOTING_START !== 'undefined' ? VOTING_START : null);
  const voteEnd = window.VOTING_END || (typeof VOTING_END !== 'undefined' ? VOTING_END : null);
  const hackDay = window.HACKATHON_DAY || (typeof HACKATHON_DAY !== 'undefined' ? HACKATHON_DAY : null);

  const regStartEl = document.getElementById('tl-reg-start');
  const regEndEl = document.getElementById('tl-reg-end');
  const voteStartEl = document.getElementById('tl-vote-start');
  const voteEndEl = document.getElementById('tl-vote-end');
  const hackDateEl = document.getElementById('tl-hackathon-date');
  
  if (regStartEl) regStartEl.textContent = formatDate(hackStart);
  if (regEndEl) regEndEl.textContent = formatDate(regEnd);
  if (voteStartEl) voteStartEl.textContent = formatDate(voteStart);
  if (voteEndEl) voteEndEl.textContent = formatDate(voteEnd);
  if (hackDateEl) hackDateEl.textContent = formatDate(hackDay);
}
// טעינת נתונים ראשונית
  setTimelineDates();
  loadPortalData();
}

// טעינת נתונים לפורטל הציבורי
async function loadPortalData() {
  const result = await apiGet({ action: 'get_public_data' });
  
  if (result.status === 'success') {
    // 1. עדכון לוח שותפים
    allTeammates = result.teammates || [];
    renderTeammates('all');

    // 2. עדכון לוח הרעיונות והצבעות הקהל
    const settings = result.settings || {};
    
    renderPublicIdeas(result.ideas || [], settings);

    // 3. עדכון ציר הזמן והתוצרים (POC Showcase / גמר ההאקתון)
    const finalists = result.ideas ? result.ideas.filter(idea => idea.status === 'נבחר להאקתון' || idea.status === 'זוכה') : [];
    
    const pocSection = document.getElementById('poc-showcase-section');
    const pocContainer = document.getElementById('poc-container');
    const step1 = document.getElementById('tl-step-1');
    const step2 = document.getElementById('tl-step-2');
    const step3 = document.getElementById('tl-step-3');

    // קידום ציר הזמן לפי המצב בפועל
    if (finalists.length > 0) {
      if (step1) step1.classList.remove('active');
      if (step2) step2.classList.add('active');
      
      const hasWinner = finalists.some(idea => idea.status === 'זוכה');
      if (hasWinner && step3) {
        step3.classList.add('active');
      }
    }

    const isLeaderboardPublic = settings.leaderboardPublic === true;

    if (finalists.length > 0 && isLeaderboardPublic) {
      if (pocSection && pocContainer) {
        pocSection.style.display = 'block';
        pocContainer.innerHTML = '';
        
        finalists.forEach(proj => {
          const isWinner = proj.status === 'זוכה';
          const badgeText = isWinner ? '<span class="status active" style="background: rgba(57, 255, 20, 0.15); color: var(--accent-neon); border: 1px solid var(--accent-neon);">🏆 מקום ראשון</span>' : '';
          const card = document.createElement('div');
          card.className = 'poc-card';
          card.innerHTML = `
            <div>
              <div class="poc-title">${proj.title} ${badgeText}</div>
              <div class="poc-members"><i class="fa-solid fa-users"></i> צוות: ${proj.teammates}</div>
              <div class="poc-desc">${proj.problem}</div>
            </div>
            <div>
              <a href="${proj.projectURL || '#'}" target="_blank" class="btn btn-primary" style="width: 100%; text-align: center; ${proj.projectURL ? '' : 'opacity: 0.5; pointer-events: none;'}" ${proj.projectURL ? '' : 'title="קישור לאפליקציה יופעל ביום ההאקתון"'}>
                <i class="fa-solid fa-arrow-up-right-from-square"></i> ${proj.projectURL ? 'פתח אפליקציה / POC' : 'האפליקציה תעלה בקרוב'}
              </a>
            </div>
          `;
          pocContainer.appendChild(card);
        });
      }
    } else {
      if (pocSection) pocSection.style.display = 'none';
    }

    // החלת לוגיקת השלבים והממשק הדינמית בהתאם ללוח הזמנים
    applySchedulePhaseLogic(result);
  } else {
    // שגיאה בטעינת נתונים
    const teammateContainer = document.getElementById('teammate-container');
    if (teammateContainer) {
      teammateContainer.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; color: var(--error-color); padding: 2rem;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; margin-bottom: 1rem;"></i>
          <p>שגיאה בטעינת הנתונים מגוגל שיטס. אנא ודאו שקישור ה-API ב-config.js מעודכן.</p>
        </div>
      `;
    }
  }
}

// רינדור כרטיסיות גיוס שותפים
function renderTeammates(filterDept = 'all') {
  const container = document.getElementById('teammate-container');
  if (!container) return;

  container.innerHTML = '';
  
  const filtered = allTeammates;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 2rem;">
        <i class="fa-solid fa-folder-open" style="font-size: 2rem; margin-bottom: 1rem;"></i>
        <p>אין כרגע מודעות גיוס שותפים.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(item => {
    // עיצוב קישור וואטסאפ (ניקוי מספר הטלפון)
    let cleanPhone = item.contact.replace(/[-+ \s]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '972' + cleanPhone.substring(1);
    }
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent('היי ' + item.name + ', ראיתי את המודעה שלך בפורטל האקתון מז"פ ואשמח לשמוע על הצטרפות לצוות שלך!')}`;

    const card = document.createElement('div');
    card.className = 'teammate-card';
    card.innerHTML = `
      <div class="teammate-header">
        <div class="teammate-name">${item.name}</div>
      </div>
      <div class="teammate-desc">${item.description}</div>
      <a href="${waUrl}" target="_blank" class="btn btn-secondary btn-sm" style="font-size: 0.85rem; padding: 0.5rem 1rem; width: 100%; text-align: center; border-color: rgba(57, 255, 20, 0.2);">
        <i class="fa-brands fa-whatsapp" style="color: #25d366;"></i> דבר איתי בוואטסאפ
      </a>
    `;
    container.appendChild(card);
  });
}

// שמירת מזהים שהוצבעו
function getVotedIdeas() {
  try {
    const data = localStorage.getItem('voted_ideas');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

// רינדור לוח רעיונות והצבעות ציבורי
function renderPublicIdeas(ideas = [], settings = {}) {
  const container = document.getElementById('public-ideas-container');
  if (!container) return;

  container.innerHTML = '';
  
  // סינון רעיונות שנמחקו
  const validIdeas = ideas.filter(idea => idea.status !== 'deleted');
  
  if (validIdeas.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 2rem;">
        <i class="fa-solid fa-folder-open" style="font-size: 2rem; margin-bottom: 1rem;"></i>
        <p>טרם הוגשו הצעות פרויקטים להאקתון. היו הראשונים להגיש!</p>
      </div>
    `;
    return;
  }

  const votedIdeas = getVotedIdeas();
  const votesCount = votedIdeas.length;
  
  // עדכון כיתוב סטטוס הצבעה של המשתמש
  const statusEl = document.getElementById('user-vote-status');
  if (statusEl) {
    if (settings.publicVotingActive === false) {
      statusEl.innerHTML = `<i class="fa-solid fa-lock"></i> הצבעת הקהל נעולה כעת`;
      statusEl.style.borderColor = 'rgba(239, 68, 68, 0.3)';
      statusEl.style.color = '#ef4444';
      statusEl.style.background = 'rgba(239, 68, 68, 0.1)';
    } else {
      statusEl.innerHTML = `הצבעת ל-${votesCount} מתוך 3 רעיונות`;
      statusEl.style.borderColor = 'rgba(0, 245, 212, 0.2)';
      statusEl.style.color = 'var(--accent-cyan)';
      statusEl.style.background = 'rgba(0, 245, 212, 0.1)';
    }
  }

  validIdeas.forEach(item => {
    const hasVotedThis = votedIdeas.includes(String(item.id));
    const isVotingActive = settings.publicVotingActive !== false;
    
    let btnHtml = '';
    if (hasVotedThis) {
      btnHtml = `<button class="btn-vote voted" disabled><i class="fa-solid fa-circle-check"></i> הצבעת</button>`;
    } else if (!isVotingActive) {
      btnHtml = `<button class="btn-vote" disabled title="הצבעת הקהל נעולה"><i class="fa-solid fa-lock"></i> נעול</button>`;
    } else if (votesCount >= 3) {
      btnHtml = `<button class="btn-vote" disabled title="הגעת למגבלת 3 ההצבעות"><i class="fa-solid fa-ban"></i> הצבע בעד</button>`;
    } else {
      btnHtml = `<button class="btn-vote" onclick="handleVote(${item.id})"><i class="fa-solid fa-chevron-up"></i> הצבע בעד</button>`;
    }

    const card = document.createElement('div');
    card.className = 'idea-card';
    card.innerHTML = `
      <div>
        <div class="idea-card-header">
          <div class="idea-card-title">${item.title}</div>
          <div class="idea-card-votes"><i class="fa-solid fa-fire"></i> <span>${item.votes || 0}</span></div>
        </div>
        <div class="idea-card-desc" id="desc-${item.id}">${item.problem}</div>
        <button class="btn-read-more" id="readmore-${item.id}" onclick="toggleIdeaDesc(${item.id})">
          <i class="fa-solid fa-chevron-down"></i> קרא עוד
        </button>
      </div>
      <div class="idea-card-footer">
        <div class="idea-card-author">
          <i class="fa-solid fa-users"></i> צוות: ${item.teammates}
        </div>
        ${btnHtml}
      </div>
    `;
    container.appendChild(card);
  });
}

// פתיחה/סגירה של תיאור רעיון בכרטיסיית הצבעה
window.toggleIdeaDesc = (ideaId) => {
  const desc = document.getElementById(`desc-${ideaId}`);
  const btn = document.getElementById(`readmore-${ideaId}`);
  if (!desc || !btn) return;
  const isExpanded = desc.classList.toggle('expanded');
  btn.innerHTML = isExpanded
    ? `<i class="fa-solid fa-chevron-up"></i> פחות`
    : `<i class="fa-solid fa-chevron-down"></i> קרא עוד`;
}


// לוגיקת הצבעה ציבורית
window.handleVote = async (ideaId) => {
  const votedIdeas = getVotedIdeas();
  if (votedIdeas.length >= 3) {
    showToast('ניתן להצביע לעד 3 רעיונות בלבד!', 'warning');
    return;
  }
  
  const result = await apiPost({
    action: 'vote_idea',
    ideaId: ideaId
  });
  
  if (result.status === 'success') {
    votedIdeas.push(String(ideaId));
    localStorage.setItem('voted_ideas', JSON.stringify(votedIdeas));
    showToast('הצבעתך נקלטה בהצלחה!');
    loadPortalData(); // רענון מונים
  } else {
    showToast('שגיאה בהצבעה: ' + (result.message || 'אנא נסו שוב'), 'error');
  }
};

// ==========================================
// לוגיקת הצ'אטבוט (עוזר ה-AI האישי)
// ==========================================
function initChatbotUI() {
  const toggleBtn = document.getElementById('chat-toggle-btn');
  const chatWindow = document.getElementById('chat-window');
  const closeBtn = document.getElementById('chat-close-btn');
  const sendBtn = document.getElementById('chat-send-btn');
  const chatInput = document.getElementById('chat-input');
  const messagesContainer = document.getElementById('chat-messages');

  if (!toggleBtn || !chatWindow) return;

  let chatHistory = [];

  // פתיחה/סגירה
  toggleBtn.addEventListener('click', () => {
    chatWindow.classList.toggle('active');
    if (chatWindow.classList.contains('active')) {
      chatInput.focus();
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      chatWindow.classList.remove('active');
    });
  }

  const maxBtn = document.getElementById('chat-maximize-btn');
  if (maxBtn) {
    maxBtn.addEventListener('click', () => {
      chatWindow.classList.toggle('maximized');
      const isMax = chatWindow.classList.contains('maximized');
      maxBtn.innerHTML = isMax ? '<i class="fa-solid fa-compress"></i>' : '<i class="fa-solid fa-expand"></i>';
      maxBtn.title = isMax ? 'מזער חלון' : 'הגדל חלון';
    });
  }

  const clearBtn = document.getElementById('chat-clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      messagesContainer.innerHTML = '';
      chatHistory = [];
      const phase = getCurrentPhase();
      updateChatbotWelcomeMessage(phase);
      showToast('השיחה אותחלה בהצלחה!');
    });
  }

  // שליחת הודעה
  const handleSendMessage = async () => {
    const text = chatInput.value.trim();
    if (!text) return;

    // הוספת הודעת המשתמש לממשק
    appendMessage(text, 'user');
    chatInput.value = '';

    // הוספת ההודעה להיסטוריית השיחה
    chatHistory.push({
      role: 'user',
      parts: [{ text: text }]
    });

    // שמירה על הודעות אחרונות בלבד תוך שמירה על כך שההודעה הראשונה היא תמיד של המשתמש (user)
    while (chatHistory.length > 10 || (chatHistory.length > 0 && chatHistory[0].role === 'model')) {
      chatHistory.shift();
    }

    // יצירת מפתח המתנה (Spinner) של הבוט
    const loadingId = appendLoadingMessage();

    // חסימת כפתור השליחה בזמן טעינה
    sendBtn.disabled = true;
    chatInput.disabled = true;

    try {
      // קריאת API ל-Apps Script שמתווך ל-Gemini API באופן מאובטח עם ההיסטוריה המלאה
      const result = await apiPost({
        action: 'gemini_chat',
        history: chatHistory
      });

      // הסרת ה-Spinner
      removeLoadingMessage(loadingId);

      if (result.status === 'success' && result.reply) {
        appendMessage(result.reply, 'bot');
        if (result.isError) {
          chatHistory.pop(); // נסיר את ההודעה האחרונה של המשתמש כדי לא לזהם את ההיסטוריה בשגיאות
        } else {
          // הוספת תשובת הבוט להיסטוריית השיחה
          chatHistory.push({
            role: 'model',
            parts: [{ text: result.reply }]
          });
        }
      } else {
        // שגיאה או חריגה במגבלת קצב
        const detail = result.message ? `\n(פרטי שגיאה מהשרת: ${result.message})` : '';
        appendMessage('מצטער, נראה שישנו קושי זמני בחיבור לסוכן ה-AI. אל דאגה - ניתן להירשם להאקתון, להגיש רעיון או לפרסם מודעת גיוס שותפים ישירות באמצעות הטפסים הרגילים באתר בכל עת!' + detail, 'bot');
        chatHistory.pop(); // נסיר את ההודעה שלא קיבלה מענה מההיסטוריה
      }
    } catch (e) {
      removeLoadingMessage(loadingId);
      appendMessage('מצטער, חלה שגיאה בחיבור לסוכן ה-AI.\n(פרטי שגיאה: ' + e.message + ')', 'bot');
      chatHistory.pop();
    } finally {
      // שחרור מיידי של כפתורי ההקלדה למענה רציף ומהיר
      sendBtn.disabled = false;
      chatInput.disabled = false;
      chatInput.focus();
    }
  };

  sendBtn.addEventListener('click', handleSendMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  });

  // עיבוד Markdown בסיסי לעברית (הדגשה ורשימות בולטים)
  function formatMarkdown(text) {
    let formatted = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // הדגשה: **טקסט** -> <strong>טקסט</strong>
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // רשימת בולטים (שורות המתחילות ב-* או - או •)
    formatted = formatted.split('\n').map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        return `<li style="margin-right: 1.2rem; list-style-type: disc;">${trimmed.substring(2)}</li>`;
      }
      return line;
    }).join('\n');

    // מעברי שורה
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
  }

  function appendMessage(text, sender) {
    const msg = document.createElement('div');
    msg.className = `chat-msg chat-msg-${sender}`;
    
    if (sender === 'bot') {
      const copyBtn = document.createElement('button');
      copyBtn.className = 'chat-msg-copy-btn';
      copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
      copyBtn.title = 'העתק תשובה';
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
          copyBtn.innerHTML = '<i class="fa-solid fa-check" style="color: var(--accent-neon);"></i>';
          showToast('הטקסט הועתק ללוח!');
          setTimeout(() => {
            copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
          }, 2000);
        }).catch(err => {
          console.error('Copy failed:', err);
        });
      });
      msg.appendChild(copyBtn);
      
      const contentSpan = document.createElement('span');
      contentSpan.innerHTML = formatMarkdown(text);
      msg.appendChild(contentSpan);
    } else {
      msg.innerHTML = formatMarkdown(text);
    }
    
    messagesContainer.appendChild(msg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function appendLoadingMessage() {
    const loadingId = 'loading-' + Date.now();
    const msg = document.createElement('div');
    msg.className = 'chat-msg chat-msg-bot';
    msg.id = loadingId;
    msg.innerHTML = '<i class="fa-solid fa-ellipsis fa-bounce"></i> מחשב תשובה...';
    messagesContainer.appendChild(msg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return loadingId;
  }

  function removeLoadingMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  // הוספת כפתור העתקה להודעה הראשונה (הסטטית) שב-HTML
  const initialBotMsg = messagesContainer.querySelector('.chat-msg-bot');
  if (initialBotMsg) {
    const rawText = initialBotMsg.innerText.trim();
    const copyBtn = document.createElement('button');
    copyBtn.className = 'chat-msg-copy-btn';
    copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
    copyBtn.title = 'העתק תשובה';
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(rawText).then(() => {
        copyBtn.innerHTML = '<i class="fa-solid fa-check" style="color: var(--accent-neon);"></i>';
        showToast('הטקסט הועתק ללוח!');
        setTimeout(() => {
          copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
        }, 2000);
      });
    });
    initialBotMsg.appendChild(copyBtn);
  }
}



// ============================================================================
// לוגיקה אוטומטית לניהול לוח זמנים (Save the Date, הרשמה, הצבעה, הכנה, יום האקתון)
// ============================================================================





function getChatbotWelcomeMessage(phase) {
  switch (phase) {
    case 'SAVE_THE_DATE':
      return `שלום! אני סוכן ה-AI האישי של האקתון מז"פ 2026. 🤖
      <br><br>
      ההרשמה הרשמית והגשת הרעיונות ייפתחו ביום ראשון ה-09.08.2026. 
      <br><br>
      בינתיים, אני כאן כדי לעזור לכם:
      <br>
      • <b>לעשות סיעור מוחות מוקדם</b> על רעיונות ובעיות שניתן לפתור באמצעות AI במעבדות ובזירה.
      <br>
      • לחדד את האתגר שלכם ולגבש קונספט ראשוני, כך שכאשר ההרשמה תיפתח - יהיה לכם רעיון מושלם להגשה.
      <br><br>
      על איזה קושי או משימה ידנית הייתם רוצים להתגבר בעבודתכם? ספרו לי ונחשוב יחד!`;

    case 'REGISTRATION':
      return `שלום! ההרשמה להאקתון AI 2026 פתוחה כעת ועד ה-27.08.2026! 🚀
      <br><br>
      אני כאן כדי לעזור לכם:
      <br>
      • לנסח ולזקק את תיאור הבעיה והפתרון בצורה ברורה ומדויקת.
      <br>
      • לעזור לכם לבחור שם מושך לרעיון.
      <br>
      • לענות על כל שאלה לגבי כללי ההאקתון, השלבים ולוחות הזמנים.
      <br><br>
      איזה רעיון מעניין הייתם רוצים לפתח? ספרו לי עליו!`;

    case 'VOTING':
      return `שלום! שלב ההרשמה הסתיים, ושבוע הצבעת הקהל פתוח כעת (עד ה-03.09.2026)! 🗳️
      <br><br>
      אני כאן כדי לעזור לכם:
      <br>
      • להבין את הרעיונות השונים שהוגשו על ידי שוטרי החטיבה.
      <br>
      • לעשות סיעור מוחות על איך ניתן לקחת את הרעיונות הללו לשלב הבא.
      <br><br>
      באיזה נושא או רעיון תרצו לדון היום?`;

    case 'PREPARATION':
      return `שלום! שלב הצבעת הקהל הסתיים ו-3 הפרויקטים המובילים הוכרזו! 🏆
      <br><br>
      הצוותים שעלו לגמר נמצאים כעת בעיצומה של תקופת ההיערכות וההכנות לקראת יום ההאקתון הגדול בבית המורשת (10.9).
      <br><br>
      אני זמין כאן עבורכם לשאלות, הכנות טכנולוגיות, או תכנון ה-Prompts למיזמים השונים. במה אוכל לעזור?`;

    case 'HACKATHON_DAY':
    default:
      return `שלום! יום ההאקתון הגדול הגיע! הצוותים מפתחים כעת בבית מורשת משטרת ישראל. 💻🔥
      <br><br>
      אני כאן כדי לסייע לצוותים בכתיבת Prompts, פתרון בעיות וליטוש הרעיונות בזמן אמת. בהצלחה לכולם!`;
  }
}

function updateChatbotWelcomeMessage(phase) {
  const messagesContainer = document.getElementById('chat-messages');
  if (!messagesContainer) return;
  
  let firstMsg = messagesContainer.querySelector('.chat-msg-bot');
  if (!firstMsg) {
    firstMsg = document.createElement('div');
    firstMsg.className = 'chat-msg chat-msg-bot';
    messagesContainer.insertBefore(firstMsg, messagesContainer.firstChild);
  }
  firstMsg.innerHTML = getChatbotWelcomeMessage(phase);
}

function applySchedulePhaseLogic(result) {
  const settings = result.settings || {};
  const ideas = result.ideas || [];
  const phase = getCurrentPhase();
  
  // אלמנטים בדף
  const submitIdeaBtn = document.getElementById('open-submit-idea-btn');
  const recruitBtn = document.getElementById('open-recruit-btn');
  const recruitBtn2 = document.getElementById('open-recruit-btn-2');
  const publicIdeasSection = document.getElementById('public-ideas-section');
  const teammatesSection = document.getElementById('teammates-section');
  const pocSection = document.getElementById('poc-showcase-section');
  
  const step1 = document.getElementById('tl-step-1');
  const step2 = document.getElementById('tl-step-2');
  const step3 = document.getElementById('tl-step-3');
  
  const step1Badge = document.getElementById('tl-step-1-badge');
  const step2Badge = document.getElementById('tl-step-2-badge');
  const step3Badge = document.getElementById('tl-step-3-badge');

  // איפוס קלאסים של ציר הזמן
  if (step1) step1.classList.remove('active');
  if (step2) step2.classList.remove('active');
  if (step3) step3.classList.remove('active');

  // עדכון הודעת פתיחה של צ'אט ה-AI
  updateChatbotWelcomeMessage(phase);

  const finalists = ideas.filter(idea => idea.status === 'נבחר להאקתון' || idea.status === 'זוכה');

  switch (phase) {
    case 'SAVE_THE_DATE':
      if (submitIdeaBtn) {
        submitIdeaBtn.disabled = true;
        submitIdeaBtn.innerHTML = '<i class="fa-solid fa-lock"></i> ההרשמה תיפתח ב-9.8';
      }
      if (recruitBtn) {
        recruitBtn.disabled = true;
        recruitBtn.innerHTML = '<i class="fa-solid fa-lock"></i> לוח שותפים ייפתח ב-9.8';
      }
      if (recruitBtn2) {
        recruitBtn2.disabled = true;
        recruitBtn2.innerHTML = '<i class="fa-solid fa-lock"></i> ייפתח ב-9.8';
      }
      if (publicIdeasSection) publicIdeasSection.style.display = 'none';
      if (teammatesSection) teammatesSection.style.display = 'none';
      if (pocSection) pocSection.style.display = 'none';
      
      if (step1) {
        step1.classList.add('active');
        if (step1Badge) {
          step1Badge.innerHTML = 'שלב 1 <span class="status active" style="background: rgba(234, 179, 8, 0.15); color: #eab308; border-color: rgba(234, 179, 8, 0.2);">בקרוב</span>';
        }
      }
      break;

    case 'REGISTRATION':
      if (submitIdeaBtn) {
        submitIdeaBtn.disabled = false;
        submitIdeaBtn.innerHTML = '<i class="fa-solid fa-lightbulb"></i> יש לי רעיון! להגשת מועמדות';
      }
      if (recruitBtn) {
        recruitBtn.disabled = false;
        recruitBtn.innerHTML = '<i class="fa-solid fa-users"></i> אני לבד, מחפש שותפים לצוות';
      }
      if (recruitBtn2) {
        recruitBtn2.disabled = false;
        recruitBtn2.innerHTML = '<i class="fa-solid fa-user-plus"></i> הוסף מודעה משלך';
      }
      if (publicIdeasSection) publicIdeasSection.style.display = 'block';
      if (teammatesSection) teammatesSection.style.display = 'block';
      if (pocSection) pocSection.style.display = 'none';
      
      if (step1) {
        step1.classList.add('active');
        if (step1Badge) {
          step1Badge.innerHTML = 'שלב 1 <span class="status active">פעיל כעת</span>';
        }
      }
      break;

    case 'POST_REGISTRATION':
      if (submitIdeaBtn) {
        submitIdeaBtn.disabled = true;
        submitIdeaBtn.innerHTML = '<i class="fa-solid fa-lock"></i> ההרשמה הסתיימה';
      }
      if (recruitBtn) {
        recruitBtn.disabled = true;
        recruitBtn.innerHTML = '<i class="fa-solid fa-lock"></i> לוח שותפים סגור';
      }
      if (recruitBtn2) {
        recruitBtn2.disabled = true;
        recruitBtn2.innerHTML = '<i class="fa-solid fa-lock"></i> סגור';
      }
      if (publicIdeasSection) publicIdeasSection.style.display = 'block';
      if (teammatesSection) teammatesSection.style.display = 'block';
      if (pocSection) pocSection.style.display = 'none';
      
      if (step1) {
        if (step1Badge) {
          step1Badge.innerHTML = 'שלב 1 <span class="status active" style="background: rgba(255, 255, 255, 0.1); color: var(--text-secondary); border-color: rgba(255, 255, 255, 0.15);">הסתיים</span>';
        }
      }
      if (step2) {
        step2.classList.add('active');
        if (step2Badge) {
          step2Badge.innerHTML = 'שלב 2 <span class="status active" style="background: rgba(234, 179, 8, 0.15); color: #eab308; border-color: rgba(234, 179, 8, 0.2);">ההצבעה תיפתח ב-30.8</span>';
        }
      }
      break;

    case 'VOTING':
      if (submitIdeaBtn) {
        submitIdeaBtn.disabled = true;
        submitIdeaBtn.innerHTML = '<i class="fa-solid fa-lock"></i> ההרשמה הסתיימה';
      }
      if (recruitBtn) {
        recruitBtn.disabled = true;
        recruitBtn.innerHTML = '<i class="fa-solid fa-lock"></i> לוח שותפים סגור';
      }
      if (recruitBtn2) {
        recruitBtn2.disabled = true;
        recruitBtn2.innerHTML = '<i class="fa-solid fa-lock"></i> סגור';
      }
      if (publicIdeasSection) publicIdeasSection.style.display = 'block';
      if (teammatesSection) teammatesSection.style.display = 'block';
      if (pocSection) pocSection.style.display = 'none';
      
      if (step1) {
        if (step1Badge) {
          step1Badge.innerHTML = 'שלב 1 <span class="status active" style="background: rgba(255, 255, 255, 0.1); color: var(--text-secondary); border-color: rgba(255, 255, 255, 0.15);">הסתיים</span>';
        }
      }
      if (step2) {
        step2.classList.add('active');
        if (step2Badge) {
          step2Badge.innerHTML = 'שלב 2 <span class="status active">הצבעת הקהל פעילה!</span>';
        }
      }
      break;

    case 'PREPARATION':
      if (submitIdeaBtn) {
        submitIdeaBtn.disabled = true;
        submitIdeaBtn.innerHTML = '<i class="fa-solid fa-lock"></i> ההרשמה הסתיימה';
      }
      if (recruitBtn) {
        recruitBtn.disabled = true;
        recruitBtn.innerHTML = '<i class="fa-solid fa-lock"></i> לוח שותפים סגור';
      }
      if (recruitBtn2) {
        recruitBtn2.disabled = true;
        recruitBtn2.innerHTML = '<i class="fa-solid fa-lock"></i> סגור';
      }
      if (publicIdeasSection) {
        publicIdeasSection.style.display = 'block';
        const voteStatus = document.getElementById('user-vote-status');
        if (voteStatus) {
          voteStatus.innerHTML = 'ההצבעה ננעלה';
          voteStatus.style.background = 'rgba(255, 255, 255, 0.05)';
          voteStatus.style.borderColor = 'rgba(255, 255, 255, 0.1)';
          voteStatus.style.color = 'var(--text-secondary)';
        }
      }
      if (teammatesSection) teammatesSection.style.display = 'none';
      
      if (finalists.length > 0) {
        if (pocSection) {
          pocSection.style.display = 'block';
          const pocTitle = pocSection.querySelector('.section-title');
          if (pocTitle) {
            pocTitle.innerHTML = 'שלושת הפרויקטים שעלו לגמר ומכינים POC 🛠️';
          }
        }
      } else {
        if (pocSection) pocSection.style.display = 'none';
      }
      
      if (step1) {
        if (step1Badge) {
          step1Badge.innerHTML = 'שלב 1 <span class="status active" style="background: rgba(255, 255, 255, 0.1); color: var(--text-secondary); border-color: rgba(255, 255, 255, 0.15);">הסתיים</span>';
        }
      }
      if (step2) {
        step2.classList.add('active');
        if (step2Badge) {
          step2Badge.innerHTML = 'שלב 2 <span class="status active" style="background: rgba(0, 245, 212, 0.15); color: var(--accent-cyan); border-color: rgba(0, 245, 212, 0.2);">היערכות והכנות לגמר</span>';
        }
      }
      break;

    case 'HACKATHON_DAY':
    default:
      if (submitIdeaBtn) {
        submitIdeaBtn.disabled = true;
        submitIdeaBtn.innerHTML = '<i class="fa-solid fa-lock"></i> ההרשמה הסתיימה';
      }
      if (recruitBtn) {
        recruitBtn.disabled = true;
        recruitBtn.innerHTML = '<i class="fa-solid fa-lock"></i> לוח שותפים סגור';
      }
      if (recruitBtn2) {
        recruitBtn2.disabled = true;
        recruitBtn2.innerHTML = '<i class="fa-solid fa-lock"></i> סגור';
      }
      if (teammatesSection) teammatesSection.style.display = 'none';
      if (publicIdeasSection) publicIdeasSection.style.display = 'none';
      
      if (finalists.length > 0) {
        if (pocSection) {
          pocSection.style.display = 'block';
          const pocTitle = pocSection.querySelector('.section-title');
          if (pocTitle) {
            pocTitle.innerHTML = 'התוצרים המובילים והזוכים 🏆';
          }
        }
      }
      
      if (step1) {
        if (step1Badge) {
          step1Badge.innerHTML = 'שלב 1 <span class="status active" style="background: rgba(255, 255, 255, 0.1); color: var(--text-secondary); border-color: rgba(255, 255, 255, 0.15);">הסתיים</span>';
        }
      }
      if (step2) {
        if (step2Badge) {
          step2Badge.innerHTML = 'שלב 2 <span class="status active" style="background: rgba(255, 255, 255, 0.1); color: var(--text-secondary); border-color: rgba(255, 255, 255, 0.15);">הסתיים</span>';
        }
      }
      if (step3) {
        step3.classList.add('active');
        if (step3Badge) {
          step3Badge.innerHTML = 'שלב 3 <span class="status active" style="background: rgba(57, 255, 20, 0.15); color: var(--accent-neon); border-color: rgba(57, 255, 20, 0.25);">היום הגדול!</span>';
        }
      }
      break;
  }
}

// ==========================================
// לוגיקת מערכת השיפוט (עמוד judge.html)
// ==========================================
let currentJudgeAuth = {
  username: '',
  password: '',
  judgeName: '',
  role: 'judge'
};

let judgingIdeas = [];
let judgingScores = [];
let currentIdeaToScore = null;

function initJudgeUI() {
  const loginForm = document.getElementById('judge-login-form');
  const passcodeScreen = document.getElementById('passcode-screen');
  const judgingDashboard = document.getElementById('judging-dashboard');
  const logoutBtn = document.getElementById('logout-judge-btn');

  // בדיקת התחברות שמורה מקומית בדפדפן (localStorage)
  const savedUser = localStorage.getItem('mzp_judge_user') || sessionStorage.getItem('mzp_judge_user');
  const savedPass = localStorage.getItem('mzp_judge_pass') || sessionStorage.getItem('mzp_judge_pass');
  if (savedUser && savedPass) {
    authenticateJudgeUser(savedUser, savedPass);
  }

  // טיפול בטופס התחברות
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = document.getElementById('judge-username-input').value.trim();
      const pass = document.getElementById('judge-password-input').value.trim();
      if (!user || !pass) {
        showToast('נא למלא שם משתמש וסיסמה', 'error');
        return;
      }
      await authenticateJudgeUser(user, pass);
    });
  }

  // התנתקות
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('mzp_judge_user');
      localStorage.removeItem('mzp_judge_pass');
      sessionStorage.removeItem('mzp_judge_user');
      sessionStorage.removeItem('mzp_judge_pass');
      currentJudgeAuth = { username: '', password: '', judgeName: '', role: 'judge' };
      if (passcodeScreen) passcodeScreen.style.display = 'block';
      if (judgingDashboard) judgingDashboard.style.display = 'none';
      showToast('התנתקת בהצלחה ממערכת השיפוט', 'success');
    });
  }

  // ניווט בלשוניות (Tabs)
  const tabBtns = document.querySelectorAll('.tabs-container .tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const panels = document.querySelectorAll('.tab-panel');
      panels.forEach(p => p.style.display = 'none');

      if (btn.id === 'tab-screening-btn') {
        document.getElementById('panel-screening').style.display = 'block';
      } else if (btn.id === 'tab-finals-btn') {
        document.getElementById('panel-finals').style.display = 'block';
      } else if (btn.id === 'tab-settings-btn') {
        document.getElementById('panel-settings').style.display = 'block';
      }
    });
  });

  // שליחת טופס הניקוד במודאל
  const scoreForm = document.getElementById('score-form');
  if (scoreForm) {
    scoreForm.addEventListener('submit', handleScoreSubmission);
  }
}

// אימות שופט מול השרת
async function authenticateJudgeUser(username, password) {
  showToast('מאמת פרטי התחברות...', 'success');
  const res = await apiPost({
    action: 'get_judging_data',
    username: username,
    password: password
  });

  if (res.status === 'success') {
    currentJudgeAuth = {
      username: username,
      password: password,
      judgeName: res.judgeInfo ? res.judgeInfo.judgeName : username,
      role: res.judgeInfo ? res.judgeInfo.role : 'judge'
    };

    // שמירה קבועה בדפדפן (localStorage)
    localStorage.setItem('mzp_judge_user', username);
    localStorage.setItem('mzp_judge_pass', password);

    // עדכון הממשק
    document.getElementById('passcode-screen').style.display = 'none';
    document.getElementById('judging-dashboard').style.display = 'block';

    const judgeNameEl = document.getElementById('logged-judge-name');
    const judgeRoleEl = document.getElementById('logged-judge-role');
    if (judgeNameEl) judgeNameEl.textContent = currentJudgeAuth.judgeName;
    if (judgeRoleEl) judgeRoleEl.textContent = currentJudgeAuth.role === 'admin' ? 'מנהל מערכת' : 'שופט';

    // טעינת הנתונים
    renderJudgingDashboard(res);
    showToast(`שלום ${currentJudgeAuth.judgeName}, התחברת בהצלחה!`, 'success');
  } else {
    showToast(res.message || 'שם משתמש או סיסמה שגויים', 'error');
  }
}

// טעינת נתוני שיפוט עדכניים מהשרת
async function loadJudgingData() {
  if (!currentJudgeAuth.username || !currentJudgeAuth.password) return;

  const res = await apiPost({
    action: 'get_judging_data',
    username: currentJudgeAuth.username,
    password: currentJudgeAuth.password
  });

  if (res.status === 'success') {
    renderJudgingDashboard(res);
    showToast('הנתונים רועננו בהצלחה', 'success');
  } else {
    showToast('שגיאה ברענון הנתונים: ' + res.message, 'error');
  }
}

// רינדור הדשבורד של השופט והטבלאות
function renderJudgingDashboard(data) {
  judgingIdeas = data.ideas || [];
  judgingScores = data.scores || [];

  // הרשאות פאנל ניהול - להציג כפתור ניהול רק למנהל מערכת
  const settingsTabBtn = document.getElementById('tab-settings-btn');
  if (settingsTabBtn) {
    if (currentJudgeAuth.role === 'admin') {
      settingsTabBtn.style.display = 'inline-flex';
    } else {
      settingsTabBtn.style.display = 'none';
      // במידה והשופט נמצא בטאב ניהול, נעביר אותו לטאב סינון
      if (settingsTabBtn.classList.contains('active')) {
        document.getElementById('tab-screening-btn').click();
      }
    }
  }

  renderScreeningTable(judgingIdeas);
  renderScreeningLeaderboard(judgingIdeas);
  renderFinalsTable(judgingIdeas);
  renderFinalsLeaderboard(judgingIdeas);
  renderPublicWinner(judgingIdeas);
  if (data.settings) updateSettingsUI(data.settings);
}

// שינוי הגדרות מערכת מהפנל (מנהל מערכת בלבד)
window.toggleSetting = async (key, val) => {
  if (!currentJudgeAuth.username || !currentJudgeAuth.password) {
    showToast('שגיאה: פרטי התחברות חסרים', 'error');
    return;
  }

  const allButtons = document.querySelectorAll('#panel-settings button');
  allButtons.forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = '0.6';
    btn.style.cursor = 'wait';
  });

  showToast('מעדכן הגדרת מערכת מול השרת...', 'success');

  const payload = {
    action: 'update_system_settings',
    username: currentJudgeAuth.username,
    password: currentJudgeAuth.password,
    passcode: currentJudgeAuth.password // תמיכה לאחור בגרסאות Apps Script קודמות
  };
  payload[key] = val;

  try {
    const result = await apiPost(payload);

    if (result.status === 'success') {
      showToast('ההגדרה עודכנה בהצלחה!', 'success');
      if (result.settings) {
        updateSettingsUI(result.settings);
      }
    } else {
      showToast('שגיאה בעדכון ההגדרה: ' + (result.message || 'שגיאת הרשאות'), 'error');
    }
  } catch (err) {
    showToast('שגיאת תקשורת בחיבור לשרת: ' + err.message, 'error');
  } finally {
    allButtons.forEach(btn => {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
    });
  }
};

function updateSettingsUI(settings) {
  if (!settings) return;

  // 1. הצבעת קהל
  const btnVotingEnable = document.getElementById('btn-voting-enable');
  const btnVotingDisable = document.getElementById('btn-voting-disable');
  const badgeVoting = document.getElementById('status-badge-voting');
  const isVotingActive = settings.publicVotingActive !== false;

  if (btnVotingEnable && btnVotingDisable) {
    btnVotingEnable.style.background = isVotingActive ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)';
    btnVotingEnable.style.color = isVotingActive ? 'var(--bg-color)' : 'var(--text-secondary)';
    btnVotingEnable.style.borderColor = isVotingActive ? 'var(--accent-cyan)' : 'var(--panel-border)';

    btnVotingDisable.style.background = !isVotingActive ? '#ef4444' : 'rgba(255,255,255,0.05)';
    btnVotingDisable.style.color = !isVotingActive ? '#fff' : 'var(--text-secondary)';
    btnVotingDisable.style.borderColor = !isVotingActive ? '#ef4444' : 'var(--panel-border)';
  }
  if (badgeVoting) {
    badgeVoting.textContent = isVotingActive ? 'פעיל כעת' : 'נעול כעת';
    badgeVoting.style.background = isVotingActive ? 'rgba(0,245,212,0.15)' : 'rgba(239,68,68,0.15)';
    badgeVoting.style.color = isVotingActive ? 'var(--accent-cyan)' : '#ef4444';
    badgeVoting.style.border = isVotingActive ? '1px solid rgba(0,245,212,0.3)' : '1px solid rgba(239,68,68,0.3)';
  }

  // 2. שיפוט שופטים
  const btnJudgingEnable = document.getElementById('btn-judging-enable');
  const btnJudgingDisable = document.getElementById('btn-judging-disable');
  const badgeJudging = document.getElementById('status-badge-judging');
  const isJudgingActive = settings.judgingActive !== false;

  if (btnJudgingEnable && btnJudgingDisable) {
    btnJudgingEnable.style.background = isJudgingActive ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)';
    btnJudgingEnable.style.color = isJudgingActive ? 'var(--bg-color)' : 'var(--text-secondary)';
    btnJudgingEnable.style.borderColor = isJudgingActive ? 'var(--accent-cyan)' : 'var(--panel-border)';

    btnJudgingDisable.style.background = !isJudgingActive ? '#ef4444' : 'rgba(255,255,255,0.05)';
    btnJudgingDisable.style.color = !isJudgingActive ? '#fff' : 'var(--text-secondary)';
    btnJudgingDisable.style.borderColor = !isJudgingActive ? '#ef4444' : 'var(--panel-border)';
  }
  if (badgeJudging) {
    badgeJudging.textContent = isJudgingActive ? 'פתוח לשיפוט' : 'שיפוט נעול';
    badgeJudging.style.background = isJudgingActive ? 'rgba(0,245,212,0.15)' : 'rgba(239,68,68,0.15)';
    badgeJudging.style.color = isJudgingActive ? 'var(--accent-cyan)' : '#ef4444';
    badgeJudging.style.border = isJudgingActive ? '1px solid rgba(0,245,212,0.3)' : '1px solid rgba(239,68,68,0.3)';
  }

  // 3. חשיפת תוצאות
  const btnLeaderboardEnable = document.getElementById('btn-leaderboard-enable');
  const btnLeaderboardDisable = document.getElementById('btn-leaderboard-disable');
  const badgeLeaderboard = document.getElementById('status-badge-leaderboard');
  const isLeaderboardPublic = settings.leaderboardPublic === true;

  if (btnLeaderboardEnable && btnLeaderboardDisable) {
    btnLeaderboardEnable.style.background = isLeaderboardPublic ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)';
    btnLeaderboardEnable.style.color = isLeaderboardPublic ? 'var(--bg-color)' : 'var(--text-secondary)';
    btnLeaderboardEnable.style.borderColor = isLeaderboardPublic ? 'var(--accent-cyan)' : 'var(--panel-border)';

    btnLeaderboardDisable.style.background = !isLeaderboardPublic ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)';
    btnLeaderboardDisable.style.color = !isLeaderboardPublic ? '#fff' : 'var(--text-secondary)';
    btnLeaderboardDisable.style.borderColor = !isLeaderboardPublic ? 'rgba(255,255,255,0.3)' : 'var(--panel-border)';
  }
  if (badgeLeaderboard) {
    badgeLeaderboard.textContent = isLeaderboardPublic ? 'מפורסם לציבור' : 'מוסתר מהציבור';
    badgeLeaderboard.style.background = isLeaderboardPublic ? 'rgba(57,255,20,0.15)' : 'rgba(255,255,255,0.08)';
    badgeLeaderboard.style.color = isLeaderboardPublic ? 'var(--accent-neon)' : 'var(--text-secondary)';
    badgeLeaderboard.style.border = isLeaderboardPublic ? '1px solid rgba(57,255,20,0.3)' : '1px solid rgba(255,255,255,0.15)';
  }
}

// רינדור טבלת הסינון (כל ההצעות + סטטוס דירוג אישי)
function renderScreeningTable(ideas) {
  const tbody = document.getElementById('screening-tbody');
  if (!tbody) return;

  if (ideas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">אין עדיין הצעות רעיונות במאגר.</td></tr>';
    return;
  }

  tbody.innerHTML = ideas.map(idea => {
    const isRated = idea.ratedByMe;
    const myScoreText = isRated 
      ? `<span class="badge" style="background: rgba(57, 255, 20, 0.15); color: var(--accent-neon); border: 1px solid rgba(57, 255, 20, 0.3); font-weight: bold; padding: 0.3rem 0.7rem; border-radius: 8px;"><i class="fa-solid fa-circle-check"></i> דירגת: ${idea.myAverage ? idea.myAverage.toFixed(1) : ''}</span>`
      : `<span class="badge" style="background: rgba(255, 255, 255, 0.08); color: var(--text-secondary); border: 1px solid rgba(255, 255, 255, 0.15); padding: 0.3rem 0.7rem; border-radius: 8px;"><i class="fa-regular fa-circle"></i> טרם דירגת</span>`;

    const btnText = isRated ? '<i class="fa-solid fa-pen-to-square"></i> ערוך דירוג' : '<i class="fa-solid fa-star"></i> דרג פרויקט';
    const btnClass = isRated ? 'btn-secondary' : 'btn-primary';

    return `
      <tr>
        <td><strong>#${idea.id}</strong></td>
        <td><strong>${escapeHtml(idea.title)}</strong></td>
        <td>${escapeHtml(idea.teammates || '-')}</td>
        <td style="max-width: 300px; font-size: 0.88rem; color: var(--text-secondary);">${escapeHtml(idea.problem || '-')}</td>
        <td>${myScoreText}</td>
        <td>
          <button class="btn ${btnClass}" onclick="openScoreModal(${idea.id}, 'Screening')" style="font-size: 0.85rem; padding: 0.4rem 0.8rem;">
            ${btnText}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// רינדור טבלת המובילים - שלב א' (80% שופטים + 20% הצבעת קהל)
function renderScreeningLeaderboard(ideas) {
  const tbody = document.getElementById('screening-leaderboard-tbody');
  if (!tbody) return;

  // מיון לפי finalScore בסדר יורד
  const sorted = [...ideas].sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));

  if (sorted.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">אין עדיין דירוגים להצגה.</td></tr>';
    return;
  }

  tbody.innerHTML = sorted.map((idea, index) => {
    const rank = index + 1;
    let rankBadge = `${rank}`;
    if (rank === 1) rankBadge = '🥇 מקום 1';
    else if (rank === 2) rankBadge = '🥈 מקום 2';
    else if (rank === 3) rankBadge = '🥉 מקום 3';

    const isFinalist = rank <= 3;
    const statusText = isFinalist 
      ? '<span style="color: var(--accent-neon); font-weight: bold;"><i class="fa-solid fa-arrow-up-right-dots"></i> עולה לגמר</span>'
      : '<span style="color: var(--text-secondary);">מועמד</span>';

    return `
      <tr style="${isFinalist ? 'background: rgba(0, 245, 212, 0.04);' : ''}">
        <td><strong>${rankBadge}</strong></td>
        <td><strong>${escapeHtml(idea.title)}</strong></td>
        <td>${escapeHtml(idea.teammates || '-')}</td>
        <td><strong style="color: var(--accent-cyan);">${idea.overallJudgesAvg ? idea.overallJudgesAvg.toFixed(1) : '0.0'}</strong> <small style="color: var(--text-secondary);">(${idea.judgesCount || 0} שופטים)</small></td>
        <td>${idea.publicScore ? idea.publicScore.toFixed(1) : '0.0'} <small style="color: var(--text-secondary);">(${idea.votes || 0} קולות)</small></td>
        <td><strong style="font-size: 1.1rem; color: var(--accent-neon);">${idea.finalScore ? idea.finalScore.toFixed(2) : '0.00'}</strong></td>
        <td>${statusText}</td>
      </tr>
    `;
  }).join('');
}

// רינדור פרויקטי הגמר (שלב ב')
function renderFinalsTable(ideas) {
  const tbody = document.getElementById('finals-tbody');
  if (!tbody) return;

  const finalists = [...ideas].sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0)).slice(0, 3);

  if (finalists.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">אין עדיין עולים לגמר.</td></tr>';
    return;
  }

  tbody.innerHTML = finalists.map(idea => {
    const isRated = idea.ratedByMe;
    const myScoreText = isRated 
      ? `<span class="badge" style="background: rgba(57, 255, 20, 0.15); color: var(--accent-neon); font-weight: bold; padding: 0.3rem 0.7rem; border-radius: 8px;">ציון גמר שלי: ${idea.myAverage ? idea.myAverage.toFixed(1) : ''}</span>`
      : `<span class="badge" style="background: rgba(255, 255, 255, 0.08); color: var(--text-secondary); padding: 0.3rem 0.7rem; border-radius: 8px;">טרם דירגת בגמר</span>`;

    return `
      <tr>
        <td><strong>#${idea.id}</strong></td>
        <td><strong style="color: var(--accent-cyan);">${escapeHtml(idea.title)}</strong></td>
        <td>${escapeHtml(idea.teammates || '-')}</td>
        <td>${idea.projectURL ? `<a href="${escapeHtml(idea.projectURL)}" target="_blank" class="btn btn-secondary" style="font-size: 0.8rem; padding: 0.2rem 0.6rem;"><i class="fa-solid fa-external-link"></i> פתח POC</a>` : '<span style="color: var(--text-secondary);">טרם הועלה קישור</span>'}</td>
        <td>${myScoreText}</td>
        <td>
          <button class="btn btn-primary" onclick="openScoreModal(${idea.id}, 'Finals')" style="font-size: 0.85rem; padding: 0.4rem 0.8rem;">
            <i class="fa-solid fa-trophy"></i> דרג בגמר
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// רינדור תוצאות הגמר
function renderFinalsLeaderboard(ideas) {
  const tbody = document.getElementById('finals-leaderboard-tbody');
  if (!tbody) return;

  const finalists = [...ideas].sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0)).slice(0, 3);

  if (finalists.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">אין עדיין דירוגי גמר.</td></tr>';
    return;
  }

  tbody.innerHTML = finalists.map((idea, index) => {
    const trophies = ['🏆 מקום 1 (הזוכה בפרס!)', '🥈 מקום 2', '🥉 מקום 3'];
    return `
      <tr>
        <td><strong>${trophies[index] || index + 1}</strong></td>
        <td><strong style="color: var(--accent-neon);">${escapeHtml(idea.title)}</strong></td>
        <td>${escapeHtml(idea.teammates || '-')}</td>
        <td>${idea.overallJudgesAvg ? idea.overallJudgesAvg.toFixed(1) : '0.0'}</td>
        <td>${idea.publicScore ? idea.publicScore.toFixed(1) : '0.0'}</td>
        <td><strong style="font-size: 1.15rem; color: var(--accent-cyan);">${idea.finalScore ? idea.finalScore.toFixed(2) : '0.00'}</strong></td>
        <td style="font-size: 0.85rem; color: var(--text-secondary);">${idea.myScore && idea.myScore.notes ? escapeHtml(idea.myScore.notes) : '-'}</td>
      </tr>
    `;
  }).join('');
}

// רינדור הפרויקט המוביל בקהל
function renderPublicWinner(ideas) {
  const winnerText = document.getElementById('public-winner-text');
  if (!winnerText) return;

  if (ideas.length === 0) {
    winnerText.textContent = 'אין עדיין הצבעות.';
    return;
  }

  const topVoted = [...ideas].sort((a, b) => (b.votes || 0) - (a.votes || 0))[0];
  if (topVoted && topVoted.votes > 0) {
    winnerText.innerHTML = `<strong>${escapeHtml(topVoted.title)}</strong> - ${topVoted.votes} הצבעות קהל 👑`;
  } else {
    winnerText.textContent = 'אין עדיין הצבעות קהל.';
  }
}

// פתיחת מודאל הדירוג וטעינת נתונים קודמים במידה וקיימים
function openScoreModal(ideaId, stage = 'Screening') {
  const idea = judgingIdeas.find(i => Number(i.id) === Number(ideaId));
  if (!idea) return;

  currentIdeaToScore = idea;
  const modal = document.getElementById('score-modal');
  const projectTitleEl = document.getElementById('score-modal-project-title');
  const stageTitleEl = document.getElementById('score-modal-stage-title');
  const projectIdInput = document.getElementById('score-project-id');
  const stageNameInput = document.getElementById('score-stage-name');
  const judgeNameInput = document.getElementById('judge-name-input');
  const relevanceInput = document.getElementById('score-relevance');
  const feasibilityInput = document.getElementById('score-feasibility');
  const innovationInput = document.getElementById('score-innovation');
  const notesInput = document.getElementById('score-notes');

  if (projectTitleEl) projectTitleEl.textContent = `ניקוד: ${idea.title}`;
  if (stageTitleEl) stageTitleEl.textContent = stage === 'Finals' ? 'שיפוט הגמר (POC)' : 'שלב א\': סינון והערכה';
  if (projectIdInput) projectIdInput.value = idea.id;
  if (stageNameInput) stageNameInput.value = stage;
  if (judgeNameInput) {
    judgeNameInput.value = currentJudgeAuth.judgeName;
    judgeNameInput.readOnly = true;
  }

  // במידה והשופט כבר דירג רעיון זה - טעינת הציונים הקודמים לעריכה
  if (idea.myScore) {
    if (relevanceInput) relevanceInput.value = idea.myScore.relevance || '5';
    if (feasibilityInput) feasibilityInput.value = idea.myScore.feasibility || '5';
    if (innovationInput) innovationInput.value = idea.myScore.innovation || '5';
    if (notesInput) notesInput.value = idea.myScore.notes || '';
  } else {
    if (relevanceInput) relevanceInput.value = '5';
    if (feasibilityInput) feasibilityInput.value = '5';
    if (innovationInput) innovationInput.value = '5';
    if (notesInput) notesInput.value = '';
  }

  if (modal) modal.classList.add('active');
}

// שמירת/עדכון הציון מול השרת
async function handleScoreSubmission(e) {
  e.preventDefault();

  const ideaId = document.getElementById('score-project-id').value;
  const relevance = Number(document.getElementById('score-relevance').value);
  const feasibility = Number(document.getElementById('score-feasibility').value);
  const innovation = Number(document.getElementById('score-innovation').value);
  const notes = document.getElementById('score-notes').value.trim();

  // סגירת החלון המודאלי מידית וחזרה למסך השיפוט
  const modal = document.getElementById('score-modal');
  if (modal) modal.classList.remove('active');

  showToast('שומר ציון במערכת...', 'success');

  const payload = {
    action: 'submit_score',
    username: currentJudgeAuth.username,
    password: currentJudgeAuth.password,
    judgeName: currentJudgeAuth.judgeName,
    ideaId: Number(ideaId),
    relevance: relevance,
    feasibility: feasibility,
    innovation: innovation,
    notes: notes
  };

  const res = await apiPost(payload);

  if (res.status === 'success') {
    showToast(res.action === 'updated' ? 'הדירוג עודכן בהצלחה!' : 'הדירוג נשמר בהצלחה!', 'success');
    await loadJudgingData();
  } else {
    showToast('שגיאה בשמירת הציון: ' + res.message, 'error');
  }
}

// פונקציית עזר לסינון תגיות HTML למניעת XSS
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
