(function(){
  const names=['Акции','Меню','Продукты','Допы к товару'];
  const map={Акции:['.campaignCreatePanel'],Меню:['.builderMenus'],Продукты:['.productStandalone'], 'Допы к товару':['.addonAdminPanel']};
  function setActive(name){
    const main=document.querySelector('.main'), top=main?.querySelector('.topline h1'); if(!main||!map[name])return;
    document.querySelectorAll('.side button').forEach(b=>{const on=b.textContent.trim()===name;b.classList.toggle('active',on);b.dataset.selected=on?'true':'false';b.style.setProperty('background',on?'#2f4ed7':'transparent','important');b.style.setProperty('color',on?'#fff':'#b7c1db','important')});
    const all=['.campaignCreatePanel','.builderMenus','.builderProducts','.productStandalone','.addonAdminPanel'];
    all.forEach(sel=>document.querySelectorAll(sel).forEach(el=>el.style.setProperty('display',map[name].includes(sel)?'block':'none','important')));
    if(top)top.textContent=name;
  }
  window.addEventListener('click',e=>{const b=e.target.closest?.('.side button');if(!b)return;const n=b.textContent.trim();if(names.includes(n))setActive(n)},true);
  window.addEventListener('load',()=>{const b=document.querySelector('.side button.active');if(b&&names.includes(b.textContent.trim()))setActive(b.textContent.trim())});
  window.adminSetSection=setActive;
})();