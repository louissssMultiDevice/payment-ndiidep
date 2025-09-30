const API_BASE = 'http://payment-ndii.privhandi.my.id/api'

// cek QRIS (dummy check — pada produksi panggil API provider)
async function checkQris(type){
  // contoh: panggil endpoint /api/qris-status?type=dana
  try{
    const res = await fetch(`${API_BASE}/qris-status?type=${type}`)
    const j = await res.json()
    return j.available ? j.qr : null
  }catch(e){
    console.error(e)
    return null
  }
}

async function initQris(){
  document.querySelectorAll('.qris-item').forEach(async el=>{
    const t = el.dataset.type
    const qr = await checkQris(t)
    const status = el.querySelector('.qris-status')
    if(qr) status.innerHTML = `<img src="${qr}" alt="qris ${t}" style="max-height:120px">`
    else status.textContent = 'QRIS belum terdaftar'
  })
}

initQris()

// upload bukti
const form = document.getElementById('upload-form')
form.addEventListener('submit', async e=>{
  e.preventDefault()
  const file = document.getElementById('proof').files[0]
  const nama = document.getElementById('nama').value
  const nominal = document.getElementById('nominal').value
  if(!file) return alert('Pilih file dulu')

  const fd = new FormData()
  fd.append('proof', file)
  fd.append('nama', nama)
  fd.append('nominal', nominal)

  const r = await fetch(`${API_BASE}/upload`,{method:'POST',body:fd})
  const j = await r.json()
  document.getElementById('result').innerText = JSON.stringify(j, null, 2)
})
