var domtoimage = require("dom-to-image");
const { Telegraf } = require("telegraf");
const { time } = require("console");
const fs = require("node:fs/promises");

const { OnSchedule, Validate } = require("./handlers");

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

  bot.command("group", async (ctx) => {
    let msg = ctx.message.text;
    let args = msg.split(" ");
    if (args.length < 2) {
      ctx.reply("Укажи группу!");
      return;
    }

    if (ctx.chat.id !== ctx.from.id) {
      let member = await ctx.getChatMember(ctx.from.id);
      if (!member.can_promote_members) {
        ctx.reply("Только администратор может менять группу!");
        return;
      }
      let chat = await prisma.group.update({
        where: {
          group_id: ctx.chat.id,
        },
        data: {
          group_name: args[1],
        },
      });
      ctx.reply("Группа установлена! /schedule чтобы увидеть расписание");
      return;
    }

    let user = await prisma.user.update({
      where: {
        user_id: ctx.chat.id,
      },
      data: {
        group_name: args[1],
      },
    });
    ctx.reply("Группа установлена! /schedule чтобы увидеть расписание");
    return;
  });

  bot.command("schedule", OnSchedule);

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
