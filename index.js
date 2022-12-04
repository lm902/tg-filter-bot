require('dotenv').config()
const TelegramBot = require('node-telegram-bot-api')
const token = process.env.TELEGRAM_BOT_TOKEN
const bot = new TelegramBot(token, { polling: true })
const keywords = process.env.DISALLOWED_KEYWORDS.split('|').map(x => x.trim().toLowerCase()).filter(x => x)
const classes = process.env.DISALLOWED_CLASSES.split('|').map(x => x.trim().toLowerCase()).filter(x => x)
const tf = require('@tensorflow/tfjs-node')
const nsfw = require('nsfwjs')
const modelPromise = nsfw.load()
bot.on('text', message => {
  for (const keyword of keywords) {
    if (message.text.toLowerCase().includes(keyword)) {
      bot.deleteMessage(message.chat.id, message.message_id)
        .catch(_ => false)
        .then(result => console.log(`${Date()} @${message.from?.username} 发送的信息 ${message.text} 包含关键词 ${keyword} 被${result ? '成功' : '失败'}删除`))
    }
  }
})
bot.on('photo', message => {
  const photo = message.photo[Math.min(message.photo.length - 1, 2)]
  bot.getFileLink(photo.file_id).then(async location => {
    const model = await modelPromise
    const response = await fetch(location)
    const arrayBuffer = await response.arrayBuffer()
    const image = await tf.node.decodeImage(new Uint8Array(arrayBuffer))
    const predictions = await model.classify(image)
    image.dispose()
    for (const className of classes) {
      if (predictions[0].className.toLowerCase() === className) {
        bot.deleteMessage(message.chat.id, message.message_id)
          .catch(_ => false)
          .then(result => console.log(`${Date()} @${message.from?.username} 发送的图片是 ${predictions[0].className} 的几率为 ${(predictions[0].probability * 100).toFixed(1)}% 被${result ? '成功' : '失败'}删除`))
      }
    }
    console.log(predictions)
  })
})
bot.on('polling_error', error => {
  if (error.message.includes('409 Conflict')) return
  console.error(error)
})
bot.startPolling()
