
const { Telegraf } = require("telegraf");
const fs = require('fs');
const axios = require('axios');
const moment = require('moment-timezone');
const { BOT_TOKEN, OWNER_ID } = require("./config");

const bot = new Telegraf(BOT_TOKEN);

// Konfigurasi GitHub
const GITHUB_USERNAME = "dbapeiron";
const GITHUB_REPO = "db3";
const GITHUB_FILE = "BOTTOKEN.json";
const GITHUB_TOKEN = "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";

let resellerUsers = {};

// Middleware untuk mengecek apakah user adalah owner atau reseller
const isAllowedUser = (userId) => {
    if (userId.toString() === OWNER_ID.toString()) return true;
    return resellerUsers[userId] !== undefined;
};

// Middleware untuk membatasi akses hanya untuk owner dan reseller
const checkAccess = async (ctx, next) => {
    if (!isAllowedUser(ctx.from.id)) {
        return await ctx.reply("❌ Anda tidak memiliki akses untuk menggunakan perintah ini.");
    }
    await next();
};

// Fungsi untuk mendapatkan file tokens.json dari GitHub
async function getTokens() {
    try {
        const response = await axios.get(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${GITHUB_FILE}`, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });

        // Decode base64 content dari GitHub
        const fileContent = Buffer.from(response.data.content, 'base64').toString('utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error("Gagal mendapatkan token dari GitHub:", error.response?.data || error.message);
        return [];
    }
}

// Fungsi untuk mendapatkan SHA dari tokens.json (diperlukan untuk update file)
async function getFileSha() {
    try {
        const response = await axios.get(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${GITHUB_FILE}`, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });
        return response.data.sha;
    } catch (error) {
        console.error("Gagal mendapatkan SHA file:", error.response?.data || error.message);
        return null;
    }
}

// Fungsi untuk memperbarui tokens.json di GitHub
async function updateTokens(newTokens) {
    const sha = await getFileSha();
    if (!sha) return;

    const updatedContent = Buffer.from(JSON.stringify(newTokens, null, 2)).toString('base64');

    try {
        await axios.put(`https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${GITHUB_FILE}`, {
            message: "Update tokens.json",
            content: updatedContent,
            sha
        }, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });
        console.log("tokens.json berhasil diperbarui!");
    } catch (error) {
        console.error("Gagal memperbarui tokens.json:", error.response?.data || error.message);
    }
}

// Fungsi untuk menambahkan token baru
async function addToken(newToken) {
    const tokens = await getTokens();
    if (tokens.includes(newToken)) {
        console.log("Token sudah ada.");
        return;
    }
    tokens.push(newToken);
    await updateTokens(tokens);
}

// Fungsi untuk menghapus token
async function deleteToken(tokenToDelete) {
    let tokens = await getTokens();
    tokens = tokens.filter(token => token !== tokenToDelete);
    await updateTokens(tokens);
}

// Fungsi untuk menambahkan reseller
const addReseller = (userId, durationDays) => {
    resellerUsers[userId] = {
        expired: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()
    };
    fs.writeFileSync('./reseller.json', JSON.stringify(resellerUsers));
};

// Fungsi untuk menghapus reseller
const removeReseller = (userId) => {
    delete resellerUsers[userId];
    fs.writeFileSync('./reseller.json', JSON.stringify(resellerUsers));
};

// Command untuk menambahkan reseller (hanya owner)
bot.command("addreseller", async (ctx) => {
    if (ctx.from.id.toString() !== OWNER_ID.toString()) {
        return await ctx.reply("❌ Hanya owner yang bisa menambahkan reseller.");
    }

    const args = ctx.message.text.split(" ");
    if (args.length < 3) {
        return await ctx.reply("❌ Format perintah salah. Gunakan: /addreseller <id_user> <durasi_hari>");
    }

    const userId = args[1];
    const durationDays = parseInt(args[2]);

    if (isNaN(durationDays) || durationDays <= 0) {
        return await ctx.reply("❌ Durasi hari harus berupa angka positif.");
    }

    addReseller(userId, durationDays);
    await ctx.reply(`✅ User ${userId} ditambahkan sebagai reseller selama ${durationDays} hari.`);
});

// Command untuk menghapus reseller (hanya owner)
bot.command("delreseller", async (ctx) => {
    if (ctx.from.id.toString() !== OWNER_ID.toString()) {
        return await ctx.reply("❌ Hanya owner yang bisa menghapus reseller.");
    }

    const userId = ctx.message.text.split(" ")[1];
    if (!userId) {
        return await ctx.reply("❌ Format perintah salah. Gunakan: /delreseller <id_user>");
    }

    removeReseller(userId);
    await ctx.reply(`✅ User ${userId} telah dihapus dari daftar reseller.`);
});

// Handler Untuk menangani cmd Start
bot.start(async (ctx) => {
  // Mengirim status "mengetik"
  await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');

  // Periksa status koneksi, owner, admin, dan premium SEBELUM membuat pesan
  const isPremium = (ctx.from.id);
  const isAdminStatus = (ctx.from.id);
  const isOwnerStatus = (ctx.from.id);

  const mainMenuMessage = `\`\`\` CRUSHERBUG\n╭━━━━⭓ADD TOKEN MENU\n
┃▢ /cekoken  → Lihat daftar token\n
┃▢ /addtoken   → Tambah token baru\n
┃▢ /deltoken   → Hapus token\n
╰━━━━━━━━━━━━━━━━━━⭓\n\n
╭━━━━⭓RESELLER MENU🚀\n
┃▢ /listreseller  → Lihat daftar reseller\n
┃▢ /addreseller <id>  → Tambah reseller \n
┃▢ /delreseller <id>  → Hapus reseller \n
╰━━━━━━━━━━━━━━━━━━⭓\`\`\``;

  const mainKeyboard = [
    [{
      text: "「 DEVOLOPER 」",
      url: "https://t.me/cormentc2"
      }],
  ];

  // Mengirim pesan setelah delay 3 detik (agar efek "mengetik" terlihat)
  setTimeout(async () => {
    await ctx.replyWithPhoto("https://e.top4top.io/p_3380a2aqd0.jpeg", {
      caption: mainMenuMessage,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: mainKeyboard
      }
    });
  }, 1000); // Delay 1 detik
});

// Command Telegram untuk menambah token
bot.command('addtoken', checkAccess, async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        return ctx.reply("Gunakan format: /addtoken <TOKEN>");
    }
    const token = args[1];
    await addToken(token);
    ctx.reply(`Token ${token} telah ditambahkan.`);
});

// Command Telegram untuk menghapus token
bot.command('deltoken', checkAccess, async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        return ctx.reply("Gunakan format: /deltoken <TOKEN>");
    }
    const token = args[1];
    await deleteToken(token);
    ctx.reply(`Token ${token} telah dihapus.`);
});

// Command Telegram untuk mengecek daftar token
bot.command('cektoken', checkAccess, async (ctx) => {
    const tokens = await getTokens();
    ctx.reply(`Daftar Token:\n${tokens.join("\n")}`);
});

bot.launch();
