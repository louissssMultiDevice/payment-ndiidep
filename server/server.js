// server/server.js
const express = require('express')
const multer = require('multer')
const path = require('path')
const ocr = require('./ocr')
const fs = require('fs')

const app = express()
app.use(express.json())
app.use(express.static(path.join(__dirname,'../frontend')))

// storage
const uploadDir = path.join(__dirname,'uploads')
if(!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir,{recursive:true})
const storage = multer.diskStorage({
  destination: (req,file,cb)=> cb(null, uploadDir),
  filename: (req,file,cb)=> cb(null, Date.now()+path.extname(file.originalname))
})
const upload = multer({storage})

// mock QRIS status endpoint
app.get('/api/qris-status', (req,res)=>{
  const type = req.query.type
  // contoh data, di produksi ganti cek ke DB/provider
  const db = {
    dana: {available:true, qr:'/qris-samples/dana.png'},
    gopay:{available:false},
    orkut:{available:false}
  }
  res.json(db[type] || {available:false})
})

// upload bukti
app.post('/api/upload', upload.single('proof'), async (req,res)=>{
  const file = req.file
  const {nama, nominal} = req.body
  if(!file) return res.status(400).json({ok:false,msg:'file kosong'})

  // jalankan OCR
  try{
    const text = await ocr.extractText(file.path)
    // coba parse tanggal, nominal
    const parsed = ocr.parsePaymentText(text)

    // jika parsing gagal (nilai confidence rendah / field tidak ada) => simpan status pending
    const needManual = !parsed.amount || !parsed.date

    const record = {
      id: Date.now().toString(),
      file: file.filename,
      nama, nominal_from_user: nominal || null,
      ocr_text: text,
      parsed,
      status: needManual ? 'pending' : 'verified'
    }

    // simpan ke file (contoh; ganti DB)
    const dbfile = path.join(__dirname,'payments.json')
    let dbdata = []
    if(fs.existsSync(dbfile)) dbdata = JSON.parse(fs.readFileSync(dbfile,'utf8'))
    dbdata.push(record)
    fs.writeFileSync(dbfile, JSON.stringify(dbdata,null,2))

    // jika perlu manual, trigger action: (1) kirim notifikasi ke WhatsApp bot melalui webhook
    if(needManual){
      // contoh: panggil webhook bot (set environment var WA_BOT_WEBHOOK)
      const webhook = process.env.WA_BOT_WEBHOOK
      if(webhook){
        // fire and forget
        require('node-fetch')(webhook + '/forward?paymentId=' + record.id + '&file=' + encodeURIComponent(record.file)).catch(()=>{})
      }
    }

    res.json({ok:true, record})
  }catch(err){
    console.error(err)
    res.status(500).json({ok:false,msg:'OCR gagal',err:err.message})
  }
})

// endpoint untuk bot ketika owner menulis '/bales done' -> bot panggil ini
app.post('/api/confirm', (req,res)=>{
  const {paymentId, confirmer} = req.body
  const dbfile = path.join(__dirname,'payments.json')
  if(!fs.existsSync(dbfile)) return res.json({ok:false,msg:'not found'})
  const dbdata = JSON.parse(fs.readFileSync(dbfile,'utf8'))
  const rec = dbdata.find(r=>r.id===paymentId)
  if(!rec) return res.json({ok:false,msg:'not found'})
  rec.status = 'verified_manual'
  rec.confirmed_by = confirmer || 'owner'
  fs.writeFileSync(dbfile, JSON.stringify(dbdata,null,2))
  // (opsional) kirim notifikasi ke frontend via websockets / push
  res.json({ok:true, rec})
})

const PORT = process.env.PORT || 3000
app.listen(PORT, ()=> console.log('Server running on', PORT))
