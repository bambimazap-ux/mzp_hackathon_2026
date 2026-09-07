/**
 * קוד שרת Google Apps Script עבור פורטל האקתון AI מז"פ 2026
 * 
 * הוראות התקנה:
 * 1. פתח גיליון Google Sheets חדש בשם "האקתון AI 2026".
 * 2. צור 4 לשוניות (Tabs) בשמות המדויקים הבאים:
 *    - "Ideas"
 *    - "Teammates"
 *    - "Scores"
 *    - "Judges"
 * 3. בשורה הראשונה של כל גיליון (כותרות) הגדר את העמודות הבאות:
 *    - בגיליון Ideas: ID | Timestamp | Title | Problem | Teammates | Status | ProjectURL | Votes
 *    - בגיליון Teammates: ID | Timestamp | Name | Department | Description | Contact
 *    - בגיליון Scores: ID | Timestamp | JudgeUsername | IdeaID | Relevance | Feasibility | Innovation | Notes | Average | JudgeName
 *    - בגיליון Judges: Username | Password | Name | Role
 * 4. תחת "הרחבות" (Extensions) -> "Apps Script", מחק את הקוד הקיים והדבק את הקוד הבא.
 * 5. (אופציונלי עבור הצ'אטבוט) בהגדרות הפרויקט (אייקון גלגל השיניים), תחת "Script Properties", הוסף מאפיין חדש:
 *    - Key: GEMINI_API_KEY | Value: [מפתח ה-API שלך מ-Google AI Studio]
 *    - Key: JUDGE_PASSCODE | Value: mzp_judge_2026 (סיסמת מנהל גיבוי)
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
      response = verifyJudge(payload);
    } else if (action === "get_judging_data") {
      response = getJudgingData(payload);
    } else if (action === "submit_score") {
      response = submitScore(payload);
    } else if (action === "vote_idea") {
      response = voteIdea(payload);
    } else if (action === "get_system_settings") {
      response = getSystemSettings();
    } else if (action === "update_system_settings") {
      response = updateSystemSettings(payload);
    } else if (action === "gemini_chat") {
      response = handleGeminiChat(payload.history);
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

// אימות שם משתמש וסיסמת שופט (או קוד גישה מנהלי)
function verifyJudge(payload) {
  var username = payload && typeof payload === 'object' ? payload.username : null;
  var password = payload && typeof payload === 'object' ? payload.password : null;
  var passcode = payload && typeof payload === 'object' ? payload.passcode : payload;

  // 1. בדיקת סיסמת מנהל גיבוי גלובלית
  var props = PropertiesService.getScriptProperties();
  var actualPasscode = props.getProperty("JUDGE_PASSCODE") || DEFAULT_PASSCODE;
  if (passcode === actualPasscode || password === actualPasscode) {
    return {
      status: "success",
      username: "admin",
      judgeName: "מנהל מערכת",
      role: "admin"
    };
  }

  // 2. אימות מול לשונית "Judges" ב-Google Sheets
  if (username && password) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var judgesSheet = ss.getSheetByName("Judges");
    if (judgesSheet && judgesSheet.getLastRow() > 1) {
      var data = judgesSheet.getRange(2, 1, judgesSheet.getLastRow() - 1, 4).getValues();
      for (var i = 0; i < data.length; i++) {
        var u = String(data[i][0]).trim();
        var p = String(data[i][1]).trim();
        var name = String(data[i][2]).trim();
        var role = String(data[i][3]).trim() || "judge";
        if (u.toLowerCase() === String(username).trim().toLowerCase() && p === String(password).trim()) {
          return {
            status: "success",
            username: u,
            judgeName: name || u,
            role: role
          };
        }
      }
    }
  }

  return { status: "error", message: "שם משתמש או סיסמה שגויים" };
}

// משיכת נתוני שיפוט מלאים + דירוגים אישיים של השופט המחובר
function getJudgingData(payload) {
  var auth = verifyJudge(payload);
  if (auth.status !== "success") {
    return { status: "error", message: "גישה נדחתה: שם משתמש או סיסמה שגויים" };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. משיכת רעיונות (כל העמודות כולל הצבעות)
  var ideasSheet = ss.getSheetByName("Ideas");
  var ideas = [];
  var maxVotes = 0;
  if (ideasSheet && ideasSheet.getLastRow() > 1) {
    var data = ideasSheet.getRange(2, 1, ideasSheet.getLastRow() - 1, 8).getValues();
    ideas = data.map(function(row) {
      var v = Number(row[7]) || 0;
      if (v > maxVotes) maxVotes = v;
      return {
        id: row[0],
        timestamp: row[1],
        title: row[2],
        problem: row[3],
        teammates: row[4],
        status: row[5],
        projectURL: row[6],
        votes: v
      };
    });
  }

  // 2. משיכת ציונים
  var scoresSheet = ss.getSheetByName("Scores");
  var scores = [];
  if (scoresSheet && scoresSheet.getLastRow() > 1) {
    var data = scoresSheet.getRange(2, 1, scoresSheet.getLastRow() - 1, 10).getValues();
    scores = data.map(function(row) {
      return {
        id: row[0],
        timestamp: row[1],
        judgeUsername: String(row[2]),
        ideaId: row[3],
        relevance: Number(row[4]) || 0,
        feasibility: Number(row[5]) || 0,
        innovation: Number(row[6]) || 0,
        notes: row[7],
        average: Number(row[8]) || 0,
        judgeName: String(row[9] || row[2])
      };
    });
  }

  // 3. חישוב נתונים משוקללים וציונים אישיים עבור כל רעיון
  var enrichedIdeas = ideas.map(function(idea) {
    // מציאת הציון האישי שהשופט המחובר נתן לרעיון זה
    var myScore = null;
    for (var i = 0; i < scores.length; i++) {
      if (Number(scores[i].ideaId) === Number(idea.id) && 
          (scores[i].judgeUsername.toLowerCase() === auth.username.toLowerCase() ||
           scores[i].judgeName === auth.judgeName)) {
        myScore = scores[i];
        break;
      }
    }

    // חישוב ממוצע השופטים הכולל עבור רעיון זה
    var ideaJudgeScores = scores.filter(function(s) { return Number(s.ideaId) === Number(idea.id); });
    var overallJudgesAvg = 0;
    if (ideaJudgeScores.length > 0) {
      var sum = 0;
      for (var k = 0; k < ideaJudgeScores.length; k++) {
        sum += ideaJudgeScores[k].average;
      }
      overallJudgesAvg = sum / ideaJudgeScores.length;
    }

    // חישוב ציון הצבעת הקהל בסולם 1-10 (20% מהציון הסופי)
    var publicScore = 0;
    if (maxVotes > 0) {
      publicScore = (idea.votes / maxVotes) * 10;
    }

    // ציון משוקלל סופי: 80% שופטים + 20% קהל
    var finalScore = (overallJudgesAvg * 0.8) + (publicScore * 0.2);

    return {
      id: idea.id,
      timestamp: idea.timestamp,
      title: idea.title,
      problem: idea.problem,
      teammates: idea.teammates,
      status: idea.status,
      projectURL: idea.projectURL,
      votes: idea.votes,
      myScore: myScore,
      ratedByMe: myScore !== null,
      myAverage: myScore ? myScore.average : null,
      overallJudgesAvg: Math.round(overallJudgesAvg * 100) / 100,
      publicScore: Math.round(publicScore * 100) / 100,
      finalScore: Math.round(finalScore * 100) / 100,
      judgesCount: ideaJudgeScores.length
    };
  });

  var settings = getSystemSettings();

  return {
    status: "success",
    judgeInfo: {
      username: auth.username,
      judgeName: auth.judgeName,
      role: auth.role
    },
    ideas: enrichedIdeas,
    scores: scores,
    settings: settings
  };
}

// הזנת/עדכון ציון (מוגן מפני נעילות ומאומת צד שרת)
function submitScore(payload) {
  var auth = verifyJudge(payload);
  if (auth.status !== "success") {
    return { status: "error", message: "גישה נדחתה: פרטי שופט לא תקפים" };
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
    var ideaId = Number(payload.ideaId);
    var judgeUsername = auth.username;
    var judgeName = payload.judgeName || auth.judgeName;
    var relevance = Number(payload.relevance) || 0;
    var feasibility = Number(payload.feasibility) || 0;
    var innovation = Number(payload.innovation) || 0;
    var average = (relevance + feasibility + innovation) / 3;
    var notes = payload.notes || "";
    var timestamp = new Date();

    // חיפוש האם כבר קיים ציון קודם של אותו שופט עבור רעיון זה
    var existingRowIndex = -1;
    if (lastRow > 1) {
      // עמודות: ID | Timestamp | JudgeUsername | IdeaID | Relevance | Feasibility | Innovation | Notes | Average | JudgeName
      var data = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
      for (var i = 0; i < data.length; i++) {
        var rowJudgeU = String(data[i][2]).trim();
        var rowIdeaId = Number(data[i][3]);
        if (rowIdeaId === ideaId && rowJudgeU.toLowerCase() === judgeUsername.toLowerCase()) {
          existingRowIndex = i + 2; // שורה פיזית בגיליון
          break;
        }
      }
    }

    if (existingRowIndex > 1) {
      // עדכון שורה קיימת
      sheet.getRange(existingRowIndex, 2).setValue(timestamp);
      sheet.getRange(existingRowIndex, 5).setValue(relevance);
      sheet.getRange(existingRowIndex, 6).setValue(feasibility);
      sheet.getRange(existingRowIndex, 7).setValue(innovation);
      sheet.getRange(existingRowIndex, 8).setValue(notes);
      sheet.getRange(existingRowIndex, 9).setValue(average);
      sheet.getRange(existingRowIndex, 10).setValue(judgeName);

      return { status: "success", id: sheet.getRange(existingRowIndex, 1).getValue(), action: "updated" };
    } else {
      // הוספת שורה חדשה
      var nextId = 1;
      if (lastRow > 1) {
        nextId = Number(sheet.getRange(lastRow, 1).getValue()) + 1;
      }

      sheet.appendRow([
        nextId, 
        timestamp, 
        judgeUsername, 
        ideaId, 
        relevance, 
        feasibility, 
        innovation, 
        notes, 
        average,
        judgeName
      ]);

      return { status: "success", id: nextId, action: "created" };
    }
  } catch (error) {
    return { status: "error", message: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

// ==========================================
// 4. תיווך ל-Gemini API (Proxy מאובטח)
// ==========================================
function handleGeminiChat(history) {
  var props = PropertiesService.getScriptProperties();
  var apiKey = props.getProperty("GEMINI_API_KEY");

  // הגנה במקרה ומפתח ה-API לא מוגדר
  if (!apiKey) {
    return {
      status: "success",
      reply: "⚠️ סוכן ה-AI האישי אינו מחובר כרגע (חסר מפתח API של Gemini בהגדרות Apps Script).\n\nאל דאגה! תוכלו להירשם להאקתון, להציע רעיונות ולחפש שותפים ישירות באמצעות הטפסים הסטנדרטיים באתר.",
      isError: true
    };
  }

  // הגדרת הנחיות מנחות לבוט (System Instructions) המעוגנות בתוכן ההאקתון
  var systemInstruction = 
    "אתה סוכן ה-AI האישי של האקתון מז\"פ 2026. עליך לענות תמיד בעברית שוטפת ומנומסת. " +
    "תשובותיך חייבות להיות קצרות ותמציתיות ביותר - משפט אחד או שניים בלבד (עד 35-40 מילים במצטבר). " +
    "חשוב מאוד: סיים תמיד את התשובה בצורה מלאה ומקצועית, ואסור לה להיקטע באמצע מילה או משפט! אל תתחיל לפרט רשימות ארוכות שעלולות להיקטע.\n\n" +
    "חוקי ופרטי ההאקתון:\n" +
    "- פיתוח ללא קוד (Vibe Coding) באמצעות כלי AI ופרומפטים ברשת בלמ\"ס אזרחית בלבד (חל איסור על שימוש במידע מסווג או אמיתי, רק נתוני דמה!).\n" +
    "- צוותים של עד 3 שותפים. הפרס: פגרת מפקד ותעודת הערכה.\n" +
    "- לוח זמנים: שבוע 1 הרשמה וסיעור מוחות, שבוע 2 סינון ועליה של 3 עולים לגמר, שבוע 3 יום ההאקתון הגדול.\n" +
    "אם מישהו מבקש עזרה ברעיון, נסח לו את הבעיה והפתרון בצורה ברורה ב-2 שורות קצרות וקולעות בלבד.";

  var url = "https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent?key=" + apiKey;

  // הכנת גוף הבקשה ל-Gemini API v1beta
  var payload = {
    contents: history || [],
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024 // הגדלת מגבלת הטוקנים למניעת קטיעה פיזית
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
    
    var json;
    try {
      json = JSON.parse(responseText);
    } catch (e) {
      json = {};
    }

    if (responseCode === 200 && json.candidates && json.candidates[0].content.parts[0].text) {
      var botReply = json.candidates[0].content.parts[0].text;
      return { status: "success", reply: botReply };
    } else {
      Logger.log("Gemini API Error: " + responseText);
      
      var friendlyReply = "";
      if (responseCode === 429) {
        friendlyReply = "⚠️ סוכן ה-AI עמוס כרגע (שגיאה 429 - מגבלת קצב). אנא המתינו מספר שניות ונסו לשלוח שוב. בינתיים, הטפסים והרישומים באתר זמינים כרגיל!";
      } else if (responseCode === 400 || responseCode === 403) {
        friendlyReply = "🔑 מפתח ה-API של Gemini אינו תקין או פג תוקף (שגיאה " + responseCode + "). אנא פנו למנהל המערכת לעדכון ה-GEMINI_API_KEY ב-Script Properties.";
      } else if (responseCode === 503) {
        friendlyReply = "☁️ שרתי ה-AI של Gemini אינם זמינים זמנית (שגיאה 503). נסו שוב בעוד דקה. המערכת עצמה פעילה ותוכלו להשתמש בטפסים להגשת רעיונות.";
      } else {
        friendlyReply = "שגיאה בחיבור ל-Gemini API (סטטוס " + responseCode + "). ניתן להמשיך להשתמש בטפסים ובממשקי האתר כרגיל.";
      }
      
      return { status: "success", reply: friendlyReply, isError: true };
    }
  } catch (error) {
    Logger.log("UrlFetch Error: " + error.toString());
    var errorStr = error.toString();
    var friendlyReply = "מצטער, חלה שגיאת תקשורת בחיבור לשרת ה-AI. ניתן להירשם ולעבוד כרגיל ישירות דרך הטפסים באתר.";
    if (errorStr.indexOf("429") !== -1) {
      friendlyReply = "⚠️ עומס פניות זמני (שגיאה 429). אנא נסו שוב בעוד מספר שניות.";
    } else if (errorStr.indexOf("503") !== -1) {
      friendlyReply = "☁️ שירות ה-AI אינו זמין זמנית (שגיאה 503). אנא נסו שוב מאוחר יותר.";
    }
    return { status: "success", reply: friendlyReply, isError: true };
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

// עדכון הגדרות מערכת (מאובטח עם סיסמת/פרטי שופט מנהל)
function updateSystemSettings(payload) {
  var auth = verifyJudge(payload);
  if (auth.status !== "success") {
    return { status: "error", message: "גישה נדחתה: פרטי התחברות לא תקפים" };
  }
  if (auth.role !== "admin") {
    return { status: "error", message: "פעולה זו מורשית למנהל מערכת בלבד" };
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
