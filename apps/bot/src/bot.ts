import "dotenv/config";
import { Bot, InlineKeyboard } from "grammy";

const token = process.env.TELEGRAM_BOT_TOKEN;
const webAppUrl = process.env.WEB_APP_URL;

if (!token) throw new Error("TELEGRAM_BOT_TOKEN is required");
if (!webAppUrl) throw new Error("WEB_APP_URL is required");

const bot = new Bot(token);

bot.command("start", async ctx => {
  await ctx.reply(
    `Welcome to VAMIOS Bingo, ${ctx.from.first_name}!\n\n` +
    `This demo uses virtual credits. Open the Web App to enter the lobby.`,
    {
      reply_markup: new InlineKeyboard().webApp("🎮 Open VAMIOS", webAppUrl)
    }
  );
});

bot.command("register", async ctx => {
  await ctx.reply("Your Telegram identity is registered automatically when you open the VAMIOS Web App.");
});

bot.command("deposit", async ctx => {
  await ctx.reply("Demo mode: deposits are simulated inside the Web App. Production payment processing must be connected to a licensed provider.");
});

bot.command("withdraw", async ctx => {
  await ctx.reply("Demo mode: withdrawals are simulated inside the Web App. Production withdrawals must use a compliant payment/KYC flow.");
});

bot.command("play", async ctx => {
  await ctx.reply("Open the VAMIOS lobby:", {
    reply_markup: new InlineKeyboard().webApp("🎮 Play VAMIOS", webAppUrl)
  });
});

bot.catch(err => console.error(err));
bot.start();
