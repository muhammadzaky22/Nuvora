import fs from 'node:fs'

const manifest='android/app/src/main/AndroidManifest.xml'
if(!fs.existsSync(manifest)){
  console.error('Android project belum ada. Jalankan: npx cap add android')
  process.exit(1)
}

let s=fs.readFileSync(manifest,'utf8')
const camera='<uses-permission android:name="android.permission.CAMERA" />'

if(!s.includes('android.permission.CAMERA')){
  const next=s.replace(/<manifest\b[^>]*>/,m=>`${m}\n    ${camera}`)
  if(next===s){
    console.error('Tag <manifest> tidak ditemukan.')
    process.exit(1)
  }
  s=next
}

fs.writeFileSync(manifest,s)
console.log('AndroidManifest siap: CAMERA permission tersedia.')
