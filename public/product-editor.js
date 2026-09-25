(function(){
  function bind(){
    var p=document.querySelector('.productStandalone');
    if(!p || p.dataset.bound==='1') return;
    var button=p.querySelector('.psAdd');
    if(!button) return;
    p.dataset.bound='1';
    var campaignSelect=p.querySelector('.psCampaign'), menuSelect=p.querySelector('.psMenu');
    var picker=document.createElement('div'); picker.className='psAddonPicker'; picker.style.cssText='margin:14px 0;padding:14px;border:1px solid #dbe1eb;border-radius:12px;max-height:260px;overflow:auto'; picker.innerHTML='<b>Допы для продукта</b><input class="psAddonSearch" placeholder="Поиск группы или допа" style="display:block;width:100%;margin:8px 0;padding:8px;border:1px solid #dbe1eb;border-radius:8px"><div class="psAddonRows">Загрузка…</div>'; var mediaGrid=p.querySelector('.psImage')?.closest('.grid'); if(mediaGrid) mediaGrid.before(picker);
    async function loadAddons(){try{var groups=await (await fetch('/catalog-data.html?entity=addon_groups&_='+Date.now(),{cache:'no-store'})).json(), addons=await (await fetch('/catalog-data.html?entity=addons&_='+Date.now(),{cache:'no-store'})).json(); var rows=groups.map(function(g){var aa=addons.filter(function(a){return a.group_id===g.id;});return '<fieldset data-search="'+String(g.name).toLowerCase()+'"><legend><label><input type="checkbox" class="psGroup" value="'+g.id+'"> '+String(g.name).replace(/[<>]/g,'')+'</label></legend>'+aa.map(function(a){return '<label style="display:block;margin:3px 0 3px 18px" data-search="'+String(a.name).toLowerCase()+'"><input type="checkbox" class="psAddon" value="'+a.id+'" data-group="'+g.id+'"> '+String(a.name).replace(/[<>]/g,'')+' <small>+'+a.price+' ₽</small></label>';}).join('')+'</fieldset>';}).join(''); picker.querySelector('.psAddonRows').innerHTML=rows||'Допы ещё не созданы'; picker.querySelectorAll('.psGroup').forEach(function(g){g.addEventListener('change',function(){picker.querySelectorAll('.psAddon[data-group="'+g.value+'"]').forEach(function(a){a.checked=g.checked;});});}); picker.querySelector('.psAddonSearch').addEventListener('input',function(){var q=this.value.toLowerCase();picker.querySelectorAll('fieldset,[data-search]').forEach(function(x){x.style.display=!q||x.dataset.search.includes(q)?'':'none';});});}catch(_){picker.querySelector('.psAddonRows').textContent='Не удалось загрузить допы';}}
    loadAddons();
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
        var volume=p.querySelector('.psVolume').value ? Number(p.querySelector('.psVolume').value) : null;
        var weight=p.querySelector('.psWeight').value ? Number(p.querySelector('.psWeight').value) : null;
        var menu=p.querySelector('.psMenu').value;
        var main=p.querySelector('.psMain').checked;
        if(!name || !menu){status.textContent='Выберите меню и укажите название';return;}
        var response=await fetch('/api/admin/catalog',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entity:'products',data:{menu_id:menu,name:name,price:price,volume_ml:volume,weight_g:weight,is_main:main,sort_order:0}})});
        var created=await response.json();
        if(!response.ok) throw new Error(created.error||'Не удалось сохранить продукт');
        var row=Array.isArray(created)?created[0]:created;
        var groupsChecked=[].slice.call(p.querySelectorAll('.psGroup:checked')).map(function(x){return x.value;}), addonsChecked=[].slice.call(p.querySelectorAll('.psAddon:checked')).map(function(x){return x.value;});
        for(var gi=0;gi<groupsChecked.length;gi++) await fetch('/api/admin/catalog',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entity:'product_addon_groups',data:{product_id:row.id,group_id:groupsChecked[gi],is_required:false,max_quantity:1}})});
        for(var ai=0;ai<addonsChecked.length;ai++) await fetch('/api/admin/catalog',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entity:'product_addons',data:{product_id:row.id,addon_id:addonsChecked[ai],is_required:false}})});
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
