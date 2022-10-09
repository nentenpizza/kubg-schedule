var domtoimage = require('dom-to-image');
const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client')
const { Telegraf } = require('telegraf');
const { time } = require('console');
const fs = require('node:fs/promises');

const prisma = new PrismaClient()
let browser

async function main() {
    browser = await puppeteer.launch({defaultViewport: null});

    const bot = new Telegraf(process.env.BOT_TOKEN);

    bot.use(validate)

    bot.start((ctx) => ctx.reply(`
Привет! Я бот который может отправлять расписание твоей группы.
Для начала тебе нужно установить группу, сделать это можно с помощью команды
/group <Название группы>`));
    bot.command('group', async (ctx) => {
        let msg = ctx.message.text
        let args = msg.split(" ")
        if (args.length < 2) {
            ctx.reply("Укажи группу!")
            return
        }

        if (ctx.chat.id !== ctx.from.id) {
            let member = await ctx.getChatMember(ctx.from.id)
            if (!member.can_manage_chat) {
                ctx.reply("Только администратор может менять группу!")
                return
            }
            let chat = await prisma.group.update({
                where: {
                    group_id: ctx.chat.id
                },
                data: {
                    group_name: args[1]
                }
            })
            ctx.reply("Группа установлена! /schedule чтобы увидеть расписание")
            return
        }

            let user = await prisma.user.update({
                where: {
                    user_id: ctx.chat.id
                },
                data: {
                    group_name: args[1]
                }
            })
            ctx.reply("Группа установлена! /schedule чтобы увидеть расписание")
            return
    })

    bot.command('schedule', async (ctx) => {
        let group;
        if (ctx.chat.id !== ctx.from.id) {
            let chat = await prisma.group.findUnique({
                where: {
                    group_id: ctx.chat.id
                }
            })
            group = chat.group_name
            
        } else {
            let chat = await prisma.user.findUnique({
                where: {
                    user_id: ctx.chat.id
                }
            })
            group = chat.group_name
        }
        await ctx.reply("Генерирую расписание...")
        let scheduleFileName = await generateSchedule(group)
        let file = await fs.readFile("./"+scheduleFileName)
        await ctx.telegram.sendDocument(ctx.chat.id, {
            source: file,
            filename: 'schedule.png'
        })
        await fs.unlink("./"+scheduleFileName)
    })

    
    bot.hears('hi', (ctx) => ctx.reply('Hey there'));
    bot.launch();
    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

async function validate(ctx, next) {

            let user = await prisma.user.findUnique({
                where: {
                    user_id: ctx.from.id
                }
            })
            if (user === null) {
                let today = new Date();
                today.setDate(today.getDate() - 1)
                chat = await prisma.user.create({
                    data: {
                        user_id: ctx.chat.id,
                        first_name: ctx.from.first_name,
                        last_name: ctx.from.last_name || "",
                        last_use: today,
                    }
                })
            }

        if (ctx.chat.id !== ctx.from.id) {
            let chat = await prisma.group.findUnique({
                where: {
                    group_id: ctx.chat.id
                }
            })
            if (chat === null) {
                let today = new Date();
                today.setDate(today.getDate() - 1)
                chat = await prisma.group.create({
                    data: {
                        group_id: ctx.chat.id,
                        pin: false,
                        last_use: today
                    }
                })
            }
            console.log(chat)
        }
    
        await next()
}

async function generateSchedule(group) {
    const browser = await puppeteer.launch({defaultViewport: null});
    const page = await browser.newPage();
    await page.setViewport({
        width: 1920,
        height: 700
    })
    await page.goto('https://dekanat.kubg.edu.ua/cgi-bin/timetable.cgi?n=700');
    await page.$eval('#group', el => el.value = 'ІНб12240д');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.hidden-xs')

    let filename = Date.now().toString()+".png"
    await page.screenshot({path: filename ,fullPage: true });

    return filename
}

main()
  .then(async () => {
    await prisma.$disconnect()
    await browser.close();
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })