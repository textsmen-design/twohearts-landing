/**
 * 2 СЕРДЦА — обработчик заявок с лендинга.
 *
 * Что делает:
 *   1. Принимает POST-запрос от формы (frontend/script.js).
 *   2. Записывает заявку новой строкой в Google Таблицу «TwoHearts — Заявки».
 *   3. Отправляет уведомление на email организатора.
 *
 * Развёрнуто как отдельный (standalone) Apps Script проект, который находит
 * нужную таблицу по имени через DriveApp — так не нужно хранить/подставлять
 * Spreadsheet ID и скрипт не привязан к конкретному файлу физически.
 *
 * Как подключить (уже сделано для продакшена, оставлено для повторной настройки):
 *   1. Создайте Google Таблицу с именем SPREADSHEET_NAME (см. ниже).
 *   2. script.new → вставьте этот файл целиком в Code.gs.
 *   3. Укажите свой email в константе SEND_TO.
 *   4. Deploy → New deployment → Web app.
 *        Execute as: Me
 *        Who has access: Anyone
 *   5. Скопируйте выданный URL веб-приложения.
 *   6. Вставьте его в frontend/config.js → APPS_SCRIPT_URL.
 */

var SEND_TO = "you@example.com";
var SPREADSHEET_NAME = "TwoHearts — Заявки";
var SHEET_NAME = "Заявки";

function doPost(e) {
  try {
    var params = (e && e.parameter) || {};
    var name = (params.name || "").toString().trim();
    var email = (params.email || "").toString().trim();
    var source = (params.source || "landing").toString();
    var submittedAt = params.submittedAt || new Date().toISOString();

    if (!name || !email) {
      return jsonResponse({ ok: false, error: "missing_fields" });
    }

    appendRow_(name, email, source, submittedAt);
    notifyByEmail_(name, email);

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

function getSpreadsheet_() {
  var files = DriveApp.getFilesByName(SPREADSHEET_NAME);
  if (!files.hasNext()) {
    throw new Error("Таблица \"" + SPREADSHEET_NAME + "\" не найдена на Google Диске");
  }
  return SpreadsheetApp.open(files.next());
}

function appendRow_(name, email, source, submittedAt) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["Дата получения", "Имя", "Email", "Источник", "Отправлено (клиент)"]);
  }
  sheet.appendRow([new Date(), name, email, source, submittedAt]);
}

function notifyByEmail_(name, email) {
  var subject = "2 СЕРДЦА — новая заявка с лендинга";
  var body =
    "Новая заявка на вечер «2 Сердца».\n\n" +
    "Имя: " + name + "\n" +
    "Email: " + email + "\n";
  MailApp.sendEmail(SEND_TO, subject, body);
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
