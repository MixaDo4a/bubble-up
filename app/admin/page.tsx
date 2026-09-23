"use client";
import { useEffect } from "react";
export default function AdminPage(){
  useEffect(()=>{ window.location.replace('/legacy/admin.html'); },[]);
  return <main style={{padding:24,fontFamily:'sans-serif'}}>Загрузка конструктора…</main>;
}
