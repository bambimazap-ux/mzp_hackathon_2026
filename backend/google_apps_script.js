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
const GEMINI_MODEL = "gemini-3.5-flash";

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
  
  // 1. קריאת רעיונות
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

  return {
    status: "success",
    ideas: ideas,
    teammates: teammates
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
    // עמודות: ID | Timestamp | Title | Problem | Teammates | Status | ProjectURL
    sheet.appendRow([
      nextId, 
      timestamp, 
      payload.title, 
      payload.problem, 
      payload.teammates, 
      "מועמד", 
      ""
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

  return {
    status: "success",
    ideas: ideas,
    scores: scores
  };
}

// הזנת ציון חדש (מוגן מפני נעילות ומאומת צד שרת)
function submitScore(payload) {
  // אימות סיסמה בשרת
  var auth = verifyJudge(payload.passcode);
  if (auth.status !== "success") {
    return { status: "error", message: "Access Denied: Invalid Passcode" };
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
    "You are the personal AI assistant for the Forensic AI Hackathon 2026. Your name is 'סוכן ה-AI האישי'. " +
    "You are built by the R&D department (מדור מחקר ופיתוח) of the Forensic Division (מז\"פ) of the Israel Police. " +
    "You help forensic police officers brainstorm ideas, refine their concepts, and answer questions. " +
    "Talk in polite, helpful, and professional Hebrew (עברית). Support RTL format. " +
    "Here is the context of the Hackathon to help you answer questions:\n" +
    "- Concept: Vibe Coding. Developing web applications and tools using Prompts only. No programming experience required!\n" +
    "- Rules & Information:\n" +
    "  * Teams: Up to 3 participants.\n" +
    "  * Security (Critical): 100% civilian network (BLMS). Development on 3 dedicated civilian laptops using Google AI Studio. " +
    "NO real police data, NO personal data of officers or citizens. Use only mock/dummy data (נתוני דמה).\n" +
    "  * Costs: Free of charge, using internal resources.\n" +
    "  * Timeline:\n" +
    "    - Week 1 (Active): Call for Ideas and registrations.\n" +
    "    - Week 2: Screening and selecting the top 3 projects.\n" +
    "    - Week 3: The Hackathon day (Heritage House / בית מורשת or Meeting Room / חד\"ן). A full day of development ending with pitches to command staff.\n" +
    "  * Incentives:司令 (Commander) leave (פגרת מפקד) and certificate of honor for 1st place. R&D department will review the solution for potential official adaptation.\n" +
    "- Your features:\n" +
    "  1. Answer general questions about the hackathon.\n" +
    "  2. Help brainstorm. Ask them about their daily tasks in the lab/crime scene, and suggest AI tools they can build.\n" +
    "  3. Refine ideas: Ask them what is the problem, what is the solution, and what dummy data they will use. " +
    "Then write a structured, clean proposal in Hebrew under sections (שם הרעיון, הבעיה, הפתרון, נתוני דמה) and tell them they can copy-paste it directly into the submission form.";

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
      temperature: 0.7,
      maxOutputTokens: 1000
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
