const fs = require("node:fs/promises");
const prisma = require("./prisma");
const { generateSchedule } = require("./puppeeter");

async function OnSchedule(ctx) {
  let group;
  if (ctx.chat.id !== ctx.from.id) {
    let chat = await prisma.group.findUnique({
      where: {
        group_id: ctx.chat.id,
      },
    });
    group = chat.group_name;
  } else {
    let chat = await prisma.user.findUnique({
      where: {
        user_id: ctx.chat.id,
      },
    });
    group = chat.group_name;
  }
  await ctx.reply("Генерирую расписание...");
  let scheduleFileName;
  try {
    scheduleFileName = await generateSchedule(group);
  } catch {
    ctx.reply(
      "Не удалось сгенерировать расписание, возможно указан некорректный шифр группы"
    );
    return;
  }
  let file = await fs.readFile("./" + scheduleFileName);
  await ctx.telegram.sendDocument(ctx.chat.id, {
    source: file,
    filename: "schedule.png",
  });
  await fs.unlink("./" + scheduleFileName);
}

async function Validate(ctx, next) {
  let user = await prisma.user.findUnique({
    where: {
      user_id: ctx.from.id,
    },
  });
  if (user === null) {
    let today = new Date();
    today.setDate(today.getDate() - 1);
    chat = await prisma.user.create({
      data: {
        user_id: ctx.chat.id,
        first_name: ctx.from.first_name,
        last_name: ctx.from.last_name || "",
        last_use: today,
      },
    });
  }

  if (ctx.chat.id !== ctx.from.id) {
    let chat = await prisma.group.findUnique({
      where: {
        group_id: ctx.chat.id,
      },
    });
    if (chat === null) {
      let today = new Date();
      today.setDate(today.getDate() - 1);
      chat = await prisma.group.create({
        data: {
          group_id: ctx.chat.id,
          pin: false,
          last_use: today,
        },
      });
    }
    console.log(chat);
  }

  await next();
}

module.exports = { OnSchedule, Validate };
