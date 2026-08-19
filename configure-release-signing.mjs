import fs from 'node:fs'

const gradle='android/app/build.gradle'
const required=['ANDROID_KEYSTORE_PASSWORD','ANDROID_KEY_ALIAS','ANDROID_KEY_PASSWORD']
for(const k of required){
  if(!process.env[k]){
    console.error(`Missing environment variable: ${k}`)
    process.exit(1)
  }
}
if(!fs.existsSync(gradle)){
  console.error('android/app/build.gradle tidak ditemukan.')
  process.exit(1)
}

let s=fs.readFileSync(gradle,'utf8')

if(!s.includes('signingConfigs {')){
  const block=`
    signingConfigs {
        release {
            storeFile file("release.keystore")
            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
            keyAlias System.getenv("ANDROID_KEY_ALIAS")
            keyPassword System.getenv("ANDROID_KEY_PASSWORD")
        }
    }
`
  s=s.replace(/android\s*\{/,m=>m+block)
}

if(!s.includes('signingConfig signingConfigs.release')){
  s=s.replace(
    /buildTypes\s*\{\s*release\s*\{/m,
    m=>m+'\n            signingConfig signingConfigs.release'
  )
}

fs.writeFileSync(gradle,s)
console.log('Release signing config diterapkan.')
