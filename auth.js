import { cloudEnabled, supabase } from './supabase'
const L_USER='nuvora_v02_local_user'

export async function currentUser(){
  if(!cloudEnabled){
    try{return JSON.parse(localStorage.getItem(L_USER))}catch{return null}
  }
  const {data:{session}}=await supabase.auth.getSession()
  return session?.user || null
}
export function onAuthChange(cb){
  if(!cloudEnabled) return {unsubscribe:()=>{}}
  const {data}=supabase.auth.onAuthStateChange((_event,session)=>cb(session?.user||null))
  return data.subscription
}
export async function signIn(email,password){
  if(!cloudEnabled){
    const user={id:`local-${btoa(email).replace(/=/g,'')}`,email,user_metadata:{full_name:email.split('@')[0]}}
    localStorage.setItem(L_USER,JSON.stringify(user)); return {user,message:'Mode lokal aktif'}
  }
  const {data,error}=await supabase.auth.signInWithPassword({email,password})
  if(error) throw error; return {user:data.user}
}
export async function signUp(name,email,password){
  if(!cloudEnabled){
    const user={id:`local-${btoa(email).replace(/=/g,'')}`,email,user_metadata:{full_name:name||email.split('@')[0]}}
    localStorage.setItem(L_USER,JSON.stringify(user)); return {user,message:'Akun lokal dibuat'}
  }
  const {data,error}=await supabase.auth.signUp({email,password,options:{data:{full_name:name}}})
  if(error) throw error
  return {user:data.user,needsConfirmation:!data.session}
}
export async function signOut(){
  if(!cloudEnabled){localStorage.removeItem(L_USER);return}
  const {error}=await supabase.auth.signOut(); if(error) throw error
}
