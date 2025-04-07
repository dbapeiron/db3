const fs = require("fs");
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");

const BOT_TOKEN = "7901139050:AAE6oGqjdb9pgZ_oTGDofjrnqMXky4lj4ho"; // Ganti dengan token bot

// ----- ( jangan ubah kalo gapaham) ------ \\
const ADMIN_FILE = "admin.json";
const RESELLER_FILE = "ress.json";
const GITHUB_REPO = "dbapeiron/db3";
const GITHUB_FILE_PATH = "token.json";
const GITHUB_PAT = "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"; 


const GITHUB_RAW_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/${GITHUB_FILE_PATH}?timestamp=${Date.now()}`;
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;


async function fetchTokens() {
  try {
    const response = await axios.get(GITHUB_RAW_URL, { headers: { "Cache-Control": "no-cache" } });
    return response.data?.tokens || [];
  } catch (error) {
    return [];
  }
}

async function updateTokens(newTokens) {
  try {
    const { data } = await axios.get(GITHUB_API_URL, {
      headers: { Authorization: `token ${GITHUB_PAT}` },
    });

    const updatedContent = Buffer.from(JSON.stringify({ tokens: newTokens }, null, 2)).toString("base64");

    await axios.put(
      GITHUB_API_URL,
      { message: "Update token list", content: updatedContent, sha: data.sha },
      { headers: { Authorization: `token ${GITHUB_PAT}` } }
    );

    return true;
  } catch (error) {
    return false;
  }
}


const bot = new TelegramBot(BOT_TOKEN, { polling: true });

function loadAdmins() {
  if (!fs.existsSync(ADMIN_FILE)) return { owners: [], admins: [] };
  return JSON.parse(fs.readFileSync(ADMIN_FILE));
}

function loadResellers() {
  if (!fs.existsSync(RESELLER_FILE)) return { resellers: [] };
  return JSON.parse(fs.readFileSync(RESELLER_FILE));
}

function saveAdmins(adminData) {
  fs.writeFileSync(ADMIN_FILE, JSON.stringify(adminData, null, 2));
}

function saveResellers(resellerData) {
  fs.writeFileSync(RESELLER_FILE, JSON.stringify(resellerData, null, 2));
}


function isOwner(userId) {
  return loadAdmins().owners.includes(userId);
}

function isAdmin(userId) {
  const { admins, owners } = loadAdmins();
  return owners.includes(userId) || admins.includes(userId);
}

function isReseller(userId) {
  return loadResellers().resellers.includes(userId);
}

function hasAccess(userId) {
  return isOwner(userId) || isAdmin(userId) || isReseller(userId);
}

const MENU_IMAGE = "https://e.top4top.io/p_3380a2aqd0.jpeg";

// ---- ( Main Menu ---- \\

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!hasAccess(userId)) return bot.sendMessage(chatId, "❌ Anda tidak memiliki akses!");

  const menuText = "```╭━━━━⭓ADD TOKEN MENU 🤓<\n" +
                   "┃▢ /listtoken  → Lihat daftar token\n" +
                   "┃▢ /addtoken   → Tambah token baru\n" +
                   "┃▢ /deltoken   → Hapus token\n" +
                   "╰━━━━━━━━━━━━━━━━━━⭓\n\n" +
                   "╭━━━━⭓RESELLER MENU🚀\n" +
                   "┃▢ /listreseller  → Lihat daftar reseller\n" +
                   "┃▢ /addreseller <id>  → Tambah reseller \Owner & Admin\\n" +
                   "┃▢ /delreseller <id>  → Hapus reseller \Owner & Admin\\n" +
                   "╰━━━━━━━━━━━━━━━━━━⭓\n\n" +
                   "╭━━━━⭓OWNER MENU\n" +
                   "┃▢ /addpt <id>  → Tambah admin tambahan \Owner\\n" +
                   "┃▢ /addtoken   → Tambah token baru\n" +
                   "┃▢ /delpt <id>  → Hapus admin tambahan \Owner\\n" +
                   "╰━━━━━━━━━━━━━━━━━━⭓```";

  bot.sendPhoto(chatId, MENU_IMAGE, { caption: menuText, parse_mode: "MarkdownV2" });
});


bot.onText(/\/addpt (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const newAdminId = parseInt(match[1]);

  if (!isOwner(userId)) return bot.sendMessage(chatId, "❌ Hanya owner yang bisa menambah admin!");
  if (isNaN(newAdminId)) return bot.sendMessage(chatId, "❌ ID harus berupa angka!");

  const adminData = loadAdmins();
  if (adminData.admins.includes(newAdminId)) return bot.sendMessage(chatId, "⚠️ Admin sudah ada!");

  adminData.admins.push(newAdminId);
  saveAdmins(adminData);
  bot.sendMessage(chatId, `✅ Admin tambahan berhasil ditambahkan: ${newAdminId}`);
});

bot.onText(/\/delpt (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const adminToRemove = parseInt(match[1]);

  if (!isOwner(userId)) return bot.sendMessage(chatId, "❌ Hanya owner yang bisa menghapus admin!");
  if (isNaN(adminToRemove)) return bot.sendMessage(chatId, "❌ ID harus berupa angka!");

  const adminData = loadAdmins();
  if (!adminData.admins.includes(adminToRemove)) return bot.sendMessage(chatId, "⚠️ Admin tidak ditemukan!");

  adminData.admins = adminData.admins.filter((id) => id !== adminToRemove);
  saveAdmins(adminData);
  bot.sendMessage(chatId, `✅ Admin tambahan berhasil dihapus: ${adminToRemove}`);
});


bot.onText(/\/addreseller (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const newResellerId = parseInt(match[1]);

  if (!isAdmin(userId) && !isOwner(userId)) return bot.sendMessage(chatId, "❌ Hanya owner dan admin yang bisa menambah reseller!");
  if (isNaN(newResellerId)) return bot.sendMessage(chatId, "❌ ID harus berupa angka!");

  const resellerData = loadResellers();
  if (resellerData.resellers.includes(newResellerId)) return bot.sendMessage(chatId, "⚠️ Reseller sudah ada!");

  resellerData.resellers.push(newResellerId);
  saveResellers(resellerData);
  bot.sendMessage(chatId, `✅ Reseller berhasil ditambahkan: ${newResellerId}`);
});

bot.onText(/\/delreseller (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const resellerToRemove = parseInt(match[1]);

  if (!isAdmin(userId) && !isOwner(userId)) return bot.sendMessage(chatId, "❌ Hanya owner dan admin yang bisa menghapus reseller!");
  if (isNaN(resellerToRemove)) return bot.sendMessage(chatId, "❌ ID harus berupa angka!");

  const resellerData = loadResellers();
  if (!resellerData.resellers.includes(resellerToRemove)) return bot.sendMessage(chatId, "⚠️ Reseller tidak ditemukan!");

  resellerData.resellers = resellerData.resellers.filter((id) => id !== resellerToRemove);
  saveResellers(resellerData);
  bot.sendMessage(chatId, `✅ Reseller berhasil dihapus: ${resellerToRemove}`);
});

bot.onText(/\/listreseller/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isAdmin(userId) && !isOwner(userId)) {
    return bot.sendMessage(chatId, "❌ Anda tidak memiliki akses!");
  }

  const resellers = loadResellers().resellers || [];
  bot.sendMessage(chatId, `👥 **Daftar Reseller:**\n\n${resellers.map((r, i) => `${i + 1}. ${r}`).join("\n") || "🚫 Tidak ada reseller!"}`, { parse_mode: "Markdown" });
});

bot.onText(/\/addtoken (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const newToken = match[1].trim();
    if (!hasAccess(msg.from.id)) return bot.sendMessage(chatId, "❌ Anda tidak memiliki akses!");

  let tokens = await fetchTokens();
  if (tokens.includes(newToken)) return bot.sendMessage(chatId, "⚠️ Token sudah ada!");

  tokens.push(newToken);
  const success = await updateTokens(tokens);

  if (success) bot.sendMessage(chatId, `✅ Token berhasil ditambahkan!`);
  else bot.sendMessage(chatId, "❌ Gagal menambahkan token!");
});


bot.onText(/\/deltoken (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const tokenToRemove = match[1].trim();
    if (!hasAccess(msg.from.id)) return bot.sendMessage(chatId, "❌ Anda tidak memiliki akses!");

  let tokens = await fetchTokens();
  if (!tokens.includes(tokenToRemove)) return bot.sendMessage(chatId, "⚠️ Token tidak ditemukan!");

  tokens = tokens.filter((token) => token !== tokenToRemove);
  const success = await updateTokens(tokens);

  if (success) bot.sendMessage(chatId, `✅ Token berhasil dihapus!`);
  else bot.sendMessage(chatId, "❌ Gagal menghapus token!");
});

bot.onText(/\/listtoken/, async (msg) => {
  const chatId = msg.chat.id;
  const tokens = await fetchTokens();
    if (!hasAccess(msg.from.id)) return bot.sendMessage(chatId, "❌ Anda tidak memiliki akses!");

  if (tokens.length === 0) return bot.sendMessage(chatId, "⚠️ Tidak ada token tersimpan.");

  let tokenList = tokens.map((t) => `${t.slice(0, 3)}***${t.slice(-3)}`).join("\n");
  bot.sendMessage(chatId, `📜 **Daftar Token:**\n\`\`\`${tokenList}\`\`\``, { parse_mode: "Markdown" });
});


fetchTokens();
console.log("🚀 Bot Token Manager berjalan...");