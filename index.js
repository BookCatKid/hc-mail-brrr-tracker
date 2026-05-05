import fetch from "node-fetch";
import fs from "fs";

const MAIL_URL = "https://mail.hackclub.com/api/public/v1/mail";
const STATE_FILE = "./state.json";

// ensure file exists so cache step doesn't break
function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function sendNotification(title, message) {
  await fetch(process.env.BRRR_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      message,
      interruption_level: "active"
    })
  });
}

async function main() {
  const res = await fetch(MAIL_URL, {
    headers: {
      Authorization: `Bearer ${process.env.MAIL_TOKEN}`
    }
  });

  const data = await res.json();
  const prev = loadState();

  for (const item of data.mail) {
    const old = prev[item.id];

    if (!old) {
      await sendNotification("📦 New Package", item.title);
    }

    if (old && old.status !== item.status) {
      await sendNotification(
        "📬 Update",
        `${item.title}: ${old.status} → ${item.status}`
      );
    }

    if (item.tracking_number && !old?.tracking_number) {
      await sendNotification(
        "🚚 Tracking Added",
        `${item.title}`
      );
    }

    prev[item.id] = item;
  }

  saveState(prev);
}

main();
