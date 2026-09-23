"use client";
import { useEffect } from "react";
export default function Home(){
  useEffect(()=>{ window.location.replace('/legacy/index.html'); },[]);
  return <main style={{padding:24,fontFamily:'sans-serif'}}>Загрузка приложения…</main>;
}
