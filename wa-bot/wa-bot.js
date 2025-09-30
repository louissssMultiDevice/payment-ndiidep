// wa-bot/wa-bot.js
// gunakan @adiwajshing/baileys
const makeWASocket = require('@adiwajshing/baileys').default
const { Boom } = require('@hapi/boom')
const P = require('pino')
const fetch = require('node-fetch')

async function startBot(){
  const sock = makeWASocket({logger: P({level:'silent'})})

  sock.ev.on('messages.upsert', async m =>{
    const msg = m.messages[0]
    if(!msg.message) return
    const from = msg.key.remoteJid

    // jika owner mengirim perintah /bales done <paymentId>
    if(msg.message.conversation && msg.message.conversation.startsWith('/bales')){
      const parts = msg.message.conversation.split(' ')
      if(parts[1] === 'done' && parts[2]){
        const paymentId = parts[2]
        // panggil web API untuk confirm
        await fetch(process.env.WEB_API + '/api/confirm',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({paymentId, confirmer:from})})
        await sock.sendMessage(from,{text:'Payment '+paymentId+' telah ditandai sebagai Verified.'})
      }
    }
  })

  // route endpoint agar server bisa memerintahkan bot forward
  const express = require('express')
  const app = express()
  app.get('/forward', async (req,res)=>{
    const paymentId = req.query.paymentId
    const file = req.query.file
    // ambil file dari server uploads
    const url = process.env.WEB_API + '/uploads/' + file
    // kirim ke owner
    const owner = process.env.OWNER_WHATSAPP // e.g. '62812xxxxx@s.whatsapp.net'
    await sock.sendMessage(owner,{image:{url}, caption: `Bukti transfer (paymentId: ${paymentId})`})
    res.json({ok:true})
  })

  app.listen(4000, ()=> console.log('WA bot webhook listening 4000'))
}

startBot().catch(console.error)
