var domtoimage = require("dom-to-image");
const { Telegraf } = require("telegraf");
const { time } = require("console");
const fs = require("node:fs/promises");

const { OnSchedule, Validate, OnGroup, OnNearest } = require("./handlers");

const prisma = require("./prisma");

async function main() {
  const bot = botInit();

  bot.launch();
  // Enable graceful stop
  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

function botInit() {
  const bot = new Telegraf(process.env.BOT_TOKEN);

  bot.use(Validate);

  bot.start((ctx) =>
    ctx.reply(`
Привет! Я бот который может отправлять расписание твоей группы.
Для начала тебе нужно установить группу, сделать это можно с помощью команды
/group <Название группы>`)
  );

  bot.command("group", OnGroup);
  bot.command("schedule", OnSchedule);
  bot.command("current", OnNearest(true));
  bot.command("next", OnNearest(false));

  bot.hears("hi", (ctx) => ctx.reply("Hey there"));

  return bot;
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
