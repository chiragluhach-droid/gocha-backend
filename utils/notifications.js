const fetch = require('node-fetch');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send a single Expo push notification
 * @param {string} token Expo push token string
 * @param {string} title Notification title
 * @param {string} body Notification body
 * @param {object} data Optional data payload
 */
async function sendExpoPush(token, title, body, data = {}) {
  if (!token || !token.startsWith('ExponentPushToken[')) return;
  try {
    const resp = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: token,
        sound: 'default',
        title,
        body,
        data,
      }),
    });
    const json = await resp.json();
    if (!resp.ok) {
      console.error('Expo push send failed', json);
    }
    return json;
  } catch (err) {
    console.error('Failed to send push', err);
  }
}

module.exports = { sendExpoPush };
