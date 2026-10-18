/**
 * BudTrack — Gmail bank-notification forwarder.
 *
 * Runs as a Google Apps Script time-driven trigger (every 5 minutes).
 * Scans recent bank notification emails and POSTs a trimmed payload to the
 * BudTrack webhook. The webhook decides whether the mail is a real
 * transaction — this script only forwards, never classifies.
 *
 * Dedupe is by Gmail message ID stored in Script Properties, NOT by read
 * state. The Hermes email gateway polls the same inbox over IMAP every ~15s
 * and its RFC822 fetch marks every unread mail as read, so `is:unread` would
 * miss almost everything. This script also never changes read state.
 *
 * SETUP
 * 1. script.google.com → New project → paste this file.
 * 2. Project Settings → Script properties, add:
 *      BUDTRACK_WEBHOOK_URL    https://budtrack.iqbalarif.me/api/webhook/bank-email
 *      BUDTRACK_WEBHOOK_SECRET <same value as BANK_EMAIL_WEBHOOK_SECRET in BudTrack .env.production>
 *      BUDTRACK_WALLET         wallet name this Gmail books into, exact
 *                              (e.g. "Dompet Utama" or "Selly"). One Apps
 *                              Script project per Gmail account.
 * 3. Run `markExistingAsDone` once so mail already in the inbox is not
 *    re-booked, then run `installTrigger` once.
 * 4. `testWebhook` verifies connectivity (creates a real Rp1.000 test tx).
 *
 * WHY script properties, not literals: the secret is a live write credential
 * into your finance DB. Keep it out of the source file.
 */

// Bank sender domains worth forwarding. Extend as needed.
var SENDER_PATTERNS = [
  'bca.co.id',
  'bankmandiri.co.id',
  'klikbca.com',
  'bni.co.id',
  'bri.co.id',
  'jago.com',
  'bankjago.co.id',
  'bibit.id',
  'pln.co.id',
  'telkom.co.id',
  'indihome.co.id',
  'gojek.com',
  'gopay.co.id',
  'ovo.id',
  'dana.id',
  'shopeepay.co.id',
]

var MAX_BODY_CHARS = 8000
var LOOKBACK = 'newer_than:2d'
var DONE_KEY = 'BUDTRACK_DONE_IDS'
// ~17 chars per Gmail message ID; 350 IDs stays well under the 9KB
// per-property limit.
var DONE_MAX = 350

function getProp(key) {
  var v = PropertiesService.getScriptProperties().getProperty(key)
  if (!v) throw new Error('Script property belum diset: ' + key)
  return v
}

function loadDone() {
  var raw = PropertiesService.getScriptProperties().getProperty(DONE_KEY)
  if (!raw) return []
  try {
    var arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch (e) {
    return []
  }
}

function saveDone(ids) {
  // Keep the newest entries only.
  var trimmed = ids.slice(-DONE_MAX)
  PropertiesService.getScriptProperties().setProperty(DONE_KEY, JSON.stringify(trimmed))
}

function buildQuery() {
  return (
    LOOKBACK +
    ' (' +
    SENDER_PATTERNS.map(function (d) {
      return 'from:' + d
    }).join(' OR ') +
    ')'
  )
}

function forwardBankEmails() {
  var url = getProp('BUDTRACK_WEBHOOK_URL')
  var secret = getProp('BUDTRACK_WEBHOOK_SECRET')
  var wallet = getProp('BUDTRACK_WALLET')

  // Overlapping trigger runs must not double-book the same mail.
  var lock = LockService.getScriptLock()
  if (!lock.tryLock(10000)) {
    console.log('Run lain masih jalan, skip.')
    return
  }

  try {
    var threads
    try {
      threads = GmailApp.search(buildQuery(), 0, 25)
    } catch (e) {
      console.error('Gmail search gagal: ' + e.message)
      return
    }
    if (!threads.length) {
      console.log('Tidak ada email bank baru.')
      return
    }

    var done = loadDone()
    var doneSet = {}
    for (var k = 0; k < done.length; k++) doneSet[done[k]] = true

    var cutoff = Date.now() - 2 * 24 * 60 * 60 * 1000
    var sent = 0
    var skipped = 0

    for (var i = 0; i < threads.length; i++) {
      // Bank mails with identical subjects get threaded together, so walk
      // every message instead of treating the thread as one unit.
      var messages = threads[i].getMessages()

      for (var j = 0; j < messages.length; j++) {
        var msg = messages[j]
        var id = msg.getId()
        if (doneSet[id]) continue
        if (msg.getDate().getTime() < cutoff) continue

        var payload = {
          sender: String(msg.getFrom() || '').slice(0, 200),
          subject: String(msg.getSubject() || '').slice(0, 300),
          body: String(msg.getPlainBody() || '').slice(0, MAX_BODY_CHARS),
          wallet: wallet,
        }

        // HTML-only mail: nothing to parse. Mark done so it is not
        // re-inspected every run.
        if (!payload.body) {
          done.push(id)
          doneSet[id] = true
          skipped++
          continue
        }

        var res = UrlFetchApp.fetch(url, {
          method: 'post',
          contentType: 'application/json',
          headers: { 'x-webhook-secret': secret },
          payload: JSON.stringify(payload),
          muteHttpExceptions: true,
        })
        var code = res.getResponseCode()

        if (code === 200) {
          // 200 covers both "booked" and "skipped as promo" — either way the
          // webhook has made its decision; never send this mail again.
          done.push(id)
          doneSet[id] = true
          sent++
        } else if (code === 403) {
          saveDone(done)
          console.error('Secret ditolak (403). Cek BUDTRACK_WEBHOOK_SECRET.')
          return
        } else if (code === 422) {
          saveDone(done)
          console.error('Wallet ditolak (422): ' + res.getContentText().slice(0, 200) + '. Cek BUDTRACK_WALLET.')
          return
        } else {
          // Leave it out of `done` so the next run retries it.
          console.error('HTTP ' + code + ': ' + res.getContentText().slice(0, 200))
        }
      }
    }

    saveDone(done)
    console.log('Forwarded: ' + sent + ' | skipped (no body): ' + skipped)
  } finally {
    lock.releaseLock()
  }
}

/**
 * Run once before installing the trigger: records every bank mail from the
 * lookback window as already processed, so existing mail is not booked as
 * new transactions.
 */
function markExistingAsDone() {
  var threads = GmailApp.search(buildQuery(), 0, 50)
  var done = loadDone()
  var doneSet = {}
  for (var k = 0; k < done.length; k++) doneSet[done[k]] = true

  var added = 0
  for (var i = 0; i < threads.length; i++) {
    var messages = threads[i].getMessages()
    for (var j = 0; j < messages.length; j++) {
      var id = messages[j].getId()
      if (!doneSet[id]) {
        done.push(id)
        doneSet[id] = true
        added++
      }
    }
  }
  saveDone(done)
  console.log('Ditandai sudah diproses: ' + added + ' email.')
}

function installTrigger() {
  var triggers = ScriptApp.getProjectTriggers()
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'forwardBankEmails') {
      ScriptApp.deleteTrigger(triggers[i])
    }
  }
  ScriptApp.newTrigger('forwardBankEmails').timeBased().everyMinutes(5).create()
  console.log('Trigger terpasang: forwardBankEmails tiap 5 menit.')
}

function testWebhook() {
  var url = getProp('BUDTRACK_WEBHOOK_URL')
  var secret = getProp('BUDTRACK_WEBHOOK_SECRET')
  var wallet = getProp('BUDTRACK_WALLET')

  var res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-webhook-secret': secret },
    payload: JSON.stringify({
      sender: 'noreply@bca.co.id',
      subject: 'Transaksi Berhasil',
      body: 'Pembayaran QRIS sebesar Rp1.000 di TEST MERCHANT berhasil.',
      wallet: wallet,
    }),
    muteHttpExceptions: true,
  })

  console.log('HTTP ' + res.getResponseCode())
  console.log(res.getContentText().slice(0, 500))
}
