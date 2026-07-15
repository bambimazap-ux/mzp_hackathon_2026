/**
 * קוד שרת Google Apps Script עבור פורטל האקתון AI מז"פ 2026
 * 
 * הוראות התקנה:
 * 1. פתח גיליון Google Sheets חדש בשם "האקתון AI 2026".
 * 2. צור 3 לשוניות (Tabs) בשמות המדויקים הבאים:
 *    - "Ideas"
 *    - "Teammates"
 *    - "Scores"
 * 3. בשורה הראשונה של כל גיליון (כותרות) הגדר את העמודות הבאות:
 *    - בגיליון Ideas: ID | Timestamp | Title | Problem | Teammates | Status | ProjectURL
 *    - בגיליון Teammates: ID | Timestamp | Name | Department | Description | Contact
 *    - בגיליון Scores: ID | Timestamp | JudgeName | IdeaID | Relevance | Feasibility | Innovation | Notes | Average
 * 4. תחת "הרחבות" (Extensions) -> "Apps Script", מחק את הקוד הקיים והדבק את הקוד הבא.
 * 5. (אופציונלי עבור הצ'אטבוט) בהגדרות הפרויקט (אייקון גלגל השיניים), תחת "Script Properties", הוסף מאפיין חדש:
 *    - Key: GEMINI_API_KEY | Value: [מפתח ה-API שלך מ-Google AI Studio]
 *    - Key: JUDGE_PASSCODE | Value: mzp_judge_2026 (או כל סיסמה אחרת שתרצה)
 * 6. לחץ על "Deploy" -> "New deployment" -> בחר סוג "Web app".
 *    - Execute as: "Me" (החשבון שלך)
 *    - Who has access: "Anyone"
 * 7. העתק את הקישור שקיבלת והדבק אותו בקובץ config.js.
 */

// הגדרות ברירת מחדל
const DEFAULT_PASSCODE = "mzp_judge_2026";
const GEMINI_MODEL = "gemini-3.1-flash-lite";

// ==========================================
// 1. טיפול בבקשות GET (משיכת נתונים ציבוריים)
// ==========================================
function doGet(e) {
  var action = e.parameter.action;
  var response = {};

  try {
    if (action === "get_public_data") {
      response = getPublicData();
    } else {
      response = { status: "error", message: "Action not found or GET not supported for this action" };
    }
  } catch (error) {
    response = { status: "error", message: error.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(response))
                       .setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// 2. טיפול בבקשות POST (שמירת נתונים, שיפוט וצ'אט)
// ==========================================
function doPost(e) {
  var response = {};
  
  try {
    // פענוח גוף הבקשה (מגיע כ-text/plain כדי למנוע בקשת Preflight OPTIONS CORS)
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;

    if (action === "submit_idea") {
      response = submitIdea(payload);
    } else if (action === "add_teammate_wanted") {
      response = addTeammateWanted(payload);
    } else if (action === "verify_judge") {
      response = verifyJudge(payload.passcode);
    } else if (action === "get_judging_data") {
      response = getJudgingData(payload.passcode);
    } else if (action === "submit_score") {
      response = submitScore(payload);
    } else if (action === "vote_idea") {
      response = voteIdea(payload);
    } else if (action === "get_system_settings") {
      response = getSystemSettings();
    } else if (action === "update_system_settings") {
      response = updateSystemSettings(payload);
    } else if (action === "gemini_chat") {
      response = handleGeminiChat(payload.message);
    } else {
      response = { status: "error", message: "Action not supported" };
    }
  } catch (error) {
    response = { status: "error", message: "Server error: " + error.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(response))
                       .setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// 3. פונקציות הליבה של בסיס הנתונים
// ==========================================

// משיכת נתונים לפאנל הציבורי (רעיונות ושותפים) - ללא ציונים חסויים
function getPublicData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. קריאת רעיונות (8 עמודות כולל הצבעות)
  var ideasSheet = ss.getSheetByName("Ideas");
  var ideas = [];
  if (ideasSheet && ideasSheet.getLastRow() > 1) {
    var data = ideasSheet.getRange(2, 1, ideasSheet.getLastRow() - 1, 8).getValues();
    ideas = data.map(function(row) {
      return {
        id: row[0],
        timestamp: row[1],
        title: row[2],
        problem: row[3],
        teammates: row[4],
        status: row[5],
        projectURL: row[6],
        votes: Number(row[7]) || 0
      };
    });
  }

  // 2. קריאת שותפים
  var teammatesSheet = ss.getSheetByName("Teammates");
  var teammates = [];
  if (teammatesSheet && teammatesSheet.getLastRow() > 1) {
    var data = teammatesSheet.getRange(2, 1, teammatesSheet.getLastRow() - 1, 6).getValues();
    teammates = data.map(function(row) {
      return {
        id: row[0],
        timestamp: row[1],
        name: row[2],
        department: row[3],
        description: row[4],
        contact: String(row[5])
      };
    });
  }

  var settings = getSystemSettings();

  return {
    status: "success",
    ideas: ideas,
    teammates: teammates,
    settings: settings
  };
}

// שמירת רעיון חדש (מוגן מפני נעילות באמצעות LockService)
function submitIdea(payload) {
  var lock = LockService.getScriptLock();
  try {
    // המתנה של עד 15 שניות לקבלת נעילת כתיבה
    lock.waitLock(15000);
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Ideas");
    if (!sheet) return { status: "error", message: "Ideas sheet not found" };

    var lastRow = sheet.getLastRow();
    var nextId = 1;
    if (lastRow > 1) {
      // יצירת מזהה רץ אוטומטי
      nextId = Number(sheet.getRange(lastRow, 1).getValue()) + 1;
    }

    var timestamp = new Date();
    // עמודות: ID | Timestamp | Title | Problem | Teammates | Status | ProjectURL | Votes
    sheet.appendRow([
      nextId, 
      timestamp, 
      payload.title, 
      payload.problem, 
      payload.teammates, 
      "מועמד", 
      "",
      0 // Votes initialized to 0
    ]);

    return { status: "success", id: nextId };
  } catch (error) {
    return { status: "error", message: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

// שמירת מודעת גיוס שותפים חדשה (מוגן מפני נעילות)
function addTeammateWanted(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Teammates");
    if (!sheet) return { status: "error", message: "Teammates sheet not found" };

    var lastRow = sheet.getLastRow();
    var nextId = 1;
    if (lastRow > 1) {
      nextId = Number(sheet.getRange(lastRow, 1).getValue()) + 1;
    }

    var timestamp = new Date();
    // עמודות: ID | Timestamp | Name | Department | Description | Contact
    sheet.appendRow([
      nextId, 
      timestamp, 
      payload.name, 
      payload.department, 
      payload.description, 
      payload.contact
    ]);

    return { status: "success", id: nextId };
  } catch (error) {
    return { status: "error", message: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

// אימות סיסמת שופט
function verifyJudge(passcode) {
  var props = PropertiesService.getScriptProperties();
  var actualPasscode = props.getProperty("JUDGE_PASSCODE") || DEFAULT_PASSCODE;
  
  if (passcode === actualPasscode) {
    return { status: "success" };
  } else {
    return { status: "error", message: "Invalid passcode" };
  }
}

// משיכת נתוני שיפוט מלאים (מצריך אימות סיסמה צד שרת)
function getJudgingData(passcode) {
  var auth = verifyJudge(passcode);
  if (auth.status !== "success") {
    return { status: "error", message: "Access Denied" };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. משיכת רעיונות (כל העמודות)
  var ideasSheet = ss.getSheetByName("Ideas");
  var ideas = [];
  if (ideasSheet && ideasSheet.getLastRow() > 1) {
    var data = ideasSheet.getRange(2, 1, ideasSheet.getLastRow() - 1, 7).getValues();
    ideas = data.map(function(row) {
      return {
        id: row[0],
        timestamp: row[1],
        title: row[2],
        problem: row[3],
        teammates: row[4],
        status: row[5],
        projectURL: row[6]
      };
    });
  }

  // 2. משיכת ציונים
  var scoresSheet = ss.getSheetByName("Scores");
  var scores = [];
  if (scoresSheet && scoresSheet.getLastRow() > 1) {
    var data = scoresSheet.getRange(2, 1, scoresSheet.getLastRow() - 1, 9).getValues();
    scores = data.map(function(row) {
      return {
        id: row[0],
        timestamp: row[1],
        judgeName: row[2],
        ideaId: row[3],
        relevance: row[4],
        feasibility: row[5],
        innovation: row[6],
        notes: row[7],
        average: row[8]
      };
    });
  }

  var settings = getSystemSettings();

  return {
    status: "success",
    ideas: ideas,
    scores: scores,
    settings: settings
  };
}

// הזנת ציון חדש (מוגן מפני נעילות ומאומת צד שרת)
function submitScore(payload) {
  // אימות סיסמה בשרת
  var auth = verifyJudge(payload.passcode);
  if (auth.status !== "success") {
    return { status: "error", message: "Access Denied: Invalid Passcode" };
  }
  
  // בדיקה האם השיפוט נעול
  var props = PropertiesService.getScriptProperties();
  var judgingActive = props.getProperty("JUDGING_ACTIVE");
  if (judgingActive === "false") {
    return { status: "error", message: "השיפוט נעול כעת על ידי מנהלי ההאקתון" };
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Scores");
    if (!sheet) return { status: "error", message: "Scores sheet not found" };

    var lastRow = sheet.getLastRow();
    var nextId = 1;
    if (lastRow > 1) {
      nextId = Number(sheet.getRange(lastRow, 1).getValue()) + 1;
    }

    var timestamp = new Date();
    var average = (payload.relevance + payload.feasibility + payload.innovation) / 3;

    // עמודות: ID | Timestamp | JudgeName | IdeaID | Relevance | Feasibility | Innovation | Notes | Average
    sheet.appendRow([
      nextId, 
      timestamp, 
      payload.judgeName, 
      payload.ideaId, 
      payload.relevance, 
      payload.feasibility, 
      payload.innovation, 
      payload.notes, 
      average
    ]);

    return { status: "success", id: nextId };
  } catch (error) {
    return { status: "error", message: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

// ==========================================
// 4. תיווך ל-Gemini API (Proxy מאובטח)
// ==========================================
function handleGeminiChat(userMessage) {
  var props = PropertiesService.getScriptProperties();
  var apiKey = props.getProperty("GEMINI_API_KEY");

  // הגנה במקרה ומפתח ה-API לא מוגדר
  if (!apiKey) {
    return {
      status: "success",
      reply: "סוכן ה-AI האישי אינו מחובר כרגע (חסר מפתח API של Gemini בהגדרות Apps Script).\n\nאל דאגה, תוכל להירשם או לחפש שותפים ישירות באמצעות הטפסים הסטנדרטיים באתר!"
    };
  }

  // הגדרת הנחיות מנחות לבוט (System Instructions) המעוגנות בתוכן ההאקתון
  var systemInstruction = 
    "אתה סוכן ה-AI האישי של האקתון מז\"פ 2026. עליך לענות תמיד **במשפט אחד או שניים קצרים בלבד (עד 35 מילים במצטבר)**. " +
    "התשובה חייבת להיות מלאה, קצרה ותמציתית ביותר, ואסור לה להקטע. אל תכתוב פסקאות ואל תרחיב כלל.\n" +
    "חוקי ההאקתון:\n" +
    "- פיתוח ללא קוד (Vibe Coding) באמצעות פרומפטים ברשת בלמ\"ס אזרחית (עם נתוני דמה בלבד!).\n" +
    "- צוותים של עד 3 שותפים. פרס: פגרת מפקד ותעודה.\n" +
    "- שבוע 1 הרשמה, שבוע 2 סינון 3 עולים, שבוע 3 יום ההאקתון.\n" +
    "אם מישהו מבקש עזרה ברעיון, נסח לו את הבעיה והפתרון ב-2 שורות קצרות בלבד.";

  var url = "https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent?key=" + apiKey;

  // הכנת גוף הבקשה ל-Gemini API v1beta
  var payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: userMessage }]
      }
    ],
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 400
    }
  };

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    var json = JSON.parse(responseText);

    if (responseCode === 200 && json.candidates && json.candidates[0].content.parts[0].text) {
      var botReply = json.candidates[0].content.parts[0].text;
      return { status: "success", reply: botReply };
    } else {
      Logger.log("Gemini API Error: " + responseText);
      return { status: "error", message: "Gemini API error (Status " + responseCode + ")" };
    }
  } catch (error) {
    Logger.log("UrlFetch Error: " + error.toString());
    return { status: "error", message: error.toString() };
  }
}

// ==========================================
// 4. הצבעת קהל וניהול שלבי האקתון
// ==========================================

// הצבעה לרעיון (מוגן מפני נעילות)
function voteIdea(payload) {
  var props = PropertiesService.getScriptProperties();
  var votingActive = props.getProperty("PUBLIC_VOTING_ACTIVE");
  if (votingActive === "false") {
    return { status: "error", message: "הצבעת הקהל נעולה כעת על ידי מנהלי ההאקתון" };
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Ideas");
    if (!sheet) return { status: "error", message: "Ideas sheet not found" };

    var ideaId = Number(payload.ideaId);
    var lastRow = sheet.getLastRow();
    var foundRow = -1;
    
    // חיפוש השורה של הרעיון
    if (lastRow > 1) {
      var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) {
        if (Number(ids[i][0]) === ideaId) {
          foundRow = i + 2;
          break;
        }
      }
    }

    if (foundRow === -1) {
      return { status: "error", message: "הרעיון לא נמצא במאגר" };
    }

    // קריאת והגדלת הצבעות (עמודה 8)
    var currentVotes = Number(sheet.getRange(foundRow, 8).getValue()) || 0;
    var newVotes = currentVotes + 1;
    sheet.getRange(foundRow, 8).setValue(newVotes);

    return { status: "success", votes: newVotes };
  } catch (error) {
    return { status: "error", message: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

// קריאת הגדרות מערכת ציבוריות
function getSystemSettings() {
  var props = PropertiesService.getScriptProperties();
  return {
    status: "success",
    judgingActive: props.getProperty("JUDGING_ACTIVE") !== "false", // default: true
    publicVotingActive: props.getProperty("PUBLIC_VOTING_ACTIVE") !== "false", // default: true
    leaderboardPublic: props.getProperty("LEADERBOARD_PUBLIC") === "true" // default: false
  };
}

// עדכון הגדרות מערכת (מאובטח עם סיסמת שופט)
function updateSystemSettings(payload) {
  var auth = verifyJudge(payload.passcode);
  if (auth.status !== "success") {
    return { status: "error", message: "Access Denied" };
  }

  var props = PropertiesService.getScriptProperties();
  
  if (payload.judgingActive !== undefined) {
    props.setProperty("JUDGING_ACTIVE", String(payload.judgingActive));
  }
  if (payload.publicVotingActive !== undefined) {
    props.setProperty("PUBLIC_VOTING_ACTIVE", String(payload.publicVotingActive));
  }
  if (payload.leaderboardPublic !== undefined) {
    props.setProperty("LEADERBOARD_PUBLIC", String(payload.leaderboardPublic));
  }

  return { status: "success", settings: getSystemSettings() };
}
