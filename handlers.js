const fs = require("node:fs/promises");
const prisma = require("./db");
const { generateSchedule, parseNearestDay } = require("./puppeeter");

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
  } catch(e) {
    ctx.reply(
      "Не удалось сгенерировать расписание, возможно указан некорректный шифр группы (ну или разработчик даун)"
    );
    console.log(e);
    return;
  }
  let file = await fs.readFile("./" + scheduleFileName);
  await ctx.telegram.sendDocument(ctx.chat.id, {
    source: file,
    filename: "schedule.png",
  });
  await fs.unlink("./" + scheduleFileName);
}

function OnNearest(current) {
  return async (ctx) => {
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

    let today = new Date();

    let tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (!current) {
      today.setDate(today.getDate() + 1);
      tomorrow.setDate(tomorrow.getDate() + 1);
    } else {
      today.setDate(today.getDate() - 1);
      tomorrow.setDate(tomorrow.getDate() - 1);
    }

    const cached = await prisma.cache.findFirst({
      where: {
        date: {
          gte: today,
          lte: tomorrow,
        },
        group_name: group,
      },
    });

    if (cached) {
      await ctx.reply(cached.text);
      return;
    }

    await ctx.reply("Ищу...");

    try {
      let { finalText, date } = await parseNearestDay(group, current);
      let pattern = /(\d{2})\.(\d{2})\.(\d{4})/;
      let parsedDate = new Date(date.replace(pattern, "$3-$2-$1"));

      await prisma.cache.create({
        data: {
          date: parsedDate,
          group_name: group,
          text: finalText,
        },
      });

      await ctx.reply(finalText);
    } catch {
      await ctx.reply(
        "Не удалось сгенерировать расписание, возможно указан некорректный шифр группы (ну или разработчик даун)"
      );
    }
  };
}

async function OnGroup(ctx) {
  let msg = ctx.message.text;
  let args = msg.split(" ");
  if (args.length < 2) {
    ctx.reply("Укажи группу!");
    return;
  }

  if (ctx.chat.id !== ctx.from.id) {
    let member = await ctx.getChatMember(ctx.from.id);
    if (member.status === "administrator" || member.status === "creator") {
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
  } else {
    ctx.reply("Только администратор может менять группу!");
    return;
  }
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
  }

  await next();
}

module.exports = { OnSchedule, Validate, OnGroup, OnNearest };
