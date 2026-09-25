(function(){
  function panel(name){
    var main=document.querySelector('.main'), top=document.querySelector('.topline h1'); if(!main)return;
    var map={
      'Акции':['.campaignCreatePanel'],
      'Меню':['.builderMenus'],
      'Продукты':['.productStandalone'],
      'Допы к товару':['.addonAdminPanel']
    }, wanted=map[name]; if(!wanted)return;
    document.querySelectorAll('.side button').forEach(function(b){b.classList.toggle('active',b.textContent.trim()===name);});
    ['.campaignCreatePanel','.builderMenus','.builderProducts','.productStandalone','.addonAdminPanel'].forEach(function(sel){document.querySelectorAll(sel).forEach(function(x){x.style.setProperty('display',wanted.indexOf(sel)>=0?'block':'none','important');});});
    if(top)top.textContent=name;
  }
  document.addEventListener('click',function(e){var b=e.target.closest('.side button');if(!b)return;var n=b.textContent.trim();if(!['Акции','Меню','Продукты','Допы к товару'].includes(n))return;e.preventDefault();e.stopImmediatePropagation();panel(n);},true);
  window.addEventListener('load',function(){setTimeout(function(){var b=document.querySelector('.side button.active');if(b)panel(b.textContent.trim());},300);});
  setInterval(function(){var b=document.querySelector('.side button.active');if(b&&['Акции','Меню','Продукты','Допы к товару'].includes(b.textContent.trim()))panel(b.textContent.trim());},300);
})();
