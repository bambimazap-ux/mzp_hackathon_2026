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

// פונקציה לשליחת בקשות POST בטוחות (Simple Requests) למניעת בעיות CORS
async function apiPost(payload = {}) {
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL === 'YOUR_GOOGLE_SCRIPT_WEB_APP_URL_HERE') {
    showToast('שגיאה: כתובת ה-API של גוגל אינה מוגדרת ב-config.js', 'error');
    return { status: 'error', message: 'כתובת ה-API אינה מוגדרת' };
  }

  try {
    // שליחה בפורמט text/plain היא "Simple Request" ואינה דורשת OPTIONS Preflight
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'cors', // הדפדפן יעבד את ההפניה של גוגל
      headers: {
        'Content-Type': 'text/plain' 
      },
      body: JSON.stringify(payload)
    });
    
    // בגלל השימוש ב-cors, גוגל מפנה אותנו לכתובת script.googleusercontent.com
    // הדפדפן עוקב אחר ההפניה ומחזיר את התוצאה
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API POST Error:', error);
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
        <div class="idea-card-desc">${item.problem}</div>
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

  // שליחת הודעה
  const handleSendMessage = async () => {
    const text = chatInput.value.trim();
    if (!text) return;

    // הוספת הודעת המשתמש לממשק
    appendMessage(text, 'user');
    chatInput.value = '';

    // יצירת מפתח המתנה (Spinner) של הבוט
    const loadingId = appendLoadingMessage();

    // חסימת כפתור השליחה ל-5 שניות לצורך מניעת ספאם (Throttling)
    sendBtn.disabled = true;
    chatInput.disabled = true;

    try {
      // קריאת API ל-Apps Script שמתווך ל-Gemini API באופן מאובטח
      const result = await apiPost({
        action: 'gemini_chat',
        message: text
      });

      // הסרת ה-Spinner
      removeLoadingMessage(loadingId);

      if (result.status === 'success' && result.reply) {
        appendMessage(result.reply, 'bot');
      } else {
        // שגיאה או חריגה במגבלת קצב
        const detail = result.message ? `\n(פרטי שגיאה מהשרת: ${result.message})` : '';
        appendMessage('מצטער, סוכן ה-AI עמוס כרגע או שקיים קושי בחיבור. אל דאגה - ניתן להירשם או להעלות שותפים ישירות באמצעות הטפסים הסטנדרטיים באתר!' + detail, 'bot');
      }
    } catch (e) {
      removeLoadingMessage(loadingId);
      appendMessage('מצטער, חלה שגיאה בחיבור לסוכן ה-AI.\n(פרטי שגיאה: ' + e.message + ')', 'bot');
    } finally {
      // הפעלת מנגנון השהיית כפתור
      setTimeout(() => {
        sendBtn.disabled = false;
        chatInput.disabled = false;
        chatInput.focus();
      }, 5000); // 5 שניות הגבלת קצב
    }
  };

  sendBtn.addEventListener('click', handleSendMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  });

  function appendMessage(text, sender) {
    const msg = document.createElement('div');
    msg.className = `chat-msg chat-msg-${sender}`;
    // המרת ירידות שורה ל-<br>
    msg.innerHTML = text.replace(/\n/g, '<br>');
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
}

// ==========================================
// לוגיקת פורטל השופטים (הזנת ציונים)
// ==========================================
let currentPasscode = '';
let allIdeas = [];
let allScores = [];

function initJudgeUI() {
  const verifyBtn = document.getElementById('verify-passcode-btn');
  const passcodeField = document.getElementById('judge-passcode-input');
  
  if (verifyBtn) {
    verifyBtn.addEventListener('click', async () => {
      const passcode = passcodeField.value.trim();
      if (!passcode) return;

      verifyBtn.disabled = true;
      verifyBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> מתחבר...';

      // בדיקת תקינות מול השרת (Apps Script)
      const result = await apiPost({
        action: 'verify_judge',
        passcode: passcode
      });

      verifyBtn.disabled = false;
      verifyBtn.innerHTML = '<i class="fa-solid fa-lock-open"></i> התחבר למערכת';

      if (result.status === 'success') {
        currentPasscode = passcode;
        showToast('החיבור הצליח! ברוכים הבאים למערכת השיפוט.');
        
        // מעבר מסך
        document.getElementById('passcode-screen').style.display = 'none';
        document.getElementById('judging-dashboard').style.display = 'block';

        // הגדרת טאבים
        initJudgeTabs();
        
        // טעינת נתונים
        loadJudgingData();
      } else {
        showToast('קוד הגישה שגוי. אנא נסו שוב.', 'error');
        passcodeField.value = '';
      }
    });
  }

  // הגשת טופס ניקוד פרויקט
  const scoreForm = document.getElementById('score-form');
  const scoreModal = document.getElementById('score-modal');
  
  if (scoreForm) {
    scoreForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = scoreForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> שומר...';

      const payload = {
        action: 'submit_score',
        passcode: currentPasscode, // העברת הסיסמה לאימות צד שרת
        judgeName: document.getElementById('judge-name-input').value,
        ideaId: document.getElementById('score-project-id').value,
        relevance: Number(document.getElementById('score-relevance').value),
        feasibility: Number(document.getElementById('score-feasibility').value),
        innovation: Number(document.getElementById('score-innovation').value),
        notes: document.getElementById('score-notes').value
      };

      const result = await apiPost(payload);
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> שמור ושלח ציון במערכת';

      if (result.status === 'success') {
        showToast('הציון נשמר בהצלחה בגיליון גוגל!');
        scoreModal.classList.remove('active');
        scoreForm.reset();
        
        // רענון נתונים
        loadJudgingData();
      } else {
        showToast('שגיאה בשמירת הציון: ' + (result.message || 'שגיאת אבטחה'), 'error');
      }
    });
  }
}

// הגדרת מעבר בין טאבים בשיפוט
// הגדרת מעבר בין טאבים בשיפוט
function initJudgeTabs() {
  const btnScreening = document.getElementById('tab-screening-btn');
  const btnFinals = document.getElementById('tab-finals-btn');
  const btnSettings = document.getElementById('tab-settings-btn');
  
  const panelScreening = document.getElementById('panel-screening');
  const panelFinals = document.getElementById('panel-finals');
  const panelSettings = document.getElementById('panel-settings');

  if (btnScreening && btnFinals && panelScreening && panelFinals) {
    btnScreening.addEventListener('click', () => {
      btnScreening.classList.add('active');
      btnFinals.classList.remove('active');
      if (btnSettings) btnSettings.classList.remove('active');
      
      panelScreening.style.display = 'block';
      panelFinals.style.display = 'none';
      if (panelSettings) panelSettings.style.display = 'none';
    });

    btnFinals.addEventListener('click', () => {
      btnFinals.classList.add('active');
      btnScreening.classList.remove('active');
      if (btnSettings) btnSettings.classList.remove('active');
      
      panelFinals.style.display = 'block';
      panelScreening.style.display = 'none';
      if (panelSettings) panelSettings.style.display = 'none';
    });

    if (btnSettings && panelSettings) {
      btnSettings.addEventListener('click', () => {
        btnSettings.classList.add('active');
        btnScreening.classList.remove('active');
        btnFinals.classList.remove('active');
        
        panelSettings.style.display = 'block';
        panelScreening.style.display = 'none';
        panelFinals.style.display = 'none';
      });
    }
  }
}

// עדכון כפתורי הגדרות הניהול
function updateSettingsUI(settings) {
  if (!settings) return;

  // 1. כפתורי הצבעת קהל
  const btnVotingEnable = document.getElementById('btn-voting-enable');
  const btnVotingDisable = document.getElementById('btn-voting-disable');
  if (btnVotingEnable && btnVotingDisable) {
    if (settings.publicVotingActive !== false) {
      btnVotingEnable.className = 'btn btn-primary';
      btnVotingDisable.className = 'btn btn-secondary';
      btnVotingDisable.style.color = '#ef4444';
    } else {
      btnVotingEnable.className = 'btn btn-secondary';
      btnVotingDisable.className = 'btn btn-primary';
      btnVotingDisable.style.color = '#fff';
    }
  }

  // 2. כפתורי שיפוט שופטים
  const btnJudgingEnable = document.getElementById('btn-judging-enable');
  const btnJudgingDisable = document.getElementById('btn-judging-disable');
  if (btnJudgingEnable && btnJudgingDisable) {
    if (settings.judgingActive !== false) {
      btnJudgingEnable.className = 'btn btn-primary';
      btnJudgingDisable.className = 'btn btn-secondary';
      btnJudgingDisable.style.color = '#ef4444';
    } else {
      btnJudgingEnable.className = 'btn btn-secondary';
      btnJudgingDisable.className = 'btn btn-primary';
      btnJudgingDisable.style.color = '#fff';
    }
  }

  // 3. כפתורי פרסום תוצאות
  const btnLeaderboardEnable = document.getElementById('btn-leaderboard-enable');
  const btnLeaderboardDisable = document.getElementById('btn-leaderboard-disable');
  if (btnLeaderboardEnable && btnLeaderboardDisable) {
    if (settings.leaderboardPublic === true) {
      btnLeaderboardEnable.className = 'btn btn-primary';
      btnLeaderboardDisable.className = 'btn btn-secondary';
    } else {
      btnLeaderboardEnable.className = 'btn btn-secondary';
      btnLeaderboardDisable.className = 'btn btn-primary';
    }
  }
}

// שינוי הגדרות ניהול מהפנל
window.toggleSetting = async (key, val) => {
  if (!currentPasscode) return;

  const payload = {
    action: 'update_system_settings',
    passcode: currentPasscode
  };
  payload[key] = val;

  const result = await apiPost(payload);
  
  if (result.status === 'success') {
    showToast('ההגדרה עודכנה בהצלחה!');
    updateSettingsUI(result.settings);
  } else {
    showToast('שגיאה בעדכון ההגדרה: ' + result.message, 'error');
  }
};

// טעינת כל נתוני השיפוט (מצריך סיסמה מאומתת)
async function loadJudgingData() {
  if (!currentPasscode) return;

  const result = await apiPost({
    action: 'get_judging_data',
    passcode: currentPasscode
  });

  if (result.status === 'success') {
    allIdeas = result.ideas || [];
    allScores = result.scores || [];
    
    // רינדור שלב א' - סינון והערכה
    renderScreeningPanel();

    // רינדור שלב ב' - הגמר
    renderFinalsPanel();

    // עדכון הגדרות ניהול
    updateSettingsUI(result.settings);

    // חישוב חביב הקהל
    if (allIdeas.length > 0) {
      let maxVotes = -1;
      let winner = null;
      allIdeas.forEach(idea => {
        const v = Number(idea.votes) || 0;
        if (v > maxVotes && idea.status !== 'deleted') {
          maxVotes = v;
          winner = idea;
        }
      });

      const winnerTextEl = document.getElementById('public-winner-text');
      if (winnerTextEl) {
        if (winner && maxVotes > 0) {
          winnerTextEl.innerHTML = `הפרויקט <strong>"${winner.title}"</strong> (של ${winner.teammates}) מוביל כעת עם <strong>${maxVotes}</strong> הצבעות מהקהל!`;
        } else {
          winnerTextEl.innerHTML = `אין עדיין הצבעות מהקהל לפרויקטים.`;
        }
      }
    }
  } else {
    showToast('שגיאה במשיכת נתוני שיפוט: ' + result.message, 'error');
  }
}

// רינדור לוחות שלב א'
function renderScreeningPanel() {
  const tbody = document.getElementById('screening-tbody');
  const leaderboardTbody = document.getElementById('screening-leaderboard-tbody');

  if (!tbody || !leaderboardTbody) return;

  tbody.innerHTML = '';
  leaderboardTbody.innerHTML = '';

  // 1. טבלת הערכת הגשות
  if (allIdeas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">אין עדיין הגשות במערכת.</td></tr>';
  } else {
    allIdeas.forEach(idea => {
      // חישוב ממוצע ציונים לפרויקט זה (מכל השופטים)
      const projectScores = allScores.filter(s => String(s.ideaId) === String(idea.id));
      let avgDisplay = '-';
      if (projectScores.length > 0) {
        const sum = projectScores.reduce((acc, curr) => acc + Number(curr.average), 0);
        avgDisplay = (sum / projectScores.length).toFixed(2);
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${idea.id}</td>
        <td style="font-weight: 700;">${idea.title}</td>
        <td>${idea.teammates}</td>
        <td style="font-size: 0.9rem; color: var(--text-secondary); max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${idea.problem}">${idea.problem}</td>
        <td><span class="score-badge ${getScoreBadgeClass(avgDisplay)}">${avgDisplay}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="openScoreModal('${idea.id}', '${idea.title.replace(/'/g, "\\'")}', 'Screening')" style="padding: 0.4rem 1rem; font-size: 0.85rem;">
            <i class="fa-solid fa-pen-to-square"></i> הזן/עדכן ציון
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // 2. טבלת מובילים (Leaderboard) - מחושבת וממוינת
  const ratedProjects = allIdeas.map(idea => {
    const projectScores = allScores.filter(s => String(s.ideaId) === String(idea.id));
    let relSum = 0, feaSum = 0, innSum = 0, wAvg = 0;
    
    if (projectScores.length > 0) {
      projectScores.forEach(s => {
        relSum += Number(s.relevance);
        feaSum += Number(s.feasibility);
        innSum += Number(s.innovation);
      });
      const len = projectScores.length;
      const relAvg = relSum / len;
      const feaAvg = feaSum / len;
      const innAvg = innSum / len;
      wAvg = (relAvg + feaAvg + innAvg) / 3;

      return {
        ...idea,
        relAvg: relAvg.toFixed(1),
        feaAvg: feaAvg.toFixed(1),
        innAvg: innAvg.toFixed(1),
        wAvg: wAvg
      };
    } else {
      return {
        ...idea,
        relAvg: '-',
        feaAvg: '-',
        innAvg: '-',
        wAvg: 0
      };
    }
  });

  // מיון מהגבוה לנמוך
  ratedProjects.sort((a, b) => b.wAvg - a.wAvg);

  if (ratedProjects.length === 0 || ratedProjects.every(p => p.wAvg === 0)) {
    leaderboardTbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-secondary);">אין עדיין מספיק דירוגים לחישוב טבלת מובילים.</td></tr>';
  } else {
    ratedProjects.forEach((proj, idx) => {
      const isTop3 = idx < 3 && proj.wAvg > 0;
      const statusBadge = isTop3 
        ? `<span class="score-badge score-badge-high"><i class="fa-solid fa-circle-check"></i> עולה לגמר</span>`
        : `<span class="score-badge score-badge-low">מועמד</span>`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 900; color: ${isTop3 ? 'var(--accent-cyan)' : 'inherit'};">${idx + 1}</td>
        <td style="font-weight: 700;">${proj.title}</td>
        <td>${proj.teammates}</td>
        <td>${proj.relAvg}</td>
        <td>${proj.feaAvg}</td>
        <td>${proj.innAvg}</td>
        <td><strong style="color: var(--accent-neon);">${proj.wAvg > 0 ? proj.wAvg.toFixed(2) : '-'}</strong></td>
        <td>${statusBadge}</td>
      `;
      leaderboardTbody.appendChild(tr);
    });
  }
}

// רינדור לוחות שלב ב' (הגמר)
function renderFinalsPanel() {
  const tbody = document.getElementById('finals-tbody');
  const leaderboardTbody = document.getElementById('finals-leaderboard-tbody');

  if (!tbody || !leaderboardTbody) return;

  tbody.innerHTML = '';
  leaderboardTbody.innerHTML = '';

  // 1. הגדרת פרויקטים בגמר (סטטוס "נבחר להאקתון" או "זוכה")
  const finalists = allIdeas.filter(idea => idea.status === 'נבחר להאקתון' || idea.status === 'זוכה');

  if (finalists.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 2rem;">טרם נקבעו עולים לגמר. יש לסיים את שלב א\' ולעדכן סטטוס פרויקטים בגיליון.</td></tr>';
    leaderboardTbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-secondary);">לוח הגמר יתעדכן לאחר בחירת העולים לגמר.</td></tr>';
    return;
  }

  // טבלת דירוג הגמר
  finalists.forEach(idea => {
    // משיכת ציונים של גמר בלבד (כדי להפריד משלב א')
    // אנחנו מניחים שהזנת ציוני גמר מתבצעת עם שם שופט או הערה מתאימה, 
    // לצורך הפשטות, בממשק הגמר אנו מזינים ציון רגיל בטבלת הציונים.
    // אם רוצים להבדיל, ב-Apps Script אפשר לתייג זאת. כאן נתייחס לציונים שנוספו בזמן שלב הגמר.
    const projectScores = allScores.filter(s => String(s.ideaId) === String(idea.id));
    let avgDisplay = '-';
    if (projectScores.length > 0) {
      const sum = projectScores.reduce((acc, curr) => acc + Number(curr.average), 0);
      avgDisplay = (sum / projectScores.length).toFixed(2);
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idea.id}</td>
      <td style="font-weight: 700; color: var(--accent-neon);">${idea.title}</td>
      <td>${idea.teammates}</td>
      <td>
        <a href="${idea.projectURL || '#'}" target="_blank" class="btn btn-secondary btn-sm" style="${idea.projectURL ? '' : 'opacity:0.5; pointer-events:none;'}; padding: 0.3rem 0.8rem; font-size: 0.85rem;">
          <i class="fa-solid fa-arrow-up-right-from-square"></i> ${idea.projectURL ? 'פתח אפליקציית POC' : 'אין קישור (ערוך בגיליון)'}
        </a>
      </td>
      <td><span class="score-badge ${getScoreBadgeClass(avgDisplay)}">${avgDisplay}</span></td>
      <td>
        <button class="btn btn-accent btn-sm" onclick="openScoreModal('${idea.id}', '${idea.title.replace(/'/g, "\\'")}', 'Finals')" style="padding: 0.4rem 1rem; font-size: 0.85rem;">
          <i class="fa-solid fa-gavel"></i> דרג בגמר
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // 2. טבלת מובילים גמר (Leaderboard Finals)
  const ratedFinalists = finalists.map(idea => {
    const projectScores = allScores.filter(s => String(s.ideaId) === String(idea.id));
    let relSum = 0, feaSum = 0, innSum = 0, wAvg = 0;
    let notes = [];
    
    if (projectScores.length > 0) {
      projectScores.forEach(s => {
        relSum += Number(s.relevance);
        feaSum += Number(s.feasibility);
        innSum += Number(s.innovation);
        if (s.notes) notes.push(`${s.judgeName}: "${s.notes}"`);
      });
      const len = projectScores.length;
      wAvg = (relSum + feaSum + innSum) / (3 * len);

      return {
        ...idea,
        relAvg: (relSum / len).toFixed(1),
        feaAvg: (feaSum / len).toFixed(1),
        innAvg: (innSum / len).toFixed(1),
        wAvg: wAvg,
        notes: notes.join('<br>')
      };
    } else {
      return {
        ...idea,
        relAvg: '-',
        feaAvg: '-',
        innAvg: '-',
        wAvg: 0,
        notes: 'אין עדיין הערות.'
      };
    }
  });

  // מיון מהגבוה לנמוך
  ratedFinalists.sort((a, b) => b.wAvg - a.wAvg);

  ratedFinalists.forEach((proj, idx) => {
    const placeBadge = idx === 0 && proj.wAvg > 0
      ? '<span class="status active" style="background:rgba(57,255,20,0.15); color:var(--accent-neon); border:1px solid var(--accent-neon); margin-right:0.5rem;">🏆 זוכה במקום הראשון</span>'
      : '';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight: 900; font-size: 1.2rem; color: var(--accent-cyan);">${idx + 1}</td>
      <td style="font-weight: 700;">${proj.title} ${placeBadge}</td>
      <td>${proj.teammates}</td>
      <td>${proj.relAvg}</td>
      <td>${proj.feaAvg}</td>
      <td>${proj.innAvg}</td>
      <td><strong style="color: var(--accent-neon); font-size: 1.1rem;">${proj.wAvg > 0 ? proj.wAvg.toFixed(2) : '-'}</strong></td>
      <td style="font-size: 0.85rem; color: var(--text-secondary); text-align: right; max-width: 300px; white-space: normal;">${proj.notes}</td>
    `;
    leaderboardTbody.appendChild(tr);
  });
}

// מציג קלאס מתאים לציון
function getScoreBadgeClass(val) {
  if (val === '-') return '';
  const num = Number(val);
  if (num >= 4.0) return 'score-badge-high';
  if (num >= 2.5) return 'score-badge-med';
  return 'score-badge-low';
}

// פתיחת מודאל הזנת ציון פרויקט
window.openScoreModal = function(id, title, stage) {
  const modal = document.getElementById('score-modal');
  const inputId = document.getElementById('score-project-id');
  const inputTitle = document.getElementById('score-modal-project-title');
  const inputStage = document.getElementById('score-modal-stage-title');
  const inputStageName = document.getElementById('score-stage-name');

  if (modal && inputId && inputTitle && inputStage) {
    inputId.value = id;
    inputTitle.textContent = `הזנת ציון עבור: ${title}`;
    inputStageName.value = stage;
    inputStage.textContent = stage === 'Screening' ? "שלב א': סינון והערכת הגשות" : "שלב ב': גמר ההאקתון - הערכת תוצר ה-POC";
    
    modal.classList.add('active');
  }
};
