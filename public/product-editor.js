(function(){
  function bind(){
    var p=document.querySelector('.productStandalone');
    if(!p || p.dataset.bound==='1') return;
    var button=p.querySelector('.psAdd');
    if(!button) return;
    p.dataset.bound='1';
    var campaignSelect=p.querySelector('.psCampaign'), menuSelect=p.querySelector('.psMenu');
    async function loadOptions(){
      try{
        var catalog=await (await fetch('/api/catalog?editor='+Date.now(),{cache:'no-store'})).json();
        var campaigns=(catalog.campaigns||[]);
        var oldCampaign=campaignSelect.value;
        campaignSelect.innerHTML=campaigns.map(function(c){return '<option value="'+c.id+'">'+String(c.name).replace(/[<>]/g,'')+'</option>';}).join('');
        if(campaigns.some(function(c){return c.id===oldCampaign;})) campaignSelect.value=oldCampaign;
        var menus=(campaigns.reduce(function(all,c){return all.concat((c.menus||[]).map(function(m){return {id:m.id,campaign_id:c.id,name:m.name};}));},[]));
        var rows=menus.filter(function(m){return m.campaign_id===campaignSelect.value;}), oldMenu=menuSelect.value;
        menuSelect.innerHTML=rows.map(function(m){return '<option value="'+m.id+'">'+String(m.name).replace(/[<>]/g,'')+'</option>';}).join('');
        if(rows.some(function(m){return m.id===oldMenu;})) menuSelect.value=oldMenu;
      }catch(_){ }
    }
    campaignSelect.addEventListener('change',loadOptions); loadOptions();
    button.addEventListener('click', async function(){
      var status=p.querySelector('.psStatus');
      status.textContent='Сохраняю…';
      try{
        var name=p.querySelector('.psName').value.trim();
        var price=Number(p.querySelector('.psPrice').value||0);
        var menu=p.querySelector('.psMenu').value;
        var main=p.querySelector('.psMain').checked;
        if(!name || !menu){status.textContent='Выберите меню и укажите название';return;}
        var response=await fetch('/catalog-data.html',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entity:'products',data:{menu_id:menu,name:name,price:price,is_main:main,sort_order:0}})});
        var created=await response.json();
        if(!response.ok) throw new Error(created.error||'Не удалось сохранить продукт');
        var row=Array.isArray(created)?created[0]:created;
        var files=[[p.querySelector('.psImage').files[0],'image_url'],[p.querySelector('.psVideo').files[0],main?'video_url':'image_url']];
        for(var i=0;i<files.length;i++){
          var file=files[i][0], field=files[i][1]; if(!file) continue;
          if(file.size>50*1024*1024) throw new Error('Файл больше 50 МБ');
          var sr=await fetch('/upload-sign.html',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:file.name,type:file.type,size:file.size})});
          var signed=await sr.json(); if(!sr.ok) throw new Error(signed.error||'Не удалось подготовить загрузку');
          var uploadUrl='https://lptzejmdtsmnlxfodihr.supabase.co/storage/v1/object/upload/sign/drinkit-media/'+encodeURIComponent(signed.path)+'?token='+encodeURIComponent(signed.token);
          var ur=await fetch(uploadUrl,{method:'PUT',headers:{'Content-Type':file.type||'application/octet-stream'},body:file});
          if(!ur.ok) throw new Error('Загрузка медиа: HTTP '+ur.status);
          var mr=await fetch('/media-update.html',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({table:'products',id:row.id,field:field,value:signed.url})});
          if(!mr.ok) throw new Error('Не удалось сохранить ссылку на медиа');
        }
        status.textContent='Сохранено в Supabase';
        p.querySelector('.psName').value=''; p.querySelector('.psPrice').value='';
      }catch(error){ status.textContent='Ошибка: '+error.message; }
    });
  }
  setInterval(bind,100);
})();
