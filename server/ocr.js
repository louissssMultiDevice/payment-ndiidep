// server/ocr.js
const tesseract = require('node-tesseract-ocr')
const fs = require('fs')

const config = {
  lang: 'eng+ind',
  oem: 1,
  psm: 3
}

async function extractText(filePath){
  return await tesseract.recognize(filePath, config)
}

function parsePaymentText(text){
  // sangat sederhana: cari tanggal dd/mm/yyyy atau yyyy-mm-dd dan nominal Rp/IDR/angka
  const parsed = {date:null, amount:null}
  // tanggal
  const dateRegex = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{4}-\d{1,2}-\d{1,2})/g
  const dateMatch = text.match(dateRegex)
  if(dateMatch) parsed.date = dateMatch[0]

  // nominal (mencari Rp atau angka dengan pemisah)
  const amountRegex = /(Rp\.?\s*[0-9.,]+)|([0-9]{1,3}(?:[.,][0-9]{3})+)/g
  const amt = text.match(amountRegex)
  if(amt) parsed.amount = amt[0]

  return parsed
}

module.exports = { extractText, parsePaymentText }
