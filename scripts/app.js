(function(){
  function seedFor(str){var s=0;for(var i=0;i<str.length;i++)s=(s*31+str.charCodeAt(i))%999983;return s;}
  // build a stable 7-entry timeline: real signals first, then synthetic older ones
  var TL_TIMES=["7h","11h","16h","22h","1d","2d","3d","4d","5d"];
  function timelineFor(id){
    var real=(SIGNALS[id]||[]).slice();
    var out=real.slice();
    var seed=seedFor(id);
    var i=0;
    while(out.length<7){
      var ev=TL_EVENTS[(seed+i*5)%TL_EVENTS.length];
      var src=TL_SRC[(seed+i*3)%TL_SRC.length];
      out.push({src:src,head:ev.t,time:TL_TIMES[Math.min(out.length, TL_TIMES.length-1)],dir:ev.d,m:ev.m});
      i++;
    }
    // normalize timestamps to read oldest→down the list
    for(var k=0;k<out.length;k++){ if(!out[k].time) out[k].time=TL_TIMES[Math.min(k,TL_TIMES.length-1)]; }
    return out.slice(0,7);
  }
  var liveTL={id:null, items:[], timer:null};
  function liveEventFor(id){
    var ev=TL_EVENTS[Math.floor(Math.random()*TL_EVENTS.length)];
    var src=TL_SRC[Math.floor(Math.random()*TL_SRC.length)];
    return {src:src,head:ev.t,time:"now",dir:ev.d,m:ev.m,live:true};
  }
  function ageLabel(prev){ // bump a "now" item to a real age once a newer one arrives
    if(prev==='now')return '1m';
    var n=parseInt(prev,10)||1;
    if(prev.indexOf('m')>=0)return (n+3)+'m';
    return prev;
  }
  function renderTimeline(){
    var host=document.getElementById('d-signals'); if(!host)return;
    host.innerHTML=liveTL.items.slice(0,7).map(sigRow).join('');
  }
  function startLiveTL(){
    stopLiveTL();
    liveTL.timer=setInterval(function(){
      var det=document.getElementById('s-detail');
      if(!det||!det.classList.contains('active')){return;}
      // age the current entries, prepend a fresh "now" event, keep 7
      liveTL.items.forEach(function(it){ if(it.live){it.live=false;} it.time=it.time==='now'?'1m':it.time; });
      liveTL.items.unshift(liveEventFor(liveTL.id));
      liveTL.items=liveTL.items.slice(0,7);
      renderTimeline();
      var first=document.querySelector('#d-signals .sigrow'); if(first){first.classList.add('sig-in');}
    }, 4200);
  }
  function stopLiveTL(){ if(liveTL.timer){clearInterval(liveTL.timer);liveTL.timer=null;} }
  function curOf(id){return CUR[id]||{calls:10,hit:0.7,rallied:20,yf:0,col:"#D8C9A4"};}
  var LOCK=7, FEE=0.94;
  var positions=[], record={won:0,lost:0}, balance=500, currentId="humanoidrobots", carousel={}, leadSlide={}, vio;
  // portfolio ledger — running history of balance changes
  var ledger=[{kind:'open',label:'Opening balance',delta:500,bal:500,t:Date.now()-86400000*9}];
  function ledgerAdd(kind,label,delta){ balance+=delta; ledger.push({kind:kind,label:label,delta:delta,bal:balance,t:Date.now()}); }
  function netPL(){var p=0;ledger.forEach(function(e){if(e.kind==='win'||e.kind==='loss')p+=e.delta;});return p;}
  // seed a little demo history + open positions so the page is meaningful
  (function seedSignals(){
    ledgerAdd('add','Added credits',1000);
    // a couple of settled bets in the past
    ledgerAdd('stake','Placed · GTA VI',-200); ledgerAdd('win','Won · GTA VI',320);
    ledgerAdd('stake','Placed · Bird Flu',-150); ledgerAdd('loss','Lost · Bird Flu',-150);
    record.won=1; record.lost=1;
    // open positions currently live
    positions.push({id:'humanoidrobots',dir:'rise',stake:250,lev:2,entry:540,target:600,profit:300,payout:550,status:'open',day:3,placedAt:Date.now()-3600000*5});
    positions.push({id:'claude',dir:'rise',stake:120,lev:1,entry:500,target:540,profit:84,payout:204,status:'open',day:2,placedAt:Date.now()-3600000*20});
    // reflect the two open stakes in the ledger + balance
    ledgerAdd('stake','Placed · Humanoid Robots',-250);
    ledgerAdd('stake','Placed · Claude',-120);
  })();
  var HANDLES=["lina.eth","tomi","amaka","devon","sora","mira.eth","kojo","val"];
  var AVCOL=["#D8C9A4","#A9C7C2","#C9B0A0","#9aa6c9","#cdb4d8","#b8c9a0"];

  // ===== User badges — earned marks of standing/success =====
  // each badge: id -> {label, title (tooltip), svg path(s), color}
  var BADGE_DEFS={
    verified:{label:'Verified',svg:'<path d="M12 2l2.4 2.1 3.1-.4 1 3 2.8 1.4-1.1 3 1.1 3-2.8 1.4-1 3-3.1-.4L12 22l-2.4-2.1-3.1.4-1-3L2.7 14.4l1.1-3-1.1-3L5.5 4l1-3 3.1.4z"/><path class="bcheck" d="M8.5 12.2l2.3 2.3 4.6-4.8" fill="none" stroke="#000000" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',color:'#4DA3FF',solid:true},
    top:{label:'Top Curator',svg:'<path d="M3 8l4.5 3L12 4l4.5 7L21 8l-1.8 10H4.8L3 8z"/>',color:'#F2B33D',solid:true},
    og:{label:'OG · early member',svg:'<path d="M13 2L4.5 13.5H11l-1 8.5L19.5 10H13l0-8z"/>',color:'#A98BFF',solid:true},
    event:{label:'Event champion',svg:'<path d="M7 4h10v3a5 5 0 0 1-10 0V4z"/><path d="M5 4H3v2a3 3 0 0 0 3 3M19 4h2v2a3 3 0 0 1-3 3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 13h4v3h-4z"/><path d="M8 20h8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',color:'#54D9A6',solid:true},
    streak:{label:'Hot streak',svg:'<path d="M12 2c1 3-1 4-1 6 0 1.5 1 2 1 2s2-1 2-3c2 1.5 4 4 4 7a6 6 0 0 1-12 0c0-3 3-6 4-8 .8-1.6 1.5-2.5 2-4z"/>',color:'#FF7A4D',solid:true}
  };
  // assign badges per user — more/better badges read as more successful
  var USER_BADGES={
    "@thequietedit":["verified","top","streak"],
    "@viceloop":["verified","top","event"],
    "@claudehead":["verified","top","og"],
    "@eloquent":["verified","top"],
    "@parlay":["verified","streak"],
    "@pacers":["verified","event"],
    "@jerry":["verified","og"],
    "@popmart":["verified","streak"],
    "@redcandle":["streak"],
    "@shipfast":["verified","og"],
    "@barry":["verified"],
    "@dirkdiggler":["verified"],
    "@dumb":["og"],
    "@you":[]
  };
  function badgesFor(handle){return USER_BADGES[handle]||[];}
  function badgeIconHTML(bid){var d=BADGE_DEFS[bid];if(!d)return '';
    return '<span class="ubadge" data-badge="'+bid+'" title="'+d.label+'" style="color:'+d.color+'"><svg viewBox="0 0 24 24" fill="'+(d.solid?'currentColor':'none')+'">'+d.svg+'</svg></span>';}
  function badgeRow(handle,max){var b=badgesFor(handle);if(max)b=b.slice(0,max);return b.map(badgeIconHTML).join('');}
  // a username + its badges, as a tappable chip
  function userChip(handle,maxBadges){
    return '<span class="uchip"><span class="post-u" data-user="'+handle+'">'+handle+'</span>'+
      (badgesFor(handle).length?'<span class="ubadges">'+badgeRow(handle,maxBadges)+'</span>':'')+'</span>';
  }

  function fmt(n){return Math.round(n).toLocaleString();}
  function kfmt(n){n=Math.round(n||0);return n>=1000?(n/1000).toFixed(n<10000?1:0).replace(/\.0$/,'')+'k':''+n;}
  function mult(t,dir){var s=(dir==='rise'?t.sent:100-t.sent)/100; return Math.max(1.08,FEE/Math.max(0.05,s));}

  function clipHTML(c){return '<div class="clip" style="--c1:'+c[0]+';--c2:'+c[1]+';--c3:'+(c[2]||c[1])+'"><span class="blob b1"></span><span class="blob b2"></span><span class="blob b3"></span><span class="grain"></span></div>';}
  function mediaHTML(t,m){
    if(m.k==='photo'){return '<div class="media">'+stillImg(m.src)+'</div>';}
    if(m.k==='img'){
      if(m.vsrc){
        // Clip slide: paint the poster (first frame) as the background immediately, so scrolling
        // never shows the animated gradient flashing before the video is ready. No tint over clips.
        // Posters are OPTIONAL — delete any media/<id>/0N.jpg you don't want and the slide falls
        // back to the trend's own colour (never black) until the clip decodes.
        // Don't invent a poster path from the clip name — if it isn't in CLIP_POSTERS it isn't there.
        var poster=m.poster||'';
        var grad='linear-gradient(150deg,'+t.theme[0]+','+(t.theme[2]||t.theme[1])+')';
        return '<div class="media" data-vsrc="'+m.vsrc+'" data-poster="'+poster+'" style="background:'+grad+'"></div>';
      }
      return '<div class="media">'+clipHTML(t.theme)+'<div class="vtint" style="--c1:'+t.theme[0]+';--c3:'+t.theme[2]+'"></div></div>';
    }
    if(m.k==='quote')return '<div class="media quote">'+clipHTML([m.c[0],m.c[1]||m.c[0],m.c[2]||m.c[0]])+'<div class="qscrim"></div><div class="qinner"><p>'+m.q+'</p></div></div>';
    return '<div class="media">'+clipHTML(m.c)+'</div>';
  }
  // lcg: deterministic RNG shared by the relevance chart + sparkline seeds.
  function lcg(s){return (s*9301+49297)%233280;}

  var feed=document.getElementById('feed');
  vio=new IntersectionObserver(function(es){es.forEach(function(e){var v=e.target;
    if(e.isIntersecting){var p=v.play();if(p&&p.catch)p.catch(function(){});}else{v.pause();}});},{root:feed,threshold:.55});

  // Every media path resolves through mediaOwner(), so a trend with no folder of its own
  // (the forces) transparently renders the media of the trend it drives. No empty tiles.
  function mown(id){return (typeof mediaOwner==='function')?mediaOwner(id):id;}
  function vcount(id){return CLIPS[mown(id)]||0;}
  function clipSrc(id,n,thumb){return (thumb?'media/thumbs/':'media/')+mown(id)+'/0'+n+'.mp4';}
  // Posters are optional. Only ask for one if it's actually on disk — otherwise we'd fire a 404
  // on every load for every poster you deleted. No poster => the trend's colour shows until the
  // clip decodes (see mediaHTML), which is the intended fallback.
  function hasPoster(id,n){var p=(typeof CLIP_POSTERS!=='undefined')&&CLIP_POSTERS[mown(id)];
    return !!(p&&p.indexOf(n)>=0);}
  function clipPoster(id,n){return hasPoster(id,n)?('media/'+mown(id)+'/0'+n+'.jpg'):'';}
  // Stills come from media/<id>/p01.jpg... — data.js has already bound these onto t.imgs,
  // so imgsOf(t) is the single way to reach a photo. No external URLs, no cosmos folder.
  function photoCount(id){return (typeof MEDIA_PHOTOS!=='undefined'&&MEDIA_PHOTOS[mown(id)])||0;}
  function photoSrc(id,n){var o=mown(id);return 'media/'+o+'/p'+(n<10?'0':'')+n+'.jpg';}
  function firstStill(id){var t=T[id];var a=t&&imgsOf(t);return (a&&a[0])||(vcount(id)?clipPoster(id,1):'');}
  function clipAttrs(id,n,thumb,extra){return ' data-vsrc="'+clipSrc(id,n,thumb)+'" data-poster="'+clipPoster(id,n)+'"'+(extra||'');}
  function previewClipId(id){if(vcount(id))return id;var rel=SUBMAP[id]||[];
    for(var i=0;i<rel.length;i++){if(vcount(rel[i][0]))return rel[i][0];}
    return null;}
  var isPhone=!!(window.matchMedia&&window.matchMedia('(max-width:600px)').matches);
  // ===== Hard cap on simultaneously-decoding videos. iOS Safari has a small limit on live video
  //       decoders/memory; a dense feed of clips is what tips it into a crash. We keep at most
  //       MAXVIDS mounted and free the oldest first — no feature is removed, just bounded. =====
  var MAXVIDS = isPhone ? 4 : 12;
  var _vlive = []; var _pf = {};
  // Cache-bust clips by version so re-encodes (same filename) always refetch instead of serving a
  // stale, oversized file from the browser cache. Bump ASSET_V whenever the .mp4s are re-encoded.
  var ASSET_V = 'v20260629d';
  function withV(u){ return u + (u.indexOf('?')>=0?'&':'?') + ASSET_V; }
  // Prefetch only off-phone. Mobile Safari is far more constrained by media memory than network here.
  function prefetchURL(u){ if(!u||isPhone)return; u=withV(u); if(_pf[u])return; _pf[u]=1;
    try{ fetch(u,{cache:'force-cache'}).then(function(r){return r&&r.blob&&r.blob();}).catch(function(){}); }catch(e){} }
  function prefetchAhead(el){ if(!el.closest)return; var tp=el.closest('.topic'); if(!tp)return;
    var nx=tp.nextElementSibling,c=0;
    while(nx&&c<3){ var m=nx.querySelector&&nx.querySelector('[data-vsrc]'); if(m)prefetchURL(m.getAttribute('data-vsrc')); nx=nx.nextElementSibling; c++; } }
  // Lazy mount: only on-screen videos exist as <video> elements, so iOS never runs out of memory.
  var vmount=new IntersectionObserver(function(es){es.forEach(function(e){
    if(e.isIntersecting&&isActiveMediaTarget(e.target))mountVid(e.target);else unmountVid(e.target);});},{root:null,rootMargin:'350px',threshold:.2});
  function isActiveMediaTarget(el){
    var s=el&&el.closest&&el.closest('.screen');
    if(s&&!s.classList.contains('active'))return false;
    var track=el&&el.closest&&el.closest('[data-track]');
    if(track&&track.closest('.topic')&&el.getAttribute('data-slide-mount')!=='1')return false;
    return true;
  }
  function isNearViewport(el,margin){var r=el.getBoundingClientRect(),m=margin==null?260:margin;
    return r.bottom>=-m&&r.top<=window.innerHeight+m&&r.right>=-m&&r.left<=window.innerWidth+m;}
  // Same rule as clipPoster(): never guess a poster path from the clip filename. If data-poster is
  // empty the poster was deleted, and the card keeps its gradient until the video paints.
  function posterFor(el){return el.getAttribute('data-poster')||'';}
  function applyMediaPoster(el){if(el._posterSet)return;var poster=posterFor(el);if(!poster)return;
    el.style.backgroundImage='url("'+poster+'")';el.style.backgroundSize='cover';el.style.backgroundPosition='center';el._posterSet=1;}
  function _teardownVid(el){var v=el._v;if(!v)return;try{v.pause();v.removeAttribute('src');v.load();}catch(e){}v.remove();el._v=null;
    var _tnt=el.querySelector('.vtint');if(_tnt)_tnt.style.display='';}
  function mountVid(el){
    if(el._v||!el.getAttribute('data-vsrc')||!isActiveMediaTarget(el))return;
    var src=el.getAttribute('data-vsrc');
    var poster=posterFor(el); // first-frame still: shows instantly, no gradient flash
    applyMediaPoster(el);
    var v=document.createElement('video');
    v.className='vid';
    v.muted=true;v.loop=true;v.playsInline=true;v.setAttribute('muted','');v.setAttribute('playsinline','');v.preload=isPhone?'metadata':'auto';v.style.zIndex='1';
    // Keep the parent poster/gradient visible until the decoder has a real frame. Appending an
    // unready <video> can otherwise flash an opaque black rectangle, especially during a zoom.
    v.style.opacity='0';v.style.transition='opacity .18s ease';
    function revealDecodedVideo(){
      var warmAt=(isFinite(v.duration)&&v.duration>0)?Math.min(1.1,v.duration*.5):1.1;
      if(v.currentTime<warmAt)return;
      v.removeEventListener('timeupdate',revealDecodedVideo);
      if(el._v===v)v.style.opacity='1';
    }
    v.addEventListener('timeupdate',revealDecodedVideo);
    if(poster)v.setAttribute('poster',poster);
    // Keep the same still on the card itself so unmount (scroll-away) reveals the frame, not the gradient.
    v.addEventListener('error',function(){
      var liveIndex=_vlive.indexOf(el);if(liveIndex>=0)_vlive.splice(liveIndex,1);
      if(el._v===v)el._v=null;v.remove();
    });
    v.src=withV(src);
    el.appendChild(v);el._v=v;
    // Drop the theme-color wash over the actual video (kept only for no-clip placeholder cards).
    var _tnt=el.querySelector('.vtint');if(_tnt)_tnt.style.display='none';
    var p=v.play();if(p&&p.catch)p.catch(function(){});
    // enforce the global decoder cap (free the oldest-mounted that's no longer this one)
    _vlive.push(el);
    while(_vlive.length>MAXVIDS){ var old=_vlive.shift(); if(old!==el)_teardownVid(old); }
    prefetchAhead(el);
  }
  function unmountVid(el){var i=_vlive.indexOf(el);if(i>=0)_vlive.splice(i,1);_teardownVid(el);}
  function observeVids(container){if(!container)return;container.querySelectorAll('[data-vsrc]').forEach(function(el){vmount.observe(el);});}

  // ===== Canonical tile media. Every placeholder in the app resolves through these. =====
  // A tile must NEVER be an empty gradient. Chain: the trend's own still -> a surviving clip
  // poster -> (if neither) mount the clip itself so something is always moving.
  // Some trends have clips but no separate photo stills. Their clip posters keep Favorites and
  // other static tiles visually complete before a video is mounted.
  function tileStill(id,i){
    var t=T[id]; if(!t)return '';
    var ims=imgsOf(t);
    if(ims.length)return ims[(i||0)%ims.length];
    var n=vcount(id);                                   // no photo — fall back to any clip poster
    for(var k=1;k<=n;k++){ var p=clipPoster(id,k); if(p)return p; }
    return '';
  }
  // Background layers for a tile: still/poster on top of the trend's gradient (always present).
  function tileBG(id,i,deg){
    var t=T[id]; if(!t)return '';
    var u=tileStill(id,i);
    var g='linear-gradient('+(deg==null?150:deg)+'deg,'+t.theme[0]+','+(t.theme[2]||t.theme[1])+')';
    return 'background-image:'+(u?'url('+u+'),':'')+g+';background-size:cover;background-position:center';
  }
  // If a trend has no still and no poster, mount a clip so the tile is never a flat colour.
  function tileVidAttrs(id,n){
    if(!vcount(id))return '';
    if(tileStill(id,0))return '';                       // a picture already covers it
    return clipAttrs(id,n||1,true);
  }
  function releaseMediaIn(container){if(!container)return;container.querySelectorAll('[data-vsrc]').forEach(function(el){unmountVid(el);try{vmount.unobserve(el);}catch(e){}});}
  function refreshActiveMedia(container){container=container||document.querySelector('.screen.active');if(!container)return;
    observeVids(container);
    container.querySelectorAll('[data-vsrc]').forEach(function(el){
      if(isActiveMediaTarget(el)&&isNearViewport(el,isPhone?180:360)){applyMediaPoster(el);mountVid(el);}else unmountVid(el);
    });}
  // Images for a trend: the multi-image array if present, else the single hero image.
  function imgsOf(t){var arr=[];if(t.img)arr.push(t.img);if(t.imgs)t.imgs.forEach(function(u){if(arr.indexOf(u)<0)arr.push(u);});return arr;}
  // Canonical media list for a trend — the SINGLE source of truth shared by the detail media strip
  // (carTiles) and the full-screen feed carousel (topicHTML). Photos and clips are interleaved in
  // the same order everywhere, so a strip tile's index maps 1:1 to the feed slide it opens.
  // Editorial quotes are appended after the media (feed-only; the strip skips them).
  function orderedMedia(t,id){
    // Photos are whatever data.js bound onto the trend from media/<id>/ — one slide per file.
    var imgs=imgsOf(t);
    var nClips=vcount(id);
    var photos=[],videos=[],o=mown(id);
    for(var pi=0;pi<imgs.length;pi++)photos.push({k:'photo',id:id,src:imgs[pi],file:'p'+(pi<9?'0':'')+(pi+1)+'.jpg'});
    for(var vi=1;vi<=nClips;vi++)videos.push({k:'img',id:id,n:vi,vsrc:clipSrc(id,vi,false),poster:clipPoster(id,vi),file:(vi<10?'0':'')+vi+'.mp4'});
    if(!photos.length&&!videos.length)photos.push({k:'photo',id:id,src:imgs[0]||''});

    var ordered=[], pool=photos.concat(videos);
    var spec=(typeof MEDIA_ORDER!=='undefined')&&MEDIA_ORDER[o];
    if(spec&&spec.length){
      // Explicit order wins. Slot 1 here is what the feed card shows.
      spec.forEach(function(fn){
        for(var i=0;i<pool.length;i++){ if(pool[i]&&pool[i].file===fn){ ordered.push(pool[i]); pool[i]=null; break; } }
      });
      pool.forEach(function(m){ if(m)ordered.push(m); });   // anything not listed keeps its natural slot
    }else{
      // Default: interleave photo, clip, photo, clip ... so the strip never runs all-video.
      var a=0,b=0;
      while(a<photos.length||b<videos.length){
        if(a<photos.length)ordered.push(photos[a++]);
        if(b<videos.length)ordered.push(videos[b++]);
      }
    }
    for(var i=0;i<t.media.length;i++){var k=t.media[i].k;if(k!=='img'&&k!=='vid')ordered.push(t.media[i]);}
    return ordered;
  }
  function mediaItemsOf(t){ return orderedMedia(t,t.id); }
  function topicHTML(t,id,compact){
    var items=mediaItemsOf(t);
    var niche=t.kind==='niche';
    var cur=CUR[id]||{calls:10,hit:0.7,rallied:20,yf:0,col:"#D8C9A4"};
    var right=Math.round(cur.hit*cur.calls);
    var fList=trendFollowedCurators(t.id), follow=fList.length;
    var faces='';
    for(var fi=0;fi<Math.min(follow,3);fi++){faces+='<i style="'+avatarStyle(fList[fi],t.id)+'"></i>';}
    var hint='';
    var sentLabel=(t.up?'▲ ':'▼ ')+t.sent+'%';
    // No username on the feed — the trend stands on its own. Only the curator count remains.
    var social='<span class="nh-count"><b>'+t.fc+'</b> curators</span>'
        +(follow>0?'<span class="dotsep">·</span><span class="nh-follow"><span class="facepile">'+faces+'</span><b>'+follow+'</b> you follow</span>':'');
    var curator='<div class="curator">'+social+'</div>';
    var active=(carousel[id]&&carousel[id].i)||0;
    var media=compact?mediaHTML(t,items[active]||items[0]):items.map(function(m){return mediaHTML(t,m);}).join('');
    return '<div class="mtrack" data-track'+(compact?' data-feed-shell="1"':'')+'>'+media+'</div>'+
      '<div class="scrim-bot"></div>'+
      '<div class="fmeta" data-go role="button">'+
        '<div class="metarow"><span class="deg'+(t.up?'':' dn')+'">'+t.deg+'°</span><span class="sentmini '+(t.up?'up':'dn')+'">'+sentLabel+'</span></div>'+
        '<div class="trow"><div class="tname">'+t.name+'</div></div>'+
        curator+
        hint+
      '</div>';
  }

  // ===== Cosmos-style discovery grid: uniform 9:16 trend cards, two columns. =====
  // Browsing many trends at once (vs a full-screen TikTok feed) keeps curators visible — per Luca's note
  // that an endless scrolling video feed devalues curators. Cards preserve the placeholder 9:16 ratio.
  // Mixed card ratios [w,h] cycled by feed position — the varied heights are what make
  // the grid read as an editorial Cosmos board rather than rigid uniform columns.
  // All portrait/square so the 9:16 placeholder clips only crop lightly under object-fit:cover.
  var FEED_RATIOS=[[9,16],[4,5],[1,1],[3,4],[4,5],[9,16],[3,4],[1,1]];
  function ratioFor(i){return FEED_RATIOS[i%FEED_RATIOS.length];}
  // pick: undefined = normal feed card (data-go -> detail); boolean = collection-picker card
  // (data-nladd toggle + a minimalist +/check on the top-right, "added" state when true).
  function cardHTML(t,id,ar,asImage,pick){
    var cur=CUR[id]||{col:"#D8C9A4"};
    var hasVid=!!vcount(id);
    // Mix stills into the feed so it isn't wall-to-wall autoplaying video (softer, and fewer
    // mounted clips). Image cards use the trend's own first-frame poster or a supplied photo.
    // Slot 1 of the carousel IS the feed card. If MEDIA_ORDER puts a clip first, the card plays
    // that clip; if it puts a still first, the card shows that still.
    var slot1=orderedMedia(t,id)[0]||null;
    var lead1=slot1&&slot1.k==='img'&&slot1.n?slot1.n:1;          // which clip leads
    var leadIsClip=!!(slot1&&slot1.k==='img'&&slot1.vsrc);
    var showImg=asImage&&(hasVid||imgsOf(t).length);
    if(leadIsClip&&hasVid)showImg=false;                          // a clip-led trend leads with video
    var mediaAttr=(hasVid&&!showImg)?clipAttrs(id,lead1,false):'';
    var media;
    if(showImg){
      // Stills come straight from media/<id>/ — data.js bound them onto t.imgs, so the src is
      // already an exact local path. No extension walk, no 404 chain, no external fetch.
      var fb=(slot1&&slot1.k==='photo'&&slot1.src)||imgsOf(t)[0]||(hasVid?clipPoster(id,1):'');
      var first=fb;
      // If a file is ever removed from media/, hide the img and let the gradient show through.
      var onerr="this.onerror=null;this.style.display='none';";
      // The gradient always sits underneath, so a missing file degrades to colour, not black.
      media='<div class="gc-fallback" style="--c1:'+t.theme[0]+';--c3:'+t.theme[2]+'"></div>'
        +'<img class="gc-img img-fade" src="'+first+'" data-s="j" data-fb="'+fb+'" alt="" loading="lazy" onload="this.classList.add(\'in\')" onerror="'+onerr+'">';
    }else if(!hasVid){
      media='<div class="gc-fallback" style="--c1:'+t.theme[0]+';--c3:'+t.theme[2]+'"></div>';
    }else{
      // Clip-led card. applyMediaPoster() only runs on mountVid, so until the video is decoded the
      // card had nothing but its flat base colour (this is what left vibecoding / private credit
      // blank on the board). Paint the lead clip's poster underneath right away — the video simply
      // covers it once it mounts.
      var lp=clipPoster(id,lead1)||tileStill(id,0);
      media='<div class="gc-fallback" style="--c1:'+t.theme[0]+';--c3:'+t.theme[2]+'"></div>'
        +(lp?'<img class="gc-img img-fade in" src="'+lp+'" alt="" loading="lazy" onerror="this.onerror=null;this.style.display=\'none\';">':'');
    }
    var arStyle=ar?' style="aspect-ratio:'+ar[0]+'/'+ar[1]+'"':'';
    var isPick=pick!==undefined, added=!!pick;
    var attr=isPick?('data-nladd="'+id+'"'):('data-id="'+id+'" data-go');
    var plus=isPick?('<span class="gc-plus'+(added?' on':'')+'" aria-hidden="true">'+(added
      ?'<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 6"/></svg>'
      :'<svg viewBox="0 0 24 24"><path d="M12 6v12M6 12h12"/></svg>')+'</span>'):'';
    return '<article class="fcard'+(t.kind==='niche'?' niche':'')+(isPick?' fcard-pick':'')+(added?' added':'')+'" '+attr+' role="button" tabindex="0"'+arStyle+mediaAttr+'>'+
      media+
      '<div class="gc-scrim"></div>'+
      '<div class="gc-top"><span class="gc-deg'+(t.up?'':' dn')+'">'+t.deg+'°</span>'+plus+'</div>'+
      // No usernames on grid cards — the grid is media + name + degree only.
      '<div class="gc-info">'+
        '<div class="gc-name">'+t.name+'</div>'+
      '</div>'+
    '</article>';
  }
  var feedCols=2, feedZoomOut=false, feedFar=false;   // 2=Home, 3=overview, 4=far media-only spread
  // Feed zoom ladder (innermost -> outermost): 'single' full-screen trend feed -> 'board' 2-col
  // masonry -> galaxy (GX overlay). Home opens in 'single'.
  var feedMode='single';
  // Full media carousels are hydrated only near the viewport. Far-away trends keep one lightweight
  // poster/still shell, preserving scroll geometry without parsing and retaining every slide.
  var topicHydrator=new IntersectionObserver(function(entries){entries.forEach(function(e){
    if(e.isIntersecting)hydrateFeedTopic(e.target);else collapseFeedTopic(e.target);
  });},{root:feed,rootMargin:'110% 0px',threshold:0});
  function hydrateFeedTopic(el){
    if(!el||!el.isConnected||!feed.contains(el)||el.getAttribute('data-hydrated')==='1')return;
    var id=el.getAttribute('data-id'),t=T[id],track=el.querySelector('[data-track]');if(!t||!track)return;
    track.innerHTML=mediaItemsOf(t).map(function(m){return mediaHTML(t,m);}).join('');
    track.removeAttribute('data-feed-shell');el.setAttribute('data-hydrated','1');
    wireCarousel(el,id);observeVids(el);refreshActiveMedia(el);
  }
  function collapseFeedTopic(el){
    if(!el||!el.isConnected||!feed.contains(el)||el.getAttribute('data-hydrated')!=='1')return;
    var id=el.getAttribute('data-id'),t=T[id],track=el.querySelector('[data-track]'),c=carousel[id];if(!t||!track||!c)return;
    releaseMediaIn(el);
    var items=mediaItemsOf(t),m=items[c.i]||items[0];
    track.innerHTML=mediaHTML(t,m);track.setAttribute('data-feed-shell','1');el.setAttribute('data-hydrated','0');
    renderCubePosition(el,id,0,true);
  }
  // Innermost state: the full-screen, one-trend-per-screen immersive feed (swipe up/down between
  // trends, left/right through a trend's media via the cube carousel). Reuses topicHTML + wireCarousel.
  function renderFeedSingle(kind,restoreId){
    feedKind=kind;
    topicHydrator.disconnect();
    releaseMediaIn(feed);
    var ids=(ORDERS[kind]||order), html='';
    ids.forEach(function(id){
      var t=T[id]; if(!t)return;
      var items=mediaItemsOf(t);
      carousel[id]={i:(leadSlide[id]||0), n:Math.max(1,items.length)};
      html+='<div class="topic" data-id="'+id+'" data-hydrated="0">'+topicHTML(t,id,true)+'</div>';
    });
    feed.classList.add('single');
    feed.classList.remove('zoomout','zoomfar');
    feed.innerHTML=html;
    setBal();
    var activeTopic=null;
    if(restoreId){
      var tg=feed.querySelector('.topic[data-id="'+restoreId+'"]');
      if(tg){feed.scrollTop=tg.offsetTop;currentId=restoreId;activeTopic=tg;} else feed.scrollTop=0;
    }else feed.scrollTop=0;
    if(!activeTopic)activeTopic=feed.querySelector('.topic');
    hydrateFeedTopic(activeTopic);
    feed.querySelectorAll('.topic').forEach(function(el){topicHydrator.observe(el);});
  }
  function renderFeed(kind,restoreId){
    if(feedMode==='single'){ return renderFeedSingle(kind,restoreId); }
    topicHydrator.disconnect();
    feed.classList.remove('single');
    feedKind=kind;
    releaseMediaIn(feed);
    // N-column masonry: walk ids in degree order, drop each into the shortest column so the
    // highest-degree cards land top-left→right and columns stagger cleanly. feedCols controls
    // the zoom level (2 = normal Home, 5 = the pulled-back overview spread).
    var n=feedCols||2, colHtml=[], colH=[];
    for(var k=0;k<n;k++){colHtml.push('');colH.push(0);}
    (ORDERS[kind]||order).forEach(function(id,i){
      var ar=ratioFor(i),c=0;
      for(var j=1;j<n;j++){if(colH[j]<colH[c])c=j;}
      // Roughly 4-in-7 cards render as stills (indices 0,2,3,5,… of every 5), the rest play video.
      var asImage=([0,2,3].indexOf(i%5)>=0);
      colHtml[c]+=cardHTML(T[id],id,ar,asImage);
      colH[c]+=ar[1]/ar[0];
    });
    feed.innerHTML=colHtml.map(function(h){return '<div class="feedcol">'+h+'</div>';}).join('');
    feed.classList.toggle('zoomout',feedZoomOut);
    feed.classList.toggle('zoomfar',feedFar);
    observeVids(feed);
    setBal();
    if(restoreId){
      var target=feed.querySelector('.fcard[data-id="'+restoreId+'"]');
      if(target){feed.scrollTop=Math.max(0,target.offsetTop-140);currentId=restoreId;}
      else feed.scrollTop=0;
    }else feed.scrollTop=0;
    refreshActiveMedia(feed);
  }
  // Shrink each feed title so it always fits on one line beside the degree/percentage.
  function fitTitles(){
    feed.querySelectorAll('.fmeta .tname').forEach(function(el){
      el.style.fontSize='';
      var avail=el.clientWidth; if(!avail) return;
      var need=el.scrollWidth, max=32, min=18;
      if(need>avail){
        var size=Math.max(min,Math.floor(max*avail/need));
        el.style.fontSize=size+'px';
        var guard=0;
        while(size>min && el.scrollWidth>el.clientWidth && guard++<24){size-=1;el.style.fontSize=size+'px';}
      }
    });
  }
  var fitT; window.addEventListener('resize',function(){clearTimeout(fitT);fitT=setTimeout(fitTitles,120);});

  function slideDelta(k,pos,n){
    var d=k-pos;
    if(n>1){if(d>n/2)d-=n;if(d<-n/2)d+=n;}
    return d;
  }
  function renderCubePosition(el,id,pos,instant){
    var c=carousel[id],track=el.querySelector('[data-track]');if(!c||!track)return;
    var slides=track.querySelectorAll('.media'),reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var wasDragging=track.classList.contains('dragging');
    if(instant&&!wasDragging)track.classList.add('dragging');
    slides.forEach(function(sl,k){
      var d=slideDelta(k,pos,c.n),ad=Math.abs(d),vis=ad<=1.04;
      sl.setAttribute('data-slide-visible',vis?'1':'0');
      // During a cube turn both participating faces need their poster/video ready. At rest the
      // adjacent faces sit at exactly 1 and remain unmounted, so this still keeps only one live
      // slide until a horizontal gesture actually begins.
      sl.setAttribute('data-slide-mount',ad<1?'1':'0');
      sl.style.visibility=vis?'visible':'hidden';
      sl.style.pointerEvents=ad<.08?'auto':'none';
      sl.style.zIndex=String(1000-Math.round(ad*100));
      if(reduced){
        sl.style.opacity=ad<.5?'1':'0';
        sl.style.transform='translate3d(0,0,0)';
        return;
      }
      // Translate each full-width face by the same proportion it rotates. For adjacent faces,
      // 100% + outgoing x always equals incoming x, so their inner pivots are one shared seam.
      var x=Math.max(-100,Math.min(100,d*100));
      var angle=Math.max(-90,Math.min(90,d*90));
      sl.style.transformOrigin=d<0?'right center':(d>0?'left center':'center center');
      sl.style.opacity=vis&&ad<1?'1':'0';
      sl.style.transform=vis
        ? 'translate3d('+x+'%,0,0) rotateY('+angle+'deg)'
        : 'translate3d('+(d>0?100:-100)+'%,0,0) rotateY('+(d>0?90:-90)+'deg)';
    });
    if(instant&&!wasDragging){void track.offsetWidth;track.classList.remove('dragging');}
  }
  function setSlide(el,id,i,instant){
    var c=carousel[id];if(!c)return;
    c.i=((i%c.n)+c.n)%c.n;
    renderCubePosition(el,id,c.i,instant);
    refreshActiveMedia(el);
  }
  function wireCarousel(el,id){
    var track=el.querySelector('[data-track]'),c=carousel[id],x0=0,y0=0,t0=0,axis='',pid=null,start=0;
    if(!track||!c)return;
    renderCubePosition(el,id,c.i,true);
    if(track._carouselBound)return;
    track._carouselBound=1;
    if(c.n<2){
      track.addEventListener('pointerdown',function(e){
        if(e.button!=null&&e.button!==0)return;
        x0=e.clientX;y0=e.clientY;t0=Date.now();pid=e.pointerId;
      });
      track.addEventListener('pointerup',function(e){
        if(pid!==e.pointerId)return;
        var dx=e.clientX-x0,dy=e.clientY-y0,dt=Math.max(1,Date.now()-t0);
        if(Math.abs(dx)<8&&Math.abs(dy)<8&&dt<350)openDetail(id);
        pid=null;
      });
      track.addEventListener('pointercancel',function(e){if(pid===e.pointerId)pid=null;});
      return;
    }
    track.addEventListener('pointerdown',function(e){
      if(e.button!=null&&e.button!==0)return;
      x0=e.clientX;y0=e.clientY;t0=Date.now();axis='';pid=e.pointerId;start=c.i;
    });
    track.addEventListener('pointermove',function(e){
      if(pid!==e.pointerId)return;
      var dx=e.clientX-x0,dy=e.clientY-y0,adx=Math.abs(dx),ady=Math.abs(dy);
      if(!axis&&(adx>8||ady>8))axis=adx>ady*1.15?'x':'y';
      if(axis!=='x')return;
      if(track.setPointerCapture){try{track.setPointerCapture(pid);}catch(err){}}
      e.preventDefault();
      track.classList.add('dragging');
      var w=Math.max(1,track.clientWidth),delta=Math.max(-1,Math.min(1,-dx/w));
      renderCubePosition(el,id,start+delta,true);
      refreshActiveMedia(el);
    });
    function end(e){
      if(pid!==e.pointerId)return;
      var dx=e.clientX-x0,dy=e.clientY-y0,dt=Math.max(1,Date.now()-t0),adx=Math.abs(dx);
      track.classList.remove('dragging');
      if(axis==='x'){
        var quick=adx/dt>.45,far=adx>track.clientWidth*.18;
        setSlide(el,id,start+(far||quick?(dx<0?1:-1):0));
      }else if(adx<8&&Math.abs(dy)<8&&dt<350){openDetail(id);}
      if(track.releasePointerCapture){try{track.releasePointerCapture(pid);}catch(err){}}
      pid=null;axis='';
    }
    track.addEventListener('pointerup',end);
    track.addEventListener('pointercancel',function(e){
      if(pid!==e.pointerId)return;
      track.classList.remove('dragging');
      setSlide(el,id,start,true);
      pid=null;axis='';
    });
  }

  function setBal(){var b=document.querySelectorAll('[data-bal]');for(var i=0;i<b.length;i++)b[i].textContent=fmt(balance);
    var fb=document.getElementById('fc-bal');if(fb)fb.textContent=fmt(balance);}

  // Horizontal media/card rows use a custom pointer-driven rail instead of native overflow.
  // That keeps swipe and click-drag gestures while preventing mobile browsers from painting a
  // horizontal scroll indicator over the app-like UI.
  function dragRailMax(el){return Math.max(0,el.scrollWidth-el.clientWidth);}
  function dragRailClamp(el,x){return Math.max(0,Math.min(dragRailMax(el),x));}
  function dragRailSnap(el,projected){
    var cards=Array.prototype.slice.call(el.children),pad=parseFloat(getComputedStyle(el).paddingLeft)||0;
    if(!cards.length)return dragRailClamp(el,projected);
    var railBox=el.getBoundingClientRect(),target=0,best=Infinity;
    cards.forEach(function(card){
      var x=dragRailClamp(el,el.scrollLeft+card.getBoundingClientRect().left-railBox.left-pad),d=Math.abs(x-projected);
      if(d<best){best=d;target=x;}
    });
    return target;
  }
  function animateDragRail(el,target){
    cancelAnimationFrame(el._dragRailFrame);
    target=dragRailClamp(el,target);
    var start=el.scrollLeft,delta=target-start;
    if(Math.abs(delta)<1||prefersReducedMotion()){
      el.scrollLeft=target;return;
    }
    var t0=performance.now(),duration=Math.min(420,Math.max(180,Math.abs(delta)*1.15));
    function tick(now){
      var p=Math.min(1,(now-t0)/duration),ease=1-Math.pow(1-p,3);
      el.scrollLeft=start+delta*ease;
      if(p<1)el._dragRailFrame=requestAnimationFrame(tick);
    }
    el._dragRailFrame=requestAnimationFrame(tick);
  }
  function resetDragRail(el){
    if(!el)return;
    cancelAnimationFrame(el._dragRailFrame);
    el.classList.remove('dragging');
    el.scrollLeft=0;
  }
  function wireDragRail(el){
    if(!el||el._dragRailWired)return;
    el._dragRailWired=true;
    var pid=null,x0=0,y0=0,start=0,lastX=0,lastT=0,vx=0,axis='',moved=false;
    el.addEventListener('dragstart',function(e){e.preventDefault();});
    el.addEventListener('pointerdown',function(e){
      if(e.button!=null&&e.button!==0)return;
      cancelAnimationFrame(el._dragRailFrame);
      el._dragRailSuppress=false;
      pid=e.pointerId;x0=lastX=e.clientX;y0=e.clientY;start=el.scrollLeft;lastT=performance.now();vx=0;axis='';moved=false;
    });
    el.addEventListener('pointermove',function(e){
      if(pid!==e.pointerId)return;
      var dx=e.clientX-x0,dy=e.clientY-y0,adx=Math.abs(dx),ady=Math.abs(dy);
      if(!axis&&(adx>7||ady>7))axis=adx>ady*1.15?'x':'y';
      if(axis!=='x')return;
      if(el.setPointerCapture){try{el.setPointerCapture(pid);}catch(err){}}
      e.preventDefault();
      moved=moved||adx>7;
      el.classList.add('dragging');
      el.scrollLeft=dragRailClamp(el,start-dx);
      var now=performance.now(),dt=Math.max(1,now-lastT),step=(lastX-e.clientX)/dt;
      vx=vx*.55+step*.45;lastX=e.clientX;lastT=now;
    });
    function end(e,cancelled){
      if(pid!==e.pointerId)return;
      el.classList.remove('dragging');
      if(axis==='x'){
        var fling=Math.max(-2.2,Math.min(2.2,vx))*180;
        var projected=cancelled?el.scrollLeft:el.scrollLeft+fling;
        animateDragRail(el,dragRailSnap(el,projected));
        if(moved){
          el._dragRailSuppress=true;
        }
      }
      if(el.releasePointerCapture){try{el.releasePointerCapture(pid);}catch(err){}}
      pid=null;axis='';moved=false;
    }
    el.addEventListener('pointerup',function(e){end(e,false);});
    el.addEventListener('pointercancel',function(e){end(e,true);});
    el.addEventListener('click',function(e){
      if(!el._dragRailSuppress)return;
      el._dragRailSuppress=false;
      e.preventDefault();e.stopImmediatePropagation();
    },true);
  }

  var screens={feed:'s-feed',explore:'s-explore',detail:'s-detail',forecasts:'s-forecasts',taste:'s-taste',profile:'s-profile',settings:'s-settings',collection:'s-collection',timeline:'s-timeline',posts:'s-posts',saved:'s-saved',stub:'s-stub',userlist:'s-userlist',postdetail:'s-postdetail',notif:'s-notif',editprofile:'s-editprofile',security:'s-security',help:'s-help',invite:'s-invite',article:'s-article',signaldetail:'s-signaldetail',chart:'s-chart',newlist:'s-newlist',createtrend:'s-createtrend',review:'s-review',trendposts:'s-trendposts',pending:'s-pending'};
  function currentScreenKey(){var k='feed';Object.keys(screens).forEach(function(key){if(document.getElementById(screens[key]).classList.contains('active'))k=key;});return k;}
  var phoneShell=document.getElementById('phone');
  function lockPhoneShellScroll(){if(!phoneShell)return;if(phoneShell.scrollTop)phoneShell.scrollTop=0;if(phoneShell.scrollLeft)phoneShell.scrollLeft=0;}
  if(phoneShell)phoneShell.addEventListener('scroll',lockPhoneShellScroll,{passive:true});
  function cleanupInactiveMedia(activeTab){
    Object.keys(screens).forEach(function(k){if(k!==activeTab)releaseMediaIn(document.getElementById(screens[k]));});
  }
  function activateScreenMedia(tab){var sid=screens[tab],el=sid&&document.getElementById(sid);if(el)refreshActiveMedia(el);}
  var navStack=[];
  var ROOTS=['feed','explore','posts','taste'];
  // ===== Yeezy-style zoom: opening a trend zooms the detail screen out from the tapped card. =====
  var zoomOrigin=null;
  function prefersReducedMotion(){
    if(document.body.classList.contains('reduce-motion'))return true;
    return window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  }
  function setZoomFrom(el){
    var host=document.querySelector('.screen-host');
    if(!host||!el||prefersReducedMotion()){zoomOrigin=null;return;}
    var hr=host.getBoundingClientRect(),r=el.getBoundingClientRect();
    if(!r.width||!r.height){zoomOrigin=null;return;}
    var cx=r.left+r.width/2-hr.left,cy=r.top+r.height/2-hr.top;
    zoomOrigin={x:Math.max(0,Math.min(100,cx/hr.width*100)),y:Math.max(0,Math.min(100,cy/hr.height*100))};
  }
  function playZoomIn(){
    if(!zoomOrigin)return; var o=zoomOrigin; zoomOrigin=null;
    var scr=document.getElementById('s-detail'); if(!scr||!scr.animate)return;
    scr.style.transformOrigin=o.x+'% '+o.y+'%';
    scr.classList.add('zooming');
    var an=scr.animate([{transform:'scale(.30)',opacity:0},{transform:'scale(1)',opacity:1}],
      {duration:480,easing:'cubic-bezier(.2,.72,.14,1)'});
    an.onfinish=an.oncancel=function(){scr.classList.remove('zooming');scr.style.transformOrigin='';};
  }
  // ===== Feed zoom: press N to pull the Home masonry back into a ~5-column overview spread. =====
  // We re-lay the real feed into more/fewer columns and ride a scale transition on top, so it
  // reads as one continuous yeezy-style zoom rather than a separate screen. Tapping any card
  // while zoomed out zooms straight into that trend.
  // ===== Two-state zoom: Home (2-col feed) <-> an infinite, virtualized "galaxy" canvas. =====
  // The galaxy is a deterministic infinite masonry: each (col,k) cell has a stable height, and
  // tiles are created only when they enter the buffered viewport and recycled when they leave, so
  // it never ends and never shows blank space. Trend + media are cached per cell, chosen so the
  // same trend is never visible twice at once, with a different clip/photo on each repeat.
  var GX={open:false,panX:0,panY:0,W:0,H:0,colW:98,gap:8,margin:110,
          tiles:{},colTop:{},cache:{},raf:0,vx:0,vy:0,drag:null,inited:false};
  var zAccum=0, feedPanSuppress=false, _prevMaxVids=null;
  var gxLayer=document.getElementById('gx-layer'), galaxyEl=document.getElementById('galaxy');
  // draw from every real trend (not the current feed subset) so the on-screen set can stay unique
  function gxPool(){ return Object.keys(T).filter(function(id){return T[id]&&!/^coll:/.test(id)&&T[id].kind!=='coll';}); }
  function gxRand(seed){ var s=seed>>>0; return function(){ s=s+0x6D2B79F5|0; var t=Math.imul(s^s>>>15,1|s); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
  function gxSeed(col,k){ return ((col*73856093)^(k*19349663))>>>0; }
  function gxRatio(col,k){ var r=gxRand(gxSeed(col,k)^0x9e3779b9)(); return FEED_RATIOS[Math.floor(r*FEED_RATIOS.length)]; }
  function gxTileH(col,k){ var ar=gxRatio(col,k); return Math.round(GX.colW*ar[1]/ar[0]); }
  function gxColX(col){ return col*(GX.colW+GX.gap); }
  function gxTop(col,k){ var c=GX.colTop[col]||(GX.colTop[col]={0:0,hi:0,lo:0});
    while(c.hi<k){ c[c.hi+1]=c[c.hi]+gxTileH(col,c.hi)+GX.gap; c.hi++; }
    while(c.lo>k){ c[c.lo-1]=c[c.lo]-(gxTileH(col,c.lo-1)+GX.gap); c.lo--; }
    return c[k]; }
  // trends whose tiles currently intersect the on-screen viewport (not the buffer)
  function gxOnScreenTrends(){ var set=[]; for(var key in GX.tiles){ var tl=GX.tiles[key];
    var x=gxColX(tl.col)+GX.panX, y=gxTop(tl.col,tl.k)+GX.panY, h=gxTileH(tl.col,tl.k);
    if(x< GX.W && x+GX.colW>0 && y< GX.H && y+h>0){ if(set.indexOf(tl.id)<0)set.push(tl.id); } }
    return set; }
  function gxAssign(col,k){ var key=col+'|'+k; if(GX.cache[key])return GX.cache[key];
    var pool=gxPool(), used=gxOnScreenTrends(), cand=pool.filter(function(id){return used.indexOf(id)<0;});
    if(!cand.length)cand=pool;
    var rnd=gxRand(gxSeed(col,k)); var id=cand[Math.floor(rnd()*cand.length)];
    GX.cache[key]={id:id,v:Math.floor(rnd()*997)}; return GX.cache[key]; }
  function gxTileHTML(col,k,a){
    var t=T[a.id]; var hv=vcount(a.id);
    var grad='linear-gradient(150deg,'+t.theme[0]+','+(t.theme[2]||t.theme[1])+')';
    var base='<span class="gx-base" style="background-image:'+grad+'"></span>';   // colourful floor so a tile is never empty
    var media='', ims=imgsOf(t);
    var oe="this.remove();this.closest('.gx-tile').classList.add('loaded')";
    var onl="this.closest('.gx-tile').classList.add('loaded')";
    // The galaxy caps how many clips can decode at once (MAXVIDS), so most tiles never mount a
    // <video> — the poster IS the tile. If that clip's poster was deleted, fall back to one of the
    // trend's stills rather than leaving a bare gradient. Resolution: clip -> poster -> still.
    if(hv){
      var n=(a.v%hv)+1;
      media='<span class="gx-media gx-vid"'+clipAttrs(a.id,n,true)+'></span>';
      if(!hasPoster(a.id,n)&&ims.length){
        var s2=ims[a.v%ims.length];
        media='<img class="gx-media" loading="lazy" src="'+s2+'" alt="" onerror="'+oe+'" onload="'+onl+'">'+media;
      }
    }
    else if(ims.length){
      var src=ims[a.v%ims.length];
      media='<img class="gx-media" loading="lazy" src="'+src+'" alt="" onerror="'+oe+'" onload="'+onl+'">';
    }
    return base+media+'<span class="gx-ph"></span>';   // gray-blur placeholder on top until media loads
  }
  function gxSetContent(el,col,k,a){
    el.classList.remove('loaded'); el.setAttribute('data-go-trend',a.id);
    el.innerHTML=gxTileHTML(col,k,a);
    var vm=el.querySelector('[data-vsrc]');
    if(vm){
      applyMediaPoster(vm);vmount.observe(vm);
      el.classList.add('loaded');
    }
    else if(!el.querySelector('img.gx-media')){ el.classList.add('loaded'); }  // no media: show the gradient floor
  }
  function gxMakeTile(col,k){
    var a=gxAssign(col,k), h=gxTileH(col,k);
    var el=document.createElement('button');
    el.className='gx-tile'; el.setAttribute('data-gx','1');
    el.style.left=gxColX(col)+'px'; el.style.top=gxTop(col,k)+'px'; el.style.width=GX.colW+'px'; el.style.height=h+'px';
    gxSetContent(el,col,k,a);
    gxLayer.appendChild(el);
    return {el:el,col:col,k:k,id:a.id};
  }
  function gxViewTiles(){ var arr=[]; for(var key in GX.tiles){ var tl=GX.tiles[key];
    var x=gxColX(tl.col)+GX.panX, y=gxTop(tl.col,tl.k)+GX.panY, h=gxTileH(tl.col,tl.k);
    if(x<GX.W&&x+GX.colW>0&&y<GX.H&&y+h>0)arr.push(tl); } return arr; }
  // hard guarantee: after any reconcile, no trend appears twice within the viewport
  function gxEnforceUnique(){
    var pool=gxPool(), vt=gxViewTiles(), seen={};
    vt.forEach(function(tl){
      if(seen[tl.id]){
        var used=vt.map(function(x){return x.id;});
        var cand=pool.filter(function(id){return used.indexOf(id)<0;});
        if(cand.length){ var key=tl.col+'|'+tl.k, rnd=gxRand(gxSeed(tl.col,tl.k)^0x5bd1e995);
          var nid=cand[Math.floor(rnd()*cand.length)];
          GX.cache[key]={id:nid,v:Math.floor(rnd()*997)};
          var vm=tl.el.querySelector('[data-vsrc]'); if(vm){unmountVid(vm);vmount.unobserve(vm);}
          tl.id=nid; gxSetContent(tl.el,tl.col,tl.k,GX.cache[key]); }
      }
      seen[tl.id]=1;
    });
  }
  function gxReconcile(){
    if(!GX.open)return;
    var CW=GX.colW+GX.gap, M=GX.margin;
    var colFrom=Math.floor((-GX.panX-M)/CW), colTo=Math.ceil((-GX.panX+GX.W+M)/CW);
    var need={};
    for(var col=colFrom;col<=colTo;col++){
      var yLo=-GX.panY-M, yHi=-GX.panY+GX.H+M, k=0, guard=0;
      while(gxTop(col,k)+gxTileH(col,k)<yLo && guard++<400)k++;
      while(gxTop(col,k)>yLo && guard++<800)k--;
      for(; gxTop(col,k)<=yHi && guard++<1200; k++){ var key=col+'|'+k; need[key]=1;
        if(!GX.tiles[key])GX.tiles[key]=gxMakeTile(col,k); }
    }
    for(var ek in GX.tiles){ if(!need[ek]){ var tl=GX.tiles[ek];
      var vm=tl.el.querySelector('[data-vsrc]'); if(vm){unmountVid(vm);vmount.unobserve(vm);}
      tl.el.remove(); delete GX.tiles[ek]; } }
    gxEnforceUnique();
  }
  function gxApply(){ gxLayer.style.transform='translate3d('+GX.panX+'px,'+GX.panY+'px,0)'; }
  function gxPanBy(dx,dy){ GX.panX+=dx; GX.panY+=dy; gxApply(); gxReconcile(); }
  function gxMomentum(){ cancelAnimationFrame(GX.raf);
    function step(){ if(!GX.open){return;} GX.vx*=0.94; GX.vy*=0.94;
      if(Math.abs(GX.vx)<0.15&&Math.abs(GX.vy)<0.15){return;} gxPanBy(GX.vx,GX.vy); GX.raf=requestAnimationFrame(step); }
    GX.raf=requestAnimationFrame(step); }
  function gxOpen(){ if(GX.open)return; GX.open=true; feedPanSuppress=false;
    GX.W=feed.clientWidth||galaxyEl.clientWidth||390; GX.H=feed.clientHeight||galaxyEl.clientHeight||780;
    GX.margin=GX.W<=600?110:240;
    if(!GX.inited){ GX.panX=Math.round((GX.W-GX.colW)/2 - (GX.colW+GX.gap)); GX.panY=Math.round(GX.H*0.12); GX.inited=true; }
    // let every visible clip play while browsing the board (bounded for safety on phone)
    if(_prevMaxVids===null){_prevMaxVids=MAXVIDS; MAXVIDS=GX.W<=600?6:12;}
    gxApply(); gxReconcile();
    // Reconciliation appends the tiles in their quiet starting state. Flush once so the opacity
    // and scale transition begins from a painted frame rather than skipping straight to the end.
    void galaxyEl.offsetWidth;
    galaxyEl.classList.add('on'); galaxyEl.setAttribute('aria-hidden','false');
    document.getElementById('s-feed').classList.add('gx-on');
  }
  function gxClose(immediate){ if(!GX.open)return; GX.open=false; cancelAnimationFrame(GX.raf); GX.vx=GX.vy=0;
    galaxyEl.classList.remove('on'); galaxyEl.setAttribute('aria-hidden','true');
    document.getElementById('s-feed').classList.remove('gx-on');
    if(_prevMaxVids!==null){MAXVIDS=_prevMaxVids;_prevMaxVids=null;}
    var teardown=function(){ for(var k in GX.tiles){ var vm=GX.tiles[k].el.querySelector('[data-vsrc]'); if(vm){unmountVid(vm);vmount.unobserve(vm);} GX.tiles[k].el.remove(); } GX.tiles={}; };
    if(immediate)teardown(); else setTimeout(function(){ if(!GX.open)teardown(); },520);
  }
  var ZOOM_EASE='cubic-bezier(.32,.72,0,1)',ZOOM_DURATION=440;
  var zoomTransitioning=false,zoomTransitionTimer=0;
  function setZoomBusy(on){
    zoomTransitioning=on;
    var host=document.getElementById('s-feed'),menu=document.getElementById('feed-menu');
    host.classList.toggle('feed-zooming',on);
    if(on)menu.setAttribute('aria-busy','true');else menu.removeAttribute('aria-busy');
  }
  function finishZoomTransition(){
    clearTimeout(zoomTransitionTimer);setZoomBusy(false);kickVideos();
  }
  function visibleFeedTopic(){
    var topics=feed.querySelectorAll('.topic');if(!topics.length)return null;
    var i=Math.max(0,Math.min(topics.length-1,Math.round(feed.scrollTop/Math.max(1,feed.clientHeight))));
    return topics[i];
  }
  // Preserve the current full-screen card as a lightweight visual bridge while the board is built
  // underneath it. The outgoing card and incoming board move as one spatial zoom, with no blank frame.
  function zoomSingleToBoard(){
    var topic=visibleFeedTopic(),host=document.getElementById('s-feed'),ghost=null;
    if(topic)currentId=topic.getAttribute('data-id')||currentId;
    if(prefersReducedMotion()||!feed.animate){feedMode='board';renderFeed(feedKind,currentId);kickVideos();return;}
    setZoomBusy(true);
    if(topic){
      var clone=topic.cloneNode(true),active=clone.querySelector('.media[data-slide-visible="1"]')||clone.querySelector('.media');
      clone.querySelectorAll('video').forEach(function(v){v.remove();});
      clone.querySelectorAll('.media').forEach(function(m){
        if(m===active){
          m.style.transform='none';m.style.transformOrigin='center';m.style.opacity='1';m.style.visibility='visible';
        }else m.remove();
      });
      clone.querySelectorAll('[id]').forEach(function(el){el.removeAttribute('id');});
      ghost=document.createElement('div');ghost.className='feed-transition-ghost';ghost.appendChild(clone);host.appendChild(ghost);
    }
    requestAnimationFrame(function(){
      feedMode='board';renderFeed(feedKind,currentId);
      var incoming=feed.animate([{transform:'scale(1.055)',opacity:.12},{transform:'scale(1)',opacity:1}],{duration:ZOOM_DURATION,easing:ZOOM_EASE,fill:'both'});
      incoming.onfinish=function(){incoming.cancel();};
      if(ghost){
        var out=ghost.animate([{transform:'scale(1)',opacity:1},{transform:'scale(.9)',opacity:0}],{duration:ZOOM_DURATION,easing:ZOOM_EASE,fill:'forwards'});
        out.onfinish=out.oncancel=function(){if(ghost&&ghost.parentNode)ghost.remove();};
      }
      zoomTransitionTimer=setTimeout(finishZoomTransition,ZOOM_DURATION+40);
    });
  }
  function openGalaxySmooth(){
    if(prefersReducedMotion()){gxOpen();kickVideos();return;}
    setZoomBusy(true);
    requestAnimationFrame(function(){gxOpen();zoomTransitionTimer=setTimeout(finishZoomTransition,500);});
  }
  function closeGalaxySmooth(level){
    if(prefersReducedMotion()){
      if(level===0){feedMode='single';renderFeed(feedKind,currentId);}
      gxClose(true);kickVideos();return;
    }
    setZoomBusy(true);
    requestAnimationFrame(function(){
      if(level===0){feedMode='single';renderFeed(feedKind,currentId);}
      requestAnimationFrame(function(){gxClose(false);zoomTransitionTimer=setTimeout(finishZoomTransition,540);});
    });
  }
  function swapFeedModeSmooth(mode){
    if(prefersReducedMotion()||!feed.animate){feedMode=mode;renderFeed(feedKind,currentId);kickVideos();return;}
    setZoomBusy(true);
    var out=feed.animate([{transform:'scale(1)',opacity:1},{transform:'scale(1.025)',opacity:.18}],
      {duration:140,easing:'cubic-bezier(.4,0,1,1)',fill:'forwards'});
    out.onfinish=function(){
      out.cancel();feedMode=mode;renderFeed(feedKind,currentId);
      feed.animate([{transform:'scale(.965)',opacity:.18},{transform:'scale(1)',opacity:1}],
        {duration:300,easing:ZOOM_EASE});
      zoomTransitionTimer=setTimeout(finishZoomTransition,320);
    };
  }
  // Zoom ladder: 0 = single (immersive) -> 1 = board (2-col masonry) -> 2 = galaxy (GX overlay).
  function currentZoom(){ return GX.open?2:(feedMode==='single'?0:1); }
  function setZoom(level){
    level=Math.max(0,Math.min(2,level));
    if(zoomTransitioning)return;
    if(level===currentZoom())return;
    if(level===2){ if(feedMode!=='board'){feedMode='board';renderFeed(feedKind);} openGalaxySmooth(); return; }
    if(GX.open){closeGalaxySmooth(level);return;}
    var mode=(level===0)?'single':'board';
    if(feedMode===mode)return;
    if(feedMode==='single'&&mode==='board')zoomSingleToBoard();else swapFeedModeSmooth(mode);
  }
  // dz>0 => zoom OUT (one step toward the galaxy); dz<0 => zoom IN (one step toward the single feed).
  function nudgeZoom(dz){
    if(dz>0){ zAccum+=dz; if(zAccum>0.26){zAccum=0;setZoom(currentZoom()+1);} }
    else if(dz<0){ zAccum+=dz; if(zAccum<-0.26){zAccum=0;setZoom(currentZoom()-1);} }
    else { zAccum=0; }
  }
  function scheduleSettle(){ zAccum=0; }
  // The logo steps one level out; from the galaxy it wraps back to the single feed.
  function toggleFeedZoom(){ var l=currentZoom(); setZoom(l>=2?0:l+1); }
  function resetFeedZoom(){ setZoom(0); }
  // No-op: the old "hold to scrub" (Pro-mode) interaction was removed, but show() still calls
  // endHold() as cleanup. Without this definition every non-feed navigation threw a ReferenceError
  // mid-show(), skipping the list renders (Search/Posts appeared empty until you typed).
  function endHold(){}
  function show(tab,isBack){
    var cur=currentScreenKey();
    if(!isBack){ if(ROOTS.indexOf(tab)>=0){navStack=[];} else if(cur!==tab){navStack.push(cur);} }
    Object.keys(screens).forEach(function(k){document.getElementById(screens[k]).classList.toggle('active',k===tab);});
    lockPhoneShellScroll();
    var SUBS=['detail','profile','settings','collection','timeline','saved','stub','userlist','postdetail','notif','editprofile','security','help','invite','article','signaldetail','forecasts','chart','newlist','createtrend','review','trendposts','pending'];
    var sub=SUBS.indexOf(tab)>=0;
    // Your own profile is a primary tab (highlight it); other users' profiles stay a sub-screen.
    var navKey=sub?((tab==='profile'&&currentProfile==='@you')?'profile':null):tab;
    document.querySelector('.tabbar').style.display=(sub&&tab!=='profile')?'none':'';
    document.querySelectorAll('.tabbar button').forEach(function(b){b.setAttribute('aria-current',b.getAttribute('data-tab')===navKey?'true':'false');});
    if(navKey)moveInd();
    if(tab!=='detail')stopLiveTL();
    if(tab!=='feed')endHold();
    cleanupInactiveMedia(tab);
    if(tab==='forecasts')renderForecasts();
    if(tab==='taste')renderTaste();
    if(tab==='explore')renderExplore();
    if(tab==='posts')renderPosts();
    if(tab==='trendposts')renderTrendPostFeed();
    if(tab==='pending')renderPending();
    activateScreenMedia(tab);
    if(tab==='detail'&&!isBack)playZoomIn(); else zoomOrigin=null;
    // Tapping Home always lands back in the single-trend feed (never stuck zoomed out); returning
    // via back keeps the level you left, only dismissing the galaxy overlay if it was open.
    if(tab==='feed'){
      if(!isBack){ if(currentZoom()!==0)setZoom(0); }
      else if(GX.open){gxClose(true);}
    }
  }
  function goBack(){var prev=navStack.length?navStack.pop():'feed';show(prev,true);}

  // ===== Search / Markets =====
  // Watchlist (favourites) + market helpers
  var favs={};   // degree alerts removed
  // seed a handful of saved trends so the profile Favorites collection is meaningful in the demo
  ['humanoidrobots','claude','agi','gtavi','runclubs','coinbase','pokemon','starwars'].forEach(function(id){favs[id]=true;});
  // search filter state + option data
  var exFilters={when:'today',sort:'trending',country:'us',city:'all'};
  var WHEN_OPTS=[['today','Today','Trends moving in the last 24 hours'],['week','This week','Activity from the past 7 days'],['month','This month','Activity from the past 30 days'],['all','All time','Every trend on record']];
  var SORT_OPTS=[['trending','Trending','Hottest right now'],['latest','Latest','Biggest recent moves'],['newest','Newest','Most recently added'],['oldest','Oldest','Longest-running trends']];
  // top 20 most economically developed countries, each with major cities
  var LOC_COUNTRIES=[
    ['us','United States','🇺🇸',['New York','Los Angeles','Chicago','San Francisco','Miami']],
    ['cn','China','🇨🇳',['Shanghai','Beijing','Shenzhen','Guangzhou','Hong Kong']],
    ['jp','Japan','🇯🇵',['Tokyo','Osaka','Yokohama','Nagoya','Fukuoka']],
    ['de','Germany','🇩🇪',['Berlin','Munich','Frankfurt','Hamburg','Cologne']],
    ['in','India','🇮🇳',['Mumbai','Delhi','Bengaluru','Hyderabad','Chennai']],
    ['gb','United Kingdom','🇬🇧',['London','Manchester','Birmingham','Edinburgh','Bristol']],
    ['fr','France','🇫🇷',['Paris','Lyon','Marseille','Toulouse','Nice']],
    ['it','Italy','🇮🇹',['Rome','Milan','Naples','Turin','Florence']],
    ['ca','Canada','🇨🇦',['Toronto','Vancouver','Montreal','Calgary','Ottawa']],
    ['br','Brazil','🇧🇷',['São Paulo','Rio de Janeiro','Brasília','Belo Horizonte','Porto Alegre']],
    ['kr','South Korea','🇰🇷',['Seoul','Busan','Incheon','Daegu','Daejeon']],
    ['au','Australia','🇦🇺',['Sydney','Melbourne','Brisbane','Perth','Adelaide']],
    ['es','Spain','🇪🇸',['Madrid','Barcelona','Valencia','Seville','Bilbao']],
    ['mx','Mexico','🇲🇽',['Mexico City','Guadalajara','Monterrey','Puebla','Cancún']],
    ['id','Indonesia','🇮🇩',['Jakarta','Surabaya','Bandung','Medan','Bali']],
    ['nl','Netherlands','🇳🇱',['Amsterdam','Rotterdam','The Hague','Utrecht','Eindhoven']],
    ['sa','Saudi Arabia','🇸🇦',['Riyadh','Jeddah','Mecca','Medina','Dammam']],
    ['ch','Switzerland','🇨🇭',['Zurich','Geneva','Basel','Bern','Lausanne']],
    ['tr','Turkey','🇹🇷',['Istanbul','Ankara','Izmir','Bursa','Antalya']],
    ['se','Sweden','🇸🇪',['Stockholm','Gothenburg','Malmö','Uppsala','Lund']]
  ];
  function isFav(id){return !!favs[id];}
  function toggleFav(id){favs[id]=!favs[id];}
  function trendChg(t){var s=((t.deg*13+t.sent)%88)/10+0.6; return +( (t.up?1:-1)*s ).toFixed(2);}
  var exIds=[], exShown=0, EX_BATCH=isPhone?8:14, exScrollTick=false;
  function renderExploreChunk(reset){
    var list=document.getElementById('ex-list');if(!list)return;
    if(reset){releaseMediaIn(list);list.innerHTML='';exShown=0;}
    var next=Math.min(exShown+EX_BATCH,exIds.length);
    if(next>exShown){
      list.insertAdjacentHTML('beforeend',exIds.slice(exShown,next).map(exRowHTML).join(''));
      exShown=next;
      list.querySelectorAll('.ex-car').forEach(wireDragRail);
      observeVids(list);
      refreshActiveMedia(list);
    }
  }
  function maybeLoadExploreMore(){
    if(currentScreenKey()!=='explore'||exShown>=exIds.length)return;
    var sc=document.querySelector('#s-explore .scrollarea');if(!sc)return;
    if(sc.scrollTop+sc.clientHeight>=sc.scrollHeight-520)renderExploreChunk(false);
  }
  function renderExplore(){
    var q=(document.getElementById('ex-search').value||'').trim().toLowerCase();
    var title=document.querySelector('#s-explore .shead h1');
    var list=document.getElementById('ex-list');
    if(title)title.textContent='Search';
    var ids2=order.filter(function(id){
      if(!q)return true;var t=T[id];return (t.name+' '+t.user+' '+t.zone+' '+t.kind).toLowerCase().indexOf(q)>=0;});
    ids2=ids2.slice();
    var sk=exFilters.sort;
    // "Trending" is the default and must MATCH THE FEED. `order` is already sorted by degree
    // (highest first), so we simply don't re-sort — search and the feed then read identically.
    // "Latest" is the one that ranks by recent movement instead.
    if(sk==='latest'){ids2.sort(function(a,b){return trendChg(T[b])-trendChg(T[a]);});}
    else if(sk==='newest'){ids2.sort(function(a,b){return (exSeed(b)-exSeed(a));});}
    else if(sk==='oldest'){ids2.sort(function(a,b){return (exSeed(a)-exSeed(b));});}
    exIds=ids2;
    renderExploreChunk(true);
    document.getElementById('ex-empty').textContent='No trends match that search.';
    document.getElementById('ex-empty').style.display=ids2.length?'none':'block';
  }
  function exSeed(id){var s=0;for(var i=0;i<id.length;i++)s=(s*31+id.charCodeAt(i))%99991;return s;}
  // ---- search filter sheets ----
  var locView=null; // null = country list, else country code = city list
  function foptHTML(val,label,sub,selected,extraAttr){
    return '<button class="fopt" '+(extraAttr||('data-val="'+val+'"'))+' aria-selected="'+(selected?'true':'false')+'">'+
      '<span class="fopt-tx"><span>'+label+'</span>'+(sub?'<small>'+sub+'</small>':'')+'</span>'+
      '<svg class="fopt-ck" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></button>';
  }
  function renderFilterSheets(){
    document.getElementById('fwhen-list').innerHTML=WHEN_OPTS.map(function(o){return foptHTML(o[0],o[1],o[2],exFilters.when===o[0]);}).join('');
    document.getElementById('fsort-list').innerHTML=SORT_OPTS.map(function(o){return foptHTML(o[0],o[1],o[2],exFilters.sort===o[0]);}).join('');
    renderLocSheet();
  }
  function countryById(code){for(var i=0;i<LOC_COUNTRIES.length;i++)if(LOC_COUNTRIES[i][0]===code)return LOC_COUNTRIES[i];return LOC_COUNTRIES[0];}
  function renderLocSheet(){
    var list=document.getElementById('floc-list'),back=document.getElementById('floc-back'),h=document.getElementById('floc-h'),sub=document.getElementById('floc-sub');
    if(!list)return;
    if(!locView){
      back.hidden=true; h.textContent='Location'; sub.textContent='Choose a country, then a city.';
      list.innerHTML=LOC_COUNTRIES.map(function(c){
        var sel=exFilters.country===c[0];
        return foptHTML(null,c[2]+'  '+c[1],sel?(exFilters.city==='all'?'All cities':exFilters.city):c[3].length+' cities',sel,'data-country="'+c[0]+'"');
      }).join('');
    }else{
      var c=countryById(locView);
      back.hidden=false; h.textContent=c[2]+' '+c[1]; sub.textContent='Choose a city.';
      var rows=foptHTML(null,'All of '+c[1],'Every city',exFilters.country===c[0]&&exFilters.city==='all','data-city="all" data-country="'+c[0]+'"');
      rows+=c[3].map(function(city){return foptHTML(null,city,'',exFilters.country===c[0]&&exFilters.city===city,'data-city="'+city+'" data-country="'+c[0]+'"');}).join('');
      list.innerHTML=rows;
    }
  }
  function openFilterSheet(which){
    closeAll();
    if(which==='loc'){locView=(exFilters.country&&exFilters.city!=='all')?exFilters.country:null;}
    renderFilterSheets();
    var id=which==='when'?'fsheet-when':which==='sort'?'fsheet-sort':'fsheet-loc';
    document.getElementById(id).classList.add('open'); scrim.classList.add('open');
  }
  function syncFilterLabels(){
    var w=WHEN_OPTS.filter(function(o){return o[0]===exFilters.when;})[0];
    var s=SORT_OPTS.filter(function(o){return o[0]===exFilters.sort;})[0];
    document.getElementById('exf-when-lbl').textContent=w?w[1]:'Today';
    document.getElementById('exf-sort-lbl').textContent=s?s[1]:'Trending';
    var c=countryById(exFilters.country);
    document.getElementById('exf-loc-lbl').textContent=(exFilters.city&&exFilters.city!=='all')?exFilters.city:c[0].toUpperCase();
  }
  document.getElementById('ex-search').addEventListener('input',renderExplore);
  var exScroll=document.querySelector('#s-explore .scrollarea');
  if(exScroll)exScroll.addEventListener('scroll',function(){
    if(exScrollTick)return;exScrollTick=true;
    requestAnimationFrame(function(){exScrollTick=false;maybeLoadExploreMore();});
  },{passive:true});
  function moveInd(){var a=document.querySelector('.tabbar button[aria-current=true]');if(!a)return;
    var ind=document.getElementById('tab-ind');ind.style.left=a.offsetLeft+'px';ind.style.width=a.offsetWidth+'px';}

  function renderRecent(t){var out='';
    for(var i=0;i<3;i++){var rise=((t.deg+i*7)%100)<t.sent;var h=HANDLES[(i*3+t.deg)%HANDLES.length];
      var col=AVCOL[(i+t.deg)%AVCOL.length];var stake=[10,50,200][(i+t.deg)%3];
      out+='<div class="frow"><span class="fav" style="background:'+col+'"></span><span class="fu">@'+h+'</span>'+
        '<span class="fd '+(rise?'rise':'cool')+'">'+(rise?'▲ Rise':'▼ Cool')+' '+stake+'</span></div>';}
    return out;}

  // A still <img> pointing straight at media/<id>/pNN.jpg. The src is an exact local path, so
  // there's no extension walk and no fallback chain. If the file is ever deleted we hide the img
  // and let the trend's gradient show through — a missing asset must never leave a black card.
  function stillImg(src){
    if(!src)return '';
    var onerr="this.onerror=null;this.style.display='none';var p=this.parentNode;if(p)p.classList.add('nomedia');";
    return '<img class="dtile-vid img-fade" src="'+src+'" alt="" loading="lazy" onload="this.classList.add(\'in\')" onerror="'+onerr+'">';
  }
  // Detail media strip. Built from the SAME orderedMedia list as the feed, so data-feedidx on each
  // tile is exactly the feed slide it opens (no more off-by-one). Quote items are feed-only, skipped here.
  function carTiles(t,id){
    var imgs=imgsOf(t);
    return orderedMedia(t,id).map(function(m,i){
      if(m.k!=='photo'&&m.k!=='img')return '';   // skip editorial quotes in the strip
      var grad='linear-gradient('+(140+i*18)+'deg,'+t.theme[i%3]+','+t.theme[(i+1)%3]+')';
      if(m.k==='img'){
        // Each clip tile shows ITS OWN poster (not imgs[0], which painted the same still on every
        // tile and left nothing at all for trends with no stills — Claude, TikTok).
        var pic=m.poster||tileStill(id,i);
        return '<button class="dtile" data-feedgo="'+id+'" data-feedidx="'+i+'"'+clipAttrs(id,m.n,false)+' style="background:'+grad+'">'+
          (pic?'<img class="dtile-vid" src="'+pic+'" alt="" onerror="this.style.display=\'none\'">':'')+'</button>';
      }
      return '<button class="dtile" data-feedgo="'+id+'" data-feedidx="'+i+'" style="background:'+grad+'">'+stillImg(m.src)+'</button>';
    }).join('');
  }
  function openFeedAt(id,slide){
    if(slide!=null&&!isNaN(slide))leadSlide[id]=slide;
    // Land in the immersive single-trend feed, scrolled to this trend.
    if(GX.open)gxClose(true);
    feedMode='single';
    renderFeedSingle('all',id);           // one feed; scroll precisely to the target trend
    var topic=feed.querySelector('.topic[data-id="'+id+'"]');
    if(topic&&leadSlide[id]!=null&&carousel[id])setSlide(topic,id,leadSlide[id],true);
    show('feed');
    kickVideos();}
  function setHTML(id,html){var e=document.getElementById(id);if(e)e.innerHTML=html;}

  // ===== Simple relevance chart (default trend view for everyone) =====
  // One surface: a Google-Trends-style line of relevance (°) over time, shown by default.
  // The series ends exactly at the trend's current degree so it agrees with the hero number.
  // Polymarket-style horizons — trends are short-lived, so nothing runs older than ~1 year (MAX).
  var STF_ORDER=['1H','1D','1W','1M','MAX'];
  var sTF='1M', sStore={};
  var STFVOL={'1H':0.010,'1D':0.018,'1W':0.028,'1M':0.040,'MAX':0.100};
  var STFN={'1H':48,'1D':48,'1W':48,'1M':56,'MAX':64};
  var STFSPAN={'1H':1/24,'1D':1,'1W':7,'1M':30,'MAX':365};   // span in days
  var SMON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  // Axis/scrub label: intraday frames show a clock time, longer frames a date.
  function schartDate(daysAgo,tf){
    var dt=new Date(Date.now()-daysAgo*86400000);
    var h=dt.getHours(),mm=('0'+dt.getMinutes()).slice(-2),ap=h>=12?'PM':'AM',hh=(h%12)||12;
    var clock=hh+':'+mm+' '+ap;
    if(tf==='1H')return clock;
    if(tf==='1D')return SMON[dt.getMonth()]+' '+dt.getDate()+', '+clock;
    var s=SMON[dt.getMonth()]+' '+dt.getDate();
    if(tf==='MAX')s+=', '+dt.getFullYear();
    return s;
  }
  // Compact "x ago" from a fractional day count (used for milestone/event age chips).
  function agoLabelFromDays(fd){
    if(fd<=0.0007)return 'now';
    var mins=fd*1440; if(mins<60)return Math.max(1,Math.round(mins))+'m';
    var hrs=fd*24; if(hrs<24)return Math.round(hrs)+'h';
    if(fd<7)return Math.round(fd)+'d';
    if(fd<30)return Math.round(fd/7)+'w';
    if(fd<365)return Math.round(fd/30)+'mo';
    return Math.round(fd/365)+'y';
  }
  function simpleSeries(t,tf){
    var vol=STFVOL[tf]||0.04,n=STFN[tf]||56,base=t.deg||500;
    var seed=base*17+tf.charCodeAt(0)*97+tf.length*131+7,price=base*(1-vol*3.2),cs=[];
    for(var i=0;i<n;i++){seed=lcg(seed);var r=seed/233280;
      price=price+(r-0.5)*base*vol*2+(t.up?base*vol*0.14:-base*vol*0.14);
      price=Math.max(base*0.45,Math.min(base*1.5,price));cs.push(price);}
    var delta=base-cs[n-1],floor=Math.max(20,base*0.2); // land on the live degree, keep relevance positive
    for(var j=0;j<n;j++)cs[j]=Math.max(floor,cs[j]+delta);
    cs[n-1]=base; // endpoint is always the live degree
    return cs;
  }
  function schartScale(cs){var mn=Math.min.apply(null,cs),mx=Math.max.apply(null,cs),pad=(mx-mn)*0.16||6;return {mn:mn-pad,mx:mx+pad};}
  function schartX(i,n){return (i/(n-1))*100;}
  function schartY(v,sc){return 6+(1-(v-sc.mn)/(sc.mx-sc.mn))*88;}
  // Minimalist relevance line: one clean stroke, no fill, no gridlines.
  function schartSVG(cs,up,sc){
    var n=cs.length;
    var line=cs.map(function(v,i){return schartX(i,n).toFixed(2)+','+schartY(v,sc).toFixed(2);}).join(' ');
    var col='#0A0A0A';
    return '<svg viewBox="0 0 100 100" preserveAspectRatio="none">'+
      '<polyline points="'+line+'" fill="none" stroke="'+col+'" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>';
  }
  // Flag the few most prominent abnormal peaks/drops as milestone markers.
  function detectMilestones(cs){
    var n=cs.length; if(n<6)return [];
    var mn=Math.min.apply(null,cs),mx=Math.max.apply(null,cs),range=(mx-mn)||1,cand=[];
    for(var i=2;i<n-2;i++){
      var cur=cs[i],isPeak=cur>cs[i-1]&&cur>=cs[i+1],isTrough=cur<cs[i-1]&&cur<=cs[i+1];
      if(!isPeak&&!isTrough)continue;
      var prom=isPeak?(cur-Math.min(cs[i-2],cs[i+2])):(Math.max(cs[i-2],cs[i+2])-cur);
      if(prom>0)cand.push({i:i,dir:isPeak?'up':'dn',prom:prom});
    }
    // Every trend shows milestones: if the series is flat/monotone and produced no
    // local extremes, synthesize two from interior points instead of a bare chart.
    if(!cand.length){
      var a=Math.round(n*0.35),b=Math.round(n*0.7);
      cand.push({i:a,dir:cs[a]>=cs[a-1]?'up':'dn',prom:range*0.3});
      cand.push({i:b,dir:cs[b]>=cs[b-1]?'up':'dn',prom:range*0.25});
    }
    cand.sort(function(a,b){return b.prom-a.prom;});
    var chosen=[],gap=Math.max(3,Math.round(n*0.08));
    for(var k=0;k<cand.length&&chosen.length<3;k++){
      var ok=true;for(var u=0;u<chosen.length;u++)if(Math.abs(chosen[u].i-cand[k].i)<gap){ok=false;break;}
      if(ok)chosen.push(cand[k]);
    }
    // never fewer than 2 marks when candidates exist - relax spacing before going sparse
    for(var k2=0;k2<cand.length&&chosen.length<2;k2++)if(chosen.indexOf(cand[k2])<0)chosen.push(cand[k2]);
    chosen.sort(function(a,b){return a.i-b.i;});
    return chosen;
  }
  function simpleChartHTML(t,id){
    var tfs=STF_ORDER.map(function(x){return '<button data-stf="'+x+'"'+(x===sTF?' class="on"':'')+'>'+x+'</button>';}).join('');
    return '<div class="schart">'+
      '<div class="schart-tabs" id="schart-tf">'+tfs+'</div>'+
      '<div class="schart-date" id="schart-date"></div>'+
      '<div class="schart-graph" id="schart-graph"><div class="schart-svg" id="schart-svg"></div>'+
        '<div class="schart-marks" id="schart-marks"></div>'+
        '<div class="schart-cross" id="schart-cross"></div>'+
        '<span class="schart-dot" id="schart-dot"></span>'+
        '<div class="schart-val" id="schart-val"></div>'+
        '<div class="schart-impact" id="schart-impact"></div></div>'+
      '<div class="schart-cap" id="schart-cap"></div>'+
    '</div>';
  }
  function renderSimpleChart(id){
    var t=T[id];if(!t)return;
    var cs=simpleSeries(t,sTF),sc=schartScale(cs),marks=detectMilestones(cs);
    // Attach a "what moved it" story to each milestone so tapping the dot opens the event.
    var span=STFSPAN[sTF]||30, range=(Math.max.apply(null,cs)-Math.min.apply(null,cs))||1, sd=seedFor(id);
    marks.forEach(function(m,mi){
      var fdays=span*(1-m.i/(cs.length-1));
      m.sig={src:TL_SRC[(sd+mi*3)%TL_SRC.length],head:TL_EVENTS[(sd+mi*7)%TL_EVENTS.length].t,
        time:agoLabelFromDays(fdays),
        dir:(m.dir==='up'?'up':'down'),m:Math.max(3,Math.round(m.prom/range*24))};
    });
    sStore[id]={cs:cs,tf:sTF,sc:sc,marks:marks};
    setHTML('schart-svg',schartSVG(cs,t.up,sc));
    var mel=document.getElementById('schart-marks');
    if(mel){var nn=cs.length;mel.innerHTML=marks.map(function(m,mi){
      return '<button class="schart-mark '+(m.dir==='up'?'up':'dn')+'" data-mi="'+mi+'" aria-label="'+(m.dir==='up'?'Spike':'Drop')+' — what moved it" style="left:'+schartX(m.i,nn).toFixed(2)+'%;top:'+schartY(cs[m.i],sc).toFixed(2)+'%"></button>';
    }).join('');}
    var hi=Math.round(Math.max.apply(null,cs)),lo=Math.round(Math.min.apply(null,cs));
    var vol=fmt(Math.round((t.fc||100)*2400));
    setHTML('schart-cap','High <b>'+hi+'°</b> · Low <b>'+lo+'°</b> · Vol <b>'+vol+' ◇</b>');
    setHTML('schart-date',schartDate(0,sTF));
    var tabs=document.getElementById('schart-tf');
    if(tabs)tabs.querySelectorAll('button').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-stf')===sTF);});
    var cross=document.getElementById('schart-cross'),dot=document.getElementById('schart-dot'),val=document.getElementById('schart-val');
    if(cross)cross.style.display='none';if(dot)dot.style.display='none';if(val)val.style.display='none';
  }
  // Persistent marker (set by tapping a timeline event or milestone) so the chart keeps showing
  // "what happened here" after a scrub ends. chartMark[id] = frozen data index, or undefined.
  var chartMark={};
  // Place the dot/crosshair/degree at a data index and show the impact it caused (the move over the
  // window right after the event). Persists until another point is chosen.
  function markChartAt(id,idx,freeze){
    var d=sStore[id];if(!d)return;
    var cross=document.getElementById('schart-cross'),dot=document.getElementById('schart-dot'),
        val=document.getElementById('schart-val'),imp=document.getElementById('schart-impact'),
        dateEl=document.getElementById('schart-date');
    var n=d.cs.length;idx=Math.max(0,Math.min(n-1,Math.round(idx)));
    if(freeze!==false)chartMark[id]=idx;
    var xPct=idx/(n-1)*100, yPct=schartY(d.cs[idx],d.sc), deg=Math.round(d.cs[idx]);
    if(cross){cross.style.left=xPct.toFixed(2)+'%';cross.style.display='block';}
    if(dot){dot.style.left=xPct.toFixed(2)+'%';dot.style.top=yPct.toFixed(2)+'%';dot.style.display='block';}
    var sx = xPct>62 ? '-112%' : (xPct<38 ? '12%' : '-50%');
    var sy = yPct<26 ? '85%' : '-185%';
    if(val){val.textContent=deg+'°';val.style.left=xPct.toFixed(2)+'%';val.style.top=yPct.toFixed(2)+'%';
      val.style.transform='translate('+sx+','+sy+')';val.style.display='block';}
    // Impact = how the relevance moved in the window just after this moment.
    var j=Math.min(n-1, idx+Math.max(2,Math.round(n*0.12))), delta=Math.round(d.cs[j]-d.cs[idx]);
    if(imp){imp.textContent=(delta>=0?'+':'−')+Math.abs(delta)+'°';
      imp.className='schart-impact '+(delta>=0?'up':'dn')+' show';
      imp.style.left=xPct.toFixed(2)+'%';imp.style.top=yPct.toFixed(2)+'%';
      imp.style.transform='translate('+(xPct>62?'-108%':(xPct<38?'8%':'-50%'))+','+(yPct<26?'260%':'150%')+')';}
    var span=STFSPAN[d.tf]||30;
    if(dateEl)dateEl.textContent=schartDate(span*(1-idx/(n-1)),d.tf);
  }
  function clearChartMark(id){delete chartMark[id];
    ['schart-cross','schart-dot','schart-val'].forEach(function(x){var e=document.getElementById(x);if(e)e.style.display='none';});
    var imp=document.getElementById('schart-impact');if(imp)imp.className='schart-impact';
    var d=sStore[id],dateEl=document.getElementById('schart-date');if(dateEl&&d)dateEl.textContent=schartDate(0,d.tf);}
  function attachSimpleCross(id){
    var g=document.getElementById('schart-graph');if(!g)return;
    var cross=document.getElementById('schart-cross'),dot=document.getElementById('schart-dot'),
        val=document.getElementById('schart-val'),imp=document.getElementById('schart-impact'),dateEl=document.getElementById('schart-date');
    function at(cx){
      var d=sStore[id];if(!d)return;var pr=g.getBoundingClientRect(),n=d.cs.length;
      var idx=Math.round((cx-pr.left)/pr.width*(n-1));idx=Math.max(0,Math.min(n-1,idx));
      var xPct=idx/(n-1)*100, yPct=schartY(d.cs[idx],d.sc), deg=Math.round(d.cs[idx]);
      if(imp)imp.className='schart-impact';   // scrubbing hides the frozen impact badge
      cross.style.left=xPct.toFixed(2)+'%';cross.style.display='block';
      dot.style.left=xPct.toFixed(2)+'%';dot.style.top=yPct.toFixed(2)+'%';dot.style.display='block';
      // Bold degree sits beside/above the dot — offset away from the finger so it stays readable.
      val.textContent=deg+'°';
      val.style.left=xPct.toFixed(2)+'%';val.style.top=yPct.toFixed(2)+'%';
      var sx = xPct>62 ? '-112%' : (xPct<38 ? '12%' : '-50%');
      var sy = yPct<26 ? '85%' : '-185%';
      val.style.transform='translate('+sx+','+sy+')';
      val.style.display='block';
      var span=STFSPAN[d.tf]||30;
      if(dateEl)dateEl.textContent=schartDate(span*(1-idx/(n-1)),d.tf);
    }
    function end(){
      // Restore the frozen marker if one is set; otherwise clear the scrub overlay.
      if(chartMark[id]!=null){markChartAt(id,chartMark[id]);return;}
      if(cross)cross.style.display='none';if(dot)dot.style.display='none';if(val)val.style.display='none';
      var d=sStore[id];if(dateEl&&d)dateEl.textContent=schartDate(0,d.tf);
    }
    // A clean tap (no horizontal drag) opens the split-screen chart; a drag scrubs.
    var downX=0,moved=false;
    g.addEventListener('pointerdown',function(e){downX=e.clientX;moved=false;at(e.clientX);});
    g.addEventListener('pointermove',function(e){if(e.pressure>0||e.buttons||e.pointerType==='mouse'){if(Math.abs(e.clientX-downX)>6)moved=true;at(e.clientX);}});
    g.addEventListener('pointerup',end);g.addEventListener('pointercancel',end);
    g.addEventListener('pointerleave',function(e){if(e.pointerType==='mouse')end();});
    g.addEventListener('click',function(e){if(e.target.closest('.schart-mark'))return;if(!moved)onChartTap();});
  }
  // ===== Full-screen chart: tapping the trend-page chart pushes in a dedicated screen with a
  // bigger chart on top and the timeline below. Only one chart node exists at a time (rebuilt in
  // whichever host is active) so the shared schart-* ids never collide. =====
  var chartFull=false, selTLKey=null, chartTLData={};
  function onChartTap(){ if(!chartFull) openChartScreen(); }
  function openChartScreen(){
    var t=T[currentId]; if(!t)return;
    document.getElementById('d-pro').innerHTML='';      // vacate the trend-page host (avoid dup ids)
    chartFull=true; selTLKey=null; delete chartMark[currentId];
    buildSimpleChart(currentId,'chart-host');
    renderChartTimeline(currentId);
    var nm=document.getElementById('chart-nm'),dg=document.getElementById('chart-deg');
    if(nm)nm.textContent=t.name;
    if(dg){dg.textContent=Math.round(t.deg)+'°';dg.className='csh-deg'+(t.up?'':' dn');}
    show('chart');
    var sa=document.getElementById('chart-scroll'); if(sa)sa.scrollTop=0;
    scheduleTLFocus();
  }
  function closeChartScreen(){
    chartFull=false; selTLKey=null;
    document.getElementById('chart-host').innerHTML='';
    buildSimpleChart(currentId,'d-pro');                // restore the trend-page chart
    goBack();
  }
  // Map an event's "x ago" label to a data index on the current series.
  function timeToDays(label){ if(!label||label==='now'||label==='today')return 0; return timeVal(label)/24; }
  function chartTLEntries(id){
    var d=sStore[id]; if(!d)return [];
    var n=d.cs.length, span=STFSPAN[d.tf]||30, entries=[];
    (d.marks||[]).forEach(function(m,mi){ entries.push({key:'m'+mi, ci:m.i, mile:true, sig:m.sig}); });
    timelineFor(id).forEach(function(s,si){
      var da=timeToDays(s.time), ci=Math.max(0,Math.min(n-1,Math.round((1-da/span)*(n-1))));
      entries.push({key:'e'+si, ci:ci, mile:false, sig:s});
    });
    return entries;
  }
  // Timeline scrolls independently under the fixed chart. The selected event floats to the top and
  // stays there until another is chosen; each row is linked to a point on the chart.
  function renderChartTimeline(id){
    var host=document.getElementById('chart-tl');if(!host)return;
    var entries=chartTLEntries(id);
    if(selTLKey){var si=-1;entries.forEach(function(e,i){if(e.key===selTLKey)si=i;});
      if(si>0){entries.unshift(entries.splice(si,1)[0]);}}
    var byKey={};entries.forEach(function(e){byKey[e.key]=e;});
    chartTLData[id]={entries:entries,byKey:byKey};
    var rows='<div class="schart-tl-h"><span>Timeline</span></div>';
    entries.forEach(function(e){
      rows+='<div class="tlwrap'+(e.mile?' mile':'')+(e.key===selTLKey?' sel':'')+'" data-tlkey="'+e.key+'" data-ci="'+e.ci+'">'+sigRow(e.sig)+'</div>';
    });
    host.innerHTML=rows;
    scheduleTLFocus();
  }
  // Scroll-driven focus: the entry nearest the top of the list reads at full strength (bold, opaque)
  // and the rest ease back into light gray as they move away — a focus/scroll-picker feel. Anchored
  // to the top of the visible timeline so the topmost row is always the one "in focus".
  var _tlFocusRAF=0;
  function updateTLFocus(){
    var scroller=document.getElementById('chart-scroll'); if(!scroller)return;
    var rows=scroller.querySelectorAll('.tlwrap'); if(!rows.length)return;
    // One continuous falloff from the anchor line — every row's opacity is a smooth function of
    // its distance, with no per-row special cases, so nothing ever pops while scrolling.
    var anchor=scroller.getBoundingClientRect().top+14, RANGE=250, MINOP=0.32, focus=null;
    rows.forEach(function(row){
      var r=row.getBoundingClientRect(), mid=r.top+r.height/2, d=mid-anchor;
      var dist=d>=0?d:-d*1.5;                       // rows scrolled past the anchor fade a touch faster
      var t=Math.min(1,dist/RANGE), ease=t*t*(3-2*t); // smoothstep
      row.style.opacity=(1-(1-MINOP)*ease).toFixed(3);
      if(!focus&&d>=-r.height/2)focus=row;            // first row at/below the anchor is in focus
    });
    rows.forEach(function(row){row.classList.toggle('tl-foc',row===focus);});
  }
  function scheduleTLFocus(){ if(_tlFocusRAF)return; _tlFocusRAF=requestAnimationFrame(function(){_tlFocusRAF=0;updateTLFocus();}); }
  (function(){var sa=document.getElementById('chart-scroll'); if(sa)sa.addEventListener('scroll',scheduleTLFocus,{passive:true});})();
  // Open the "what happened" detail for a timeline entry (milestone or event).
  function openTLDetail(id,key){ var e=chartTLData[id]&&chartTLData[id].byKey[key]; if(e&&e.sig)openArticle(e.sig); }
  // Choose a timeline entry (from a chart milestone or a timeline row): float it to the top, mark its
  // point on the fixed chart with the impact it caused, and scroll the list back up to it.
  function selectTL(id,key){
    if(!chartFull){ openChartScreen(); }
    selTLKey=key; renderChartTimeline(id);
    var e=chartTLData[id]&&chartTLData[id].byKey[key];
    if(e&&e.ci!=null)markChartAt(id,e.ci);
    var sa=document.getElementById('chart-scroll'); if(sa){if(sa.scrollTo&&!prefersReducedMotion())sa.scrollTo({top:0,behavior:'smooth'});else sa.scrollTop=0;}
    scheduleTLFocus();
  }
  function buildSimpleChart(id,hostId){
    var host=document.getElementById(hostId||'d-pro');if(!host)return;
    host.innerHTML=simpleChartHTML(T[id],id);
    renderSimpleChart(id);
    attachSimpleCross(id);
  }
  // chart controls (registered before the main delegated handler, so it can intercept timeline taps
  // in the chart screen and stop them from opening the article reader).
  document.addEventListener('click',function(e){
    var stf=e.target.closest('#schart-tf button');
    if(stf){var nt=stf.getAttribute('data-stf');if(nt===sTF)return;
      sTF=nt;selTLKey=null;delete chartMark[currentId];
      renderSimpleChart(currentId);if(chartFull)renderChartTimeline(currentId);return;}
    // Chart milestone dots: first tap selects (drops the marker), tapping again opens the story.
    var mk=e.target.closest('.schart-mark');
    if(mk){e.stopImmediatePropagation();var mkey='m'+mk.getAttribute('data-mi');
      if(mkey===selTLKey)openTLDetail(currentId,mkey);else selectTL(currentId,mkey);return;}
    // Timeline rows: the ▲/▼ arrow marks the chart (dot where it happened);
    // tapping anywhere else on the row goes straight to the milestone page.
    var tw=e.target.closest('#s-chart .tlwrap[data-tlkey]');
    if(tw){e.stopImmediatePropagation();var tkey=tw.getAttribute('data-tlkey');
      if(e.target.closest('.sig-dir'))selectTL(currentId,tkey);
      else openTLDetail(currentId,tkey);
      return;}
  });

  // ===== Related trends + simulated dependency =====
  // Relations are a graph, not a hierarchy (spec §3): SUBMAP links run both ways between peers
  // (t.sub is just this node's adjacency list). All UI copy says "Related".
  var subSim=null;
  // Equal-weight aggregation (MVP): every related trend contributes 1/N, matching the equal-weight
  // collection-degree model in the spec (no per-trend impact weighting).
  function netPull(id){var t=T[id];if(!t||!t.sub||!t.sub.length)return 0;var s=0,n=t.sub.length;t.sub.forEach(function(x){var st=T[x.id];if(st)s+=(st.chg||0);});return s/n;}
  function renderSubs(id){
    var t=T[id],host=document.getElementById('d-subs');if(!host||!t.sub)return;
    releaseMediaIn(host);
    host.innerHTML=t.sub.map(function(x,i){var st=T[x.id];if(!st)return '';
      var up=(st.chg||0)>=0,chg=(up?'+':'')+Math.round(st.chg||0)+'%';
      // Play a clip on the related-trend card when that related trend has clips.
      var vs=vcount(x.id)?clipAttrs(x.id,(i%vcount(x.id))+1,true):'';
      return '<button class="subcard" data-go-trend="'+x.id+'">'+
        '<span class="subcard-img"'+vs+' style="background:linear-gradient(150deg,'+st.theme[0]+','+(st.theme[2]||st.theme[1])+')">'+(st.img?'<img src="'+st.img+'" alt="" onerror="this.style.display=\'none\'">':'')+'</span>'+
        '<span class="subcard-nm">'+st.name+'</span>'+
        '<span class="subcard-row"><span class="subcard-deg">'+Math.round(st.deg)+'°</span><span class="subcard-chg '+(up?'up':'dn')+'">'+chg+'</span></span></button>';
    }).join('');
    refreshActiveMedia(host);
    var nd=Math.round(netPull(id)*(t.deg/100)*0.4),el=document.getElementById('d-subnet');
    if(el)el.innerHTML='<span class="sn-live"></span>Forces pulling this trend <b class="'+(nd>=0?'up':'dn')+'">'+(nd>=0?'+':'')+nd+'°</b> right now';
  }
  // Live-update only the numbers on the related cards. Rebuilding innerHTML here would tear
  // down and recreate every sub-card video each tick -> visible flashing. Update text in place.
  function updateSubsStats(id){
    var t=T[id],host=document.getElementById('d-subs');if(!host||!t.sub)return;
    var cards=host.querySelectorAll('.subcard');
    t.sub.forEach(function(x,i){var st=T[x.id],card=cards[i];if(!st||!card)return;
      var up=(st.chg||0)>=0,chg=(up?'+':'')+Math.round(st.chg||0)+'%';
      var dg=card.querySelector('.subcard-deg');if(dg)dg.textContent=Math.round(st.deg)+'°';
      var cg=card.querySelector('.subcard-chg');if(cg){cg.textContent=chg;cg.className='subcard-chg '+(up?'up':'dn');}
    });
    var nd=Math.round(netPull(id)*(t.deg/100)*0.4),el=document.getElementById('d-subnet');
    if(el)el.innerHTML='<span class="sn-live"></span>Forces pulling this trend <b class="'+(nd>=0?'up':'dn')+'">'+(nd>=0?'+':'')+nd+'°</b> right now';
  }
  setInterval(function(){
    var det=document.getElementById('s-detail');
    if(!det.classList.contains('active')||!subSim||currentId!==subSim.id)return;
    var t=T[currentId];if(!t||!t.sub)return;
    t.sub.forEach(function(x){var st=T[x.id];if(!st)return;st.seed=lcg(st.seed||(st.deg*7+3));var r=st.seed/233280;
      st.chg=Math.max(-30,Math.min(40,(st.chg||0)+(r-0.5)*2.4));st.deg=Math.round(Math.max(50,st.deg+(r-0.5)*1.6));});
    var target=subSim.base+netPull(currentId)*(subSim.base/100)*0.4;
    subSim.deg+=(target-subSim.deg)*0.25;
    var dd=document.getElementById('d-deg');if(dd)dd.textContent=Math.round(subSim.deg)+'°';
    updateSubsStats(currentId);
  },2600);

  function openDetail(id){
    currentId=id; var t=T[id];
    var car=document.getElementById('d-car'); releaseMediaIn(car); car.innerHTML=carTiles(t,id); resetDragRail(car); wireDragRail(car);
    observeVids(car);
    // Tint the ambient hero glow with this trend's own palette so each trend feels like its own world.
    var dglow=document.getElementById('d-glow');
    if(dglow){var gc=(t.theme&&t.theme[1])||'#8AA1F2';
      dglow.style.background='radial-gradient(64% 58% at 50% -6%, color-mix(in srgb,'+gc+' 46%, transparent), transparent 72%)';}
    document.getElementById('d-name').textContent=t.name;
    document.getElementById('d-user').textContent=t.user;
    var dsave=document.getElementById('d-save');
    if(dsave){dsave.setAttribute('data-fav',id);dsave.classList.toggle('on',isFav(id));}
    var dsoc=document.getElementById('d-social');
    if(t.kind==='niche'){var dfList=trendFollowedCurators(id),dfollow=dfList.length,df='';
      for(var dk=0;dk<Math.min(dfollow,3);dk++){df+='<i style="'+avatarStyle(dfList[dk],id)+'"></i>';}
      dsoc.innerHTML='<b>'+t.fc+'</b> curators'+(dfollow>0?'<span class="nh-follow"><span class="dh-dot">·</span><span class="facepile">'+df+'</span><b>'+dfollow+'</b> you follow</span>':'');
      dsoc.style.display='';
    }else{dsoc.style.display='none';dsoc.innerHTML='';}
    var ddesc=document.getElementById('d-desc');
    if(t.rel){ddesc.textContent=t.rel;ddesc.style.display='';}else{ddesc.style.display='none';}
    subSim=(t.sub&&t.sub.length)?{id:id,base:t.deg,deg:t.deg}:null;   // keep the live-degree simulation
    renderTrendPosts(id);
    var dd=document.getElementById('d-deg'); dd.textContent=Math.round(t.deg)+'°'; dd.className='deg'+(t.up?'':' dn');
    var sm=document.getElementById('d-smini'); sm.className='sentmini '+(t.up?'up':'dn'); sm.textContent=(t.up?'▲ ':'▼ ')+t.sent+'%';
    chartFull=false;
    buildSimpleChart(id);
    var cur=curOf(id);
    document.getElementById('d-user').setAttribute('data-user',t.user);
    liveTL.id=id; liveTL.items=timelineFor(id);
    stopLiveTL(); // timeline now lives inside the expanded chart, not as a standalone section
    var dcIm=imgsOf(t);
    renderCollCarousel(id);   // Collections = horizontal carousel
    renderRelatedFeed(id);    // Related = infinite masonry (this trend's related trends -> broader), below Collections
    document.getElementById('sec-moves').style.display='none'; // timeline moved into the expandable chart
    document.getElementById('sec-colls').style.display='';
    document.getElementById('sec-subs').style.display='';
    show('detail');
    var sa=document.querySelector('#s-detail .scrollarea');if(sa)sa.scrollTop=0;
  }

  var profileReturn='feed';
  var toastT;
  function showToast(msg){var el=document.getElementById('toast');if(!el)return;el.textContent=msg;el.classList.add('on');clearTimeout(toastT);toastT=setTimeout(function(){el.classList.remove('on');},1600);}
  // color helpers for themed flair accent (pick brightest theme color, lighten to stay readable on dark)
  function _rgb(hex){var c=hex.replace('#','');return [parseInt(c.substr(0,2),16),parseInt(c.substr(2,2),16),parseInt(c.substr(4,2),16)];}
  function lum(hex){var r=_rgb(hex);return 0.299*r[0]+0.587*r[1]+0.114*r[2];}
  function lighten(hex,amt){var r=_rgb(hex).map(function(x){return Math.round(x+(255-x)*amt);});return '#'+r.map(function(x){return ('0'+x.toString(16)).slice(-2);}).join('');}
  function accentOf(theme){var best=theme[0];theme.forEach(function(h){if(lum(h)>lum(best))best=h;});var g=0;while(lum(best)<165&&g<6){best=lighten(best,0.22);g++;}return best;}
  function trendRowHTML(id){var t=T[id];if(!t)return '';
    var rvs=vcount(id)?clipAttrs(id,1,true):'';
    return '<div class="trend-row" data-go-trend="'+id+'"><span class="trend-sw"'+rvs+' style="background-color:#16161c;'+tileBG(id,0,135)+'"></span>'+
      '<div class="trend-id"><div class="trend-nm">'+t.name+'</div><div class="trend-meta">'+t.fc+' curators</div></div>'+
      '<span class="trend-deg '+(t.up?'':'dn')+'">'+t.deg+'°</span></div>';}
  function exRowHTML(id){var t=T[id];
    // One tile per DISTINCT media item. The old code always drew 6 tiles and cycled them with
    // (i % vcount), so a trend with 1-3 clips showed the same video two or three times over.
    var items=orderedMedia(t,id).filter(function(m){return m.k==='photo'||(m.k==='img'&&m.vsrc);});
    var tiles='';
    items.forEach(function(m,i){
      var a=t.theme[i%3],bcol=t.theme[(i+1)%3];
      var grad='linear-gradient('+(140+i*18)+'deg,'+a+','+bcol+')';
      if(m.k==='img'){                                  // a clip: poster underneath, video on top
        var p=m.poster?'url('+m.poster+'),':'';
        tiles+='<span class="ex-tile"'+clipAttrs(id,m.n,true)+' style="background-image:'+p+grad+'"></span>';
      }else{                                            // a still
        tiles+='<span class="ex-tile" style="background-image:'+(m.src?'url('+m.src+'),':'')+grad+'"></span>';
      }
    });
    if(!tiles)tiles='<span class="ex-tile" style="'+tileBG(id,0,140)+'"></span>';
    return '<div class="trend-row ex-row" data-go-trend="'+id+'">'+
      '<div class="ex-car-wrap"><div class="ex-car">'+tiles+'</div><div class="ex-car-fade"></div></div>'+
      '<div class="ex-copy"><span class="ex-deg '+(t.up?'':'dn')+'">'+t.deg+'°</span>'+
        '<div class="trend-nm">'+t.name+'</div>'+
        '<div class="trend-meta">'+t.fc+' curators</div></div></div>';}
  // Cover style for a collection card: a member trend's media, or a flat gradient fallback.
  function collCover(id,fallback){
    var t=id&&T[id];
    if(t){var layers=[];
      var s=tileStill(id,0);                    // still, else a surviving clip poster
      if(s)layers.push('url('+s+')');
      layers.push('linear-gradient(150deg,'+t.theme[0]+','+t.theme[2]+')');
      return 'background-image:'+layers.join(',')+';background-size:cover;background-position:center';}
    return 'background:'+(fallback||'linear-gradient(150deg,#2b2d36,#161616)');
  }
  function collCardHTML(cover,title,sub,attr){
    return '<button class="cprof-cc"'+(attr||'')+'>'+
      '<span class="cprof-cc-cover" style="'+cover+'"></span>'+
      '<span class="cprof-cc-t">'+title+'</span>'+
      '<span class="cprof-cc-sub">'+sub+'</span></button>';
  }
  // Build a user's collections. For @you these are Watchlist (favorite trends) and My signals
  // (your trades) — rehoming the old Signals surface into the profile, Cosmos-style.
  // Build a believable, stable library for a visited curator so their profile isn't empty:
  // 1-2 public (tradable) collections built from their trends + related. Cached per handle.
  var CUR_LIB={};
  function curatorLibrary(handle,p){
    if(CUR_LIB[handle])return CUR_LIB[handle];
    var base=(p.leads||[]).concat(p.active||[]).filter(function(id){return T[id];});
    var members=base.slice();
    base.forEach(function(id){(T[id].sub||[]).forEach(function(x){var xid=x&&x.id;if(xid&&T[xid]&&members.indexOf(xid)<0)members.push(xid);});});
    var dom=(p.domains||'Culture').split('·')[0].trim();
    // Put a trend that actually has an image first, so the collection cover is never a flat gradient.
    function coverFirst(ids){var i=ids.findIndex(function(id){return T[id]&&T[id].img;}); if(i>0){ids=ids.slice();ids.unshift(ids.splice(i,1)[0]);} return ids;}
    var colls=[];
    if(members.length){colls.push({key:handle+'#0',name:dom,ids:coverFirst(members.slice(0,Math.min(6,members.length)))});}
    if(members.length>3){colls.push({key:handle+'#1',name:'Early '+dom,ids:coverFirst(members.slice(2,Math.min(7,members.length)))});}
    return (CUR_LIB[handle]={colls:colls});
  }
  // Collections: ONE concept. A collection is Private or Public. Public = tradable, curators only.
  // Archives no longer exist. Favorites is just a private collection that ships by default.
  function profileCollections(handle,p){
    var cards=[],count=0;
    if(handle==='@you'){
      // Favorites is a save mechanism, not a collection - it lives in the drawer, not on the profile.
      userLists.forEach(function(rec){
        var vids=rec.ids.filter(function(id){return T[id];});
        cards.push(collCardHTML(collCover(vids[0]),rec.name,vids.length+' trend'+(vids.length===1?'':'s')+' · '+visLabel(rec.vis),' data-userlist="'+rec.key+'"'));
        count++;
      });
      cards.push('<button class="cprof-cc new" data-pcoll="newcoll"><span class="cprof-cc-cover new"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></span><span class="cprof-cc-t">New collection</span><span class="cprof-cc-sub">Private or public</span></button>');
    }else{
      curatorLibrary(handle,p).colls.forEach(function(c){
        ensureCollAssetFromIds('curcoll:'+c.key,c.name,handle,c.ids);
        cards.push(collCardHTML(collCover(c.ids[0]),c.name,c.ids.length+' trends · Public',' data-curcoll="'+c.key+'"'));
        count++;
      });
    }
    var html=cards.join(''); if(!html)html='<div class="cprof-empty">No collections yet.</div>';
    return {html:html,count:count};
  }
  // profileArchives() deleted — archives are not a concept. Collections only.
  // Trends = trends this curator created (their leads + anything authored by them).
  function createdTrends(handle){return (ORDERS.all||order).filter(function(id){return T[id]&&!/^coll:/.test(id)&&T[id].kind!=='coll'&&T[id].user===handle;});}
  function profileTrends(handle,p){
    var ids=(p.leads||[]).slice();
    createdTrends(handle).forEach(function(id){if(ids.indexOf(id)<0)ids.push(id);});
    ids=ids.filter(function(id){return T[id];});
    var cards=ids.map(function(id){var t=T[id];return collCardHTML(collCover(id),t.name,Math.round(t.deg)+'°',' data-go-trend="'+id+'"');});
    if(handle==='@you')cards.push('<button class="cprof-cc new" data-newtrend="1"><span class="cprof-cc-cover new"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></span><span class="cprof-cc-t">New trend</span><span class="cprof-cc-sub">Create</span></button>');
    return {html:cards.join(''),count:ids.length};
  }
  // Compact open-position cards for the Signals carousel (private to you).
  function profileSignalsRail(handle){
    if(handle!=='@you')return {html:'<div class="cprof-rail-empty">Private.</div>',count:0};
    var open=positions.filter(function(p){return p.status==='open';});
    if(!open.length)return {html:'<div class="cprof-rail-empty">No open signals yet.</div>',count:0};
    var cards=open.map(function(p){var idx=positions.indexOf(p),t=T[p.id],ahead=(p.dir==='rise')===t.up;
      return '<button class="cprof-cc" data-signal="'+idx+'"><span class="cprof-cc-cover" style="'+collCover(p.id)+'"></span>'+
        '<span class="cprof-cc-t">'+t.name+'</span><span class="cprof-cc-sub">'+(p.dir==='rise'?'Rise ▲':'Cool ▼')+' · '+(ahead?'ahead':'behind')+'</span></button>';});
    return {html:cards.join(''),count:open.length};
  }
  // Kept for callers (e.g. resolvePos) — refreshes the Signals rail in place.
  function renderProfileSignals(handle){
    var host=document.getElementById('pf-signals'); if(!host)return; releaseMediaIn(host);
    var sig=profileSignalsRail(handle==='@you'?'@you':currentProfile); host.innerHTML=sig.html; refreshActiveMedia(host);
    var n=document.getElementById('pf-tn-s'); if(n)n.textContent=sig.count;
  }
  // Populate one carousel; hide the whole section when it's empty and this isn't your own profile.
  function setRail(railId,countId,secId,data,keep){
    var r=document.getElementById(railId); if(r){releaseMediaIn(r);r.innerHTML=data.html||'';refreshActiveMedia(r);}
    var c=document.getElementById(countId); if(c)c.textContent=data.count;
    var tb=document.querySelector('#pf-tabs [data-pftab-sec="'+secId+'"]');
    // Trends = trends you created. A user can't create trends, so the tab never applies to
    // them. Gated HERE (not in applyRole) because this runs on every profile render and would
    // otherwise put the tab straight back after a reload.
    var curatorOnly=(secId==='pf-sec-curations'&&!IS_CURATOR);
    if(tb)tb.style.display=(!curatorOnly&&(data.count>0||keep))?'':'none';   // empty sections lose their tab
  }
  // Profile content is tabbed - one pane at a time keeps the page quiet.
  var pfTab='colls';
  var PF_PANES={colls:'pf-sec-colls',signals:'pf-sec-signals',posts:'pf-sec-posts',curations:'pf-sec-curations'};
  function pfSetTab(key){
    if(!PF_PANES[key])key='colls';
    var tb=document.querySelector('#pf-tabs [data-pftab="'+key+'"]');
    if(tb&&tb.style.display==='none'){   // tab gone (count 0)? fall to the first visible one
      var vis=Array.prototype.find.call(document.querySelectorAll('#pf-tabs .cprof-tab'),function(b){return b.style.display!=='none';});
      if(vis)key=vis.getAttribute('data-pftab');
    }
    pfTab=key;
    document.querySelectorAll('#pf-tabs .cprof-tab').forEach(function(b){
      b.setAttribute('aria-current',b.getAttribute('data-pftab')===key?'true':'false');});
    Object.keys(PF_PANES).forEach(function(k){
      var p=document.getElementById(PF_PANES[k]); if(p)p.hidden=(k!==key);});
    // Guarantee the tabs can always reach their pin: measure the live geometry and
    // grow the pane by exactly the missing scroll length (plus slack), no assumptions.
    var sa=document.querySelector('#s-profile .scrollarea'), ap=document.getElementById(PF_PANES[key]);
    var tabsEl=document.getElementById('pf-tabs');
    if(sa&&ap&&tabsEl){
      ap.style.minHeight='';
      requestAnimationFrame(function(){
        var pin=parseFloat(getComputedStyle(tabsEl).top)||93;
        var need=tabsEl.offsetTop-pin+60;                 // scroll needed to pin, + slack
        var have=sa.scrollHeight-sa.clientHeight;
        if(have<need)ap.style.minHeight=(ap.offsetHeight+(need-have))+'px';
      });
    }
  }
  // Posts authored by this profile (compact cards in the carousel).
  function profilePostsRail(handle){
    var mine=[]; POSTS.forEach(function(pp,i){ if(pp.u===handle&&T[pp.id])mine.push({p:pp,i:i}); });
    var cards=mine.map(function(o){var t=T[o.p.id];
      var cover=o.p.pic?('background-image:url('+o.p.pic+');background-size:cover;background-position:center'):collCover(o.p.id);
      return '<button class="cprof-cc" data-upost="'+o.i+'"><span class="cprof-cc-cover" style="'+cover+'"></span>'+
        '<span class="cprof-cc-t">'+(o.p.title||o.p.text)+'</span>'+
        '<span class="cprof-cc-sub">'+t.name+' · '+t.deg+'°</span></button>';});
    if(handle==='@you')cards.push('<button class="cprof-cc new" data-newpost="1"><span class="cprof-cc-cover new"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></span><span class="cprof-cc-t">New post</span><span class="cprof-cc-sub">Share</span></button>');
    var html=cards.join(''); if(!html)html='<div class="cprof-rail-empty">No posts yet.</div>';
    return {html:html,count:mine.length};
  }
  function renderProfileSections(handle,p){
    var self=(handle==='@you');
    // Empty sections lose their tab on every profile; your own Collections tab
    // always stays - it carries the "New collection" entry point.
    setRail('pf-colls','pf-tn-c','pf-sec-colls',profileCollections(handle,p),self);
    setRail('pf-signals','pf-tn-s','pf-sec-signals',profileSignalsRail(handle),false);
    setRail('pf-uposts','pf-tn-p','pf-sec-posts',profilePostsRail(handle),false);
    setRail('pf-curations','pf-tn-cu','pf-sec-curations',profileTrends(handle,p),false);
    pfSetTab('colls');
  }
  // Every visible @handle must open a real profile. Handles that only exist as trend curators
  // (e.g. @gigafactory) get a deterministic profile synthesized on first tap — previously
  // openProfile bailed silently and the tap felt dead.
  function ensureProfile(handle){
    if(!handle||PROFILES[handle])return PROFILES[handle];
    var s=seedFor(handle);
    var leads=Object.keys(T).filter(function(id){return T[id]&&T[id].user===handle&&!/^coll:/.test(id);});
    var lead=leads[0], t=lead&&T[lead];
    var pool=(lead&&(T[lead].sub||[]).map(function(x){return x.id;}).filter(function(m){return T[m];}))||[];
    var domain='Culture · Trends';
    PROFILES[handle]={
      tag:t?('Curates '+t.name+' before the crowd gets there.'):'Curator on NOISE.',
      followers:t?Math.round(120+(t.fc||40)*2.4+(s%180)):140+(s%420),
      following:24+(s%140),
      domains:domain,leads:leads.slice(0,2),active:pool.slice(0,2),
      col:AVCOL[s%AVCOL.length]};
    return PROFILES[handle];
  }
  function openProfile(handle){
    var p=PROFILES[handle]||ensureProfile(handle); if(!p)return;
    currentProfile=handle;
    var self=(handle==='@you');
    var lead=(p.leads&&p.leads.length)?p.leads[0]:null;
    paintAvatar(document.getElementById('pf-av'),handle,lead);
    paintAvatar(document.getElementById('tab-av'),'@you');
    document.getElementById('pf-name').textContent=self?(p.name||'Tadeo'):handle;
    var pbn=document.getElementById('pfbar-name'); if(pbn)pbn.textContent=self?'@tadeov01':handle;
    paintAvatar(document.getElementById('pfbar-av'),handle,lead);
    var pbe=document.getElementById('pfbar-edit'); if(pbe)pbe.style.display=self?'':'none';
    var hEl=document.getElementById('pf-handle');
    hEl.textContent=self?'@tadeov01':(p.domains||'');
    hEl.style.display=hEl.textContent?'':'none';
    document.getElementById('pf-foll').textContent=fmt(self?myFollowers.length:p.followers);
    document.getElementById('pf-following').textContent=fmt(self?myFollowing.size:(p.following!=null?p.following:Math.round(p.followers*0.3+8)));
    // Search + gear (your account) only on your own profile; back button only on others'.
    var pback=document.getElementById('prof-back'),pheadr=document.getElementById('pf-headr');
    if(pback)pback.style.display=self?'none':'';
    if(pheadr)pheadr.style.display=self?'':'none';
    // Actions row: Add + Edit for you, Follow for others.
    var actions=document.getElementById('pf-actions');
    if(actions)actions.innerHTML=self
      ? '<button class="cprof-edit" id="pf-edit">Edit profile</button>'
      : '<button class="cprof-edit cprof-follow'+(isFollowing(handle)?' on':'')+'" id="pf-followbtn">'+(isFollowing(handle)?'Following':'Follow')+'</button>';
    // Tabbed panes: Collections · Signals · Posts · Trends (one grid at a time).
    renderProfileSections(handle,p);
    profileReturn=currentScreenKey();
    show('profile');
    var sa=document.querySelector('#s-profile .scrollarea');if(sa)sa.scrollTop=0;
  }

  // ===== Followers / Following =====
  var currentProfile='@you', userlistReturn='profile', ulHandle='@you', ulKind='followers', ulMode='profile', ulTrend=null;
  // The specific curators you follow who are active in a given trend — a stable subset of the people
  // you actually follow, sized to the trend's "you follow" count so the list always matches the number.
  function trendFollowedCurators(id){
    var pool=Array.from(myFollowing); if(!pool.length)return [];
    var want=(typeof CUR!=='undefined'&&CUR[id]&&CUR[id].yf)||0;
    var n=Math.min(want,pool.length); if(n<=0)return [];
    var s=seedFor('tf|'+id), rot=s%pool.length;
    return pool.slice(rot).concat(pool.slice(0,rot)).slice(0,n);
  }
  // Who @you follows / is followed by — a real, persistent store so counts match the lists and the
  // Follow buttons reflect (and remember) state. Only real known profiles, so nothing is invented.
  var OTHER_HANDLES=Object.keys(PROFILES).filter(function(h){return h!=='@you';});
  var myFollowing=new Set(OTHER_HANDLES.slice(0,8));   // you follow these 8
  var myFollowers=OTHER_HANDLES.slice();               // these follow you
  function isFollowing(h){return myFollowing.has(h);}
  function toggleFollow(h){ if(myFollowing.has(h))myFollowing.delete(h); else myFollowing.add(h);
    if(currentProfile==='@you'){var pf=document.getElementById('pf-following'); if(pf)pf.textContent=fmt(myFollowing.size);} }
  function userRowHTML(handle){var p=PROFILES[handle];if(!p)return '';
    var lead=(p.leads&&p.leads.length)?p.leads[0]:null;
    var chk=(p.followers>=1000)?'<span class="ucheck"><svg viewBox="0 0 24 24"><path d="M5 12l4 4 10-10"/></svg></span>':'';
    var fol=isFollowing(handle);
    return '<div class="urow" data-user="'+handle+'"><span class="uav" style="'+avatarStyle(handle,lead)+'"></span>'+
      '<div class="uid"><div class="unm">'+handle+chk+'</div><div class="usub">'+fmt(p.followers)+' followers</div></div>'+
      '<button class="cb-follow sm'+(fol?' on':'')+'" data-followtoggle="'+handle+'">'+(fol?'Following':'Follow')+'</button></div>';}
  // @you's lists are the real follow store (so counts match). Other profiles show a deterministic
  // sample of known profiles.
  function followSet(handle,kind){
    if(handle==='@you'){ return kind==='following'?Array.from(myFollowing):myFollowers.slice(); }
    var all=Object.keys(PROFILES).filter(function(h){return h!==handle&&h!=='@you';});
    var s=seedFor(handle+'|'+kind), rot=s%Math.max(1,all.length);
    var rotated=all.slice(rot).concat(all.slice(0,rot));
    var n=kind==='following'?(3+(s%4)):Math.max(4,all.length-(s%3));
    return rotated.slice(0,Math.min(rotated.length,n));}
  function renderUserList(){
    var tabs=document.querySelector('#s-userlist .ultabs'), titleEl=document.getElementById('ul-title'), list=document.getElementById('ul-list');
    if(ulMode==='trend'){   // curators you follow, active in a trend — no Followers/Following tabs
      if(tabs)tabs.style.display='none';
      if(titleEl)titleEl.textContent='Curators you follow';
      var tset=trendFollowedCurators(ulTrend);
      list.innerHTML=tset.length?tset.map(userRowHTML).join(''):'<div class="stub-d" style="padding:20px 2px;">None you follow here yet.</div>';
      return;
    }
    if(tabs)tabs.style.display='';
    if(titleEl)titleEl.textContent=(ulHandle==='@you'?'People':ulHandle);   // no naked "@you"
    document.querySelectorAll('.ultab').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-ultab')===ulKind);});
    var set=followSet(ulHandle,ulKind);
    list.innerHTML=set.length?set.map(userRowHTML).join(''):'<div class="stub-d" style="padding:20px 2px;">No one yet.</div>';}
  function openFollowList(handle,kind){ulMode='profile';ulHandle=handle;ulKind=kind;userlistReturn=currentScreenKey();
    renderUserList();show('userlist');
    var sa=document.querySelector('#s-userlist .scrollarea');if(sa)sa.scrollTop=0;}
  function openTrendFollows(id){ulMode='trend';ulTrend=id;userlistReturn=currentScreenKey();
    renderUserList();show('userlist');
    var sa=document.querySelector('#s-userlist .scrollarea');if(sa)sa.scrollTop=0;}

  // ===== Post detail + threaded comments =====
  var COMMENTS={
    0:[{id:1,u:"@eloquent",t:"2h",text:"the agent demos sold me, not the chat. quietly replaced three tools.",up:5,replies:[
         {id:2,u:"@jerry",t:"1h",text:"same. it's the default for real work now",up:2,replies:[]}]},
       {id:3,u:"@parlay",t:"1h",text:"benchmarks finally match the vibes",up:3,replies:[]}],
    1:[{id:4,u:"@pacers",t:"4h",text:"if that coastline read is right the map is insane",up:6,replies:[]}],
    2:[{id:5,u:"@dirkdiggler",t:"7h",text:"run club then coffee is the actual meta now",up:3,replies:[]}]
  };
  var postdetailReturn='posts', curPost=0, cmtVotes={}, cmtCounter=6, cmtSort='best', replyTo=null, cmtCollapsed={};
  var CSORT_LABEL={best:'Best',top:'Top',new:'New'};
  function avatarColor(handle,fallbackTrend){var p=PROFILES[handle];if(p&&p.col)return p.col;var lead=(p&&p.leads&&p.leads.length)?p.leads[0]:fallbackTrend;return curOf(lead).col;}
  function safeAvatarImage(src){
    src=String(src||'');
    if(/^media\/[A-Za-z0-9_./-]+$/.test(src)&&src.indexOf('..')<0)return src;
    if(/^data:image\/(?:png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(src))return src;
    return '';
  }
  function avatarImage(handle){var p=PROFILES[handle];return safeAvatarImage(p&&p.img);}
  function avatarVisual(handle,fallbackTrend,imgOverride,colOverride){
    var img=safeAvatarImage(imgOverride===undefined?avatarImage(handle):imgOverride);
    var col=colOverride||avatarColor(handle,fallbackTrend)||'#aab2c8';
    return {img:img,col:col};
  }
  function avatarStyle(handle,fallbackTrend,imgOverride,colOverride){
    var av=avatarVisual(handle,fallbackTrend,imgOverride,colOverride);
    return 'background-color:'+av.col+';background-image:'+(av.img?'url('+av.img+')':'none')+';background-size:cover;background-position:center';
  }
  function paintAvatar(el,handle,fallbackTrend,imgOverride,colOverride){
    if(!el)return;
    var av=avatarVisual(handle,fallbackTrend,imgOverride,colOverride);
    el.style.backgroundColor=av.col;
    el.style.backgroundImage=av.img?'url("'+av.img+'")':'none';
    el.style.backgroundSize='cover';
    el.style.backgroundPosition='center';
  }
  function paintOwnAvatarChrome(){
    paintAvatar(document.getElementById('tab-av'),'@you');
    paintAvatar(document.getElementById('drawer-av'),'@you');
  }
  function cScore(n){var v=cmtVotes[n.id]||'';return n.up+(v==='up'?1:0)-(v==='down'?1:0);}
  function sortNodes(arr){var a=arr.slice();a.sort(function(x,y){
    if(cmtSort==='new')return timeVal(x.t)-timeVal(y.t);
    if(cmtSort==='top')return cScore(y)-cScore(x);
    return (cScore(y)-cScore(x))||(timeVal(x.t)-timeVal(y.t));});return a;}
  function findNode(pid,id){var f=null;(function w(a){(a||[]).forEach(function(n){if(n.id===id)f=n;else w(n.replies);});})(COMMENTS[pid]||[]);return f;}
  function countComments(pid){var c=0;(function w(a){(a||[]).forEach(function(n){c++;w(n.replies);});})(COMMENTS[pid]||[]);return c;}
  function openPost(pid){curPost=pid;postdetailReturn=currentScreenKey();replyTo=null;cmtSort='best';renderPostDetail();show('postdetail');
    var ctx=document.getElementById('pd-ctx');if(ctx)ctx.classList.remove('on');
    var inp=document.getElementById('pd-reply');if(inp){inp.value='';inp.placeholder='Add a comment…';}
    var sa=document.querySelector('#s-postdetail .scrollarea');if(sa)sa.scrollTop=0;}
  function descCount(node){var c=0;(node.replies||[]).forEach(function(r){c+=1+descCount(r);});return c;}
  function commentNodeHTML(node){var v=cmtVotes[node.id]||'',likes=cScore(node);
    var kids='';
    if(node.replies&&node.replies.length){
      if(cmtCollapsed[node.id]){var n=descCount(node);
        kids='<button class="cmt-more" data-ctoggle="'+node.id+'"><span class="pm">+</span>'+n+' more repl'+(n>1?'ies':'y')+'</button>';
      }else{
        kids='<div class="cmt-thread"><button class="thread-rail" data-ctoggle="'+node.id+'" aria-label="Collapse replies"><span class="rail-min">−</span></button>'+
          '<div class="cmt-children">'+sortNodes(node.replies).map(commentNodeHTML).join('')+'</div></div>';
      }
    }
    return '<div class="cmt"><span class="cav" data-user="'+node.u+'" style="'+avatarStyle(node.u,POSTS[curPost].id)+'"></span>'+
      '<div class="cmain"><div class="ctop"><b>'+node.u+'</b><span class="ubadges">'+badgeRow(node.u,3)+'</span> · '+node.t+(node.t==='now'?'':' ago')+'</div>'+
      '<div class="ctext">'+node.text+'</div>'+
      '<div class="cmt-react">'+
        '<span class="cr like'+(v==='up'?' on':'')+'" data-cvote="up" data-cid="'+node.id+'">'+ICON_UP+' '+likes+'</span>'+
        '<span class="cr dislike'+(v==='down'?' on':'')+'" data-cvote="down" data-cid="'+node.id+'">'+ICON_DOWN+'</span>'+
        '<span class="cr" data-creply="'+node.id+'">'+ICON_CMT+' Reply</span>'+
        '<span class="cr" data-share>'+ICON_SHARE+' Share</span></div>'+
      kids+'</div></div>';}
  function renderComments(){var top=COMMENTS[curPost]||[];
    document.getElementById('pd-comments').innerHTML=top.length?sortNodes(top).map(commentNodeHTML).join(''):'<div class="stub-d" style="padding:14px 2px;">No comments yet. Start the thread.</div>';}
  function renderPostDetail(){
    var p=POSTS[curPost], t=T[p.id];
    var v=postVotes[curPost]||'', shown=p.up+(v==='up'?1:0)-(v==='down'?1:0), n=countComments(curPost);
    releaseMediaIn(document.getElementById('pd-content'));
    document.getElementById('pd-content').innerHTML=
      '<div class="pd-post">'+
        '<span class="post-th pd-th" data-go-trend="'+p.id+'"'+(vcount(p.id)?clipAttrs(p.id,(curPost%vcount(p.id))+1,true):'')+' style="background-image:'+(t.img?'url('+t.img+'),':'')+'linear-gradient(135deg,'+t.theme[0]+','+t.theme[2]+');background-size:cover;background-position:center"></span>'+
        '<div class="pd-meta">'+
          '<span class="post-trend" data-go-trend="'+p.id+'">'+t.name+'</span><span class="post-sep">·</span>'+
          userChip(p.u)+'<span class="post-sep">·</span><span class="post-time">'+p.t+' ago</span></div>'+
        (p.title?'<div class="pd-title">'+p.title+'</div>':'')+
        '<div class="pd-body">'+p.text+'</div>'+
        '<div class="post-react"><span class="pr vote up'+(v==='up'?' on':'')+'" data-vote="up" data-pid="'+curPost+'">'+ICON_UP+' '+shown+'</span>'+
          '<span class="pr vote down'+(v==='down'?' on':'')+'" data-vote="down" data-pid="'+curPost+'">'+ICON_DOWN+'</span>'+
          '<span class="pr static">'+ICON_CMT+' '+n+'</span><span class="pr" data-share>'+ICON_SHARE+' Share</span></div></div>'+
      '<div class="pd-cmt-h"><span>'+n+' comments</span><button class="exf exf-inline" id="cmt-sort" data-csortsheet><span id="cmt-sort-lbl">'+CSORT_LABEL[cmtSort]+'</span><svg class="exf-car" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button></div>'+
      '<div id="pd-comments"></div>';
    refreshActiveMedia(document.getElementById('pd-content'));
    renderComments();
  }
  function setReplyTo(cid){replyTo=cid;var node=findNode(curPost,cid);
    document.getElementById('pd-ctx-u').textContent=node?node.u:'';
    document.getElementById('pd-ctx').classList.add('on');
    var inp=document.getElementById('pd-reply');inp.placeholder='Reply to '+(node?node.u:'')+'…';inp.focus();}
  function clearReplyTo(){replyTo=null;document.getElementById('pd-ctx').classList.remove('on');
    document.getElementById('pd-reply').placeholder='Add a comment…';}
  function sendReply(){var inp=document.getElementById('pd-reply'),txt=(inp.value||'').trim();if(!txt)return;
    var node={id:cmtCounter++,u:"@you",t:"now",text:txt,up:0,replies:[]};
    if(replyTo){var parent=findNode(curPost,replyTo);if(parent)(parent.replies=parent.replies||[]).push(node);}
    else{(COMMENTS[curPost]=COMMENTS[curPost]||[]).push(node);}
    inp.value='';clearReplyTo();renderPostDetail();
    var sa=document.querySelector('#s-postdetail .scrollarea');if(sa)sa.scrollTop=sa.scrollHeight;}

  // ===== Compose (new post) — Reddit-style trend picker =====
  var cmpTrend=null, cmpPic=null;   // cmpPic retained as a no-op: posts no longer carry pictures
  function cmpSetPhoto(url){cmpPic=null;
    var prev=document.getElementById('cmp-photo-prev'),img=document.getElementById('cmp-photo-img');
    if(img)img.style.backgroundImage=cmpPic?'url('+cmpPic+')':'';
    if(prev)prev.hidden=!cmpPic;
    var btn=document.getElementById('cmp-photo-btn'); if(btn)btn.classList.toggle('on',!!cmpPic);}
  function setCmpPost(){var btn=document.getElementById('cmp-post'),ttl=(document.getElementById('cmp-title').value||'').trim();
    var ready=!!(cmpTrend&&ttl); btn.dataset.mode=ready?'ready':'disabled';btn.setAttribute('aria-disabled',ready?'false':'true');}
  function cmpRenderOpts(q){q=(q||'').toLowerCase();
    var ids=ORDERS.all.filter(function(id){return !q||T[id].name.toLowerCase().indexOf(q)>=0;});
    var list=document.getElementById('cmp-dd-list'),dd=document.getElementById('cmp-dd');
    releaseMediaIn(list);
    document.getElementById('cmp-dd-list').innerHTML=ids.length?ids.map(function(id){var t=T[id];
      var vid=previewClipId(id),vs=vid?clipAttrs(vid,1,true):'';
      return '<button class="cmp-opt" data-cmptrend="'+id+'"><span class="cmp-opt-media"'+vs+' style="background-image:'+(t.img?'url('+t.img+'),':'')+'linear-gradient(150deg,'+t.theme[0]+','+t.theme[1]+' 55%,'+t.theme[2]+');"></span><span class="cmp-opt-nm">'+t.name+'</span></button>';
    }).join(''):'<div class="cmp-opt-empty">No trends match.</div>';
    if(dd&&!dd.hidden)refreshActiveMedia(dd);}
  function cmpPickTrend(id){cmpTrend=id;var t=T[id];
    document.getElementById('cmp-sel-label').textContent=t.name;
    var sw=document.getElementById('cmp-sel-sw');sw.style.display='block';sw.style.background='linear-gradient(135deg,'+t.theme[0]+','+t.theme[2]+')';
    var dd=document.getElementById('cmp-dd');releaseMediaIn(dd);dd.hidden=true;setCmpPost();
    document.getElementById('cmp-title').focus();}
  var composeReturnTrend=null;   // when set, submitting a post returns to that trend's Posts screen
  function openCompose(){cmpTrend=null;composeReturnTrend=null;
    document.getElementById('cmp-sel-label').textContent='Select trend';
    document.getElementById('cmp-sel-sw').style.display='none';
    document.getElementById('cmp-dd').hidden=true;
    document.getElementById('cmp-search').value='';cmpRenderOpts('');
    document.getElementById('cmp-title').value='';document.getElementById('cmp-text').value='';cmpSetPhoto(null);setCmpPost();
    sheet.classList.remove('open');addsheet.classList.remove('open');cmpsheet.classList.add('open');scrim.classList.add('open');}
  function submitPost(){if(document.getElementById('cmp-post').dataset.mode!=='ready')return;
    var ttl=document.getElementById('cmp-title').value.trim();
    var txt=document.getElementById('cmp-text').value.trim();
    POSTS.push({id:cmpTrend,u:"@you",t:"now",title:ttl,text:txt,up:0,c:0});
    closeAll();postsSort='new';
    if(composeReturnTrend){var rid=composeReturnTrend;composeReturnTrend=null;tcTrend=rid;tcWhen='today';renderTrendPostFeed();show('trendposts');return;}
    renderPosts();show('posts');}

  // ===== Curator: create a trend =====================================================
  // Flow: + -> "Create a trend" -> "What's on your mind?" -> Continue.
  //   On Continue: if the trend already exists -> "already taken" panel.
  //   Otherwise -> a simulated web search returns 2 relevant topics to confirm; if neither fits,
  //   "Not what you were thinking?" sends you back to rewrite. Pick a topic -> add content
  //   (>=1 picture) -> publish -> land on the new trend's page.
  var CT_GALLERY=['agi','chatgpt','claude','anthropic','figureai','elonmusk','coinbase','bearmarket',
    'attentioneconomy','dopaminesites','calisthenics','analog','pokemon','peptides','eggs','gtavi'];
  var ctState={think:'',name:'',pics:[],desc:''}, ctSearchT=null;
  // Dropdown chooser: unfolds from the ＋ that opened it (feed top-right, or the Posts FAB).
  function openCreateChooser(trigger){var s=document.getElementById('createsheet');if(!s)return;
    sheet.classList.remove('open');addsheet.classList.remove('open');cmpsheet.classList.remove('open');
    var t=trigger||document.getElementById('feed-create'), ph=document.getElementById('phone');
    if(t&&ph&&t.getBoundingClientRect){var tr=t.getBoundingClientRect(),pr=ph.getBoundingClientRect();
      s.style.top=Math.max(10,Math.round(tr.bottom-pr.top+10))+'px';
      s.style.right=Math.max(12,Math.round(pr.right-tr.right))+'px';
      s.style.left='auto';s.style.bottom='auto';}
    s.classList.add('open');scrim.classList.add('open');scrim.classList.add('dim-lite');}
  function openCreateTrend(){
    ctState={think:'',name:'',pics:[],desc:''};
    var think=document.getElementById('ct-think');think.value='';
    ctSetDisabled('ct-next',true);
    document.getElementById('ct-title').value='';
    document.getElementById('ct-desc').value='';
    var cf=document.getElementById('ct-file');if(cf)cf.value='';
    ctRenderUploads();
    ctSetDisabled('ct-publish',true);
    ctShowPanel('ideate');
    show('createtrend');
    setTimeout(function(){think.focus();},60);
  }
  function ctSetDisabled(id,off){var b=document.getElementById(id);if(!b)return;
    if(off)b.setAttribute('data-disabled','1');else b.removeAttribute('data-disabled');}
  // Only one create-trend panel is visible at a time: ideate -> (taken | confirm) -> content.
  function ctShowPanel(name){
    ['ideate','taken','confirm','content'].forEach(function(p){
      var el=document.getElementById(p==='ideate'?'ct-step1':p==='content'?'ct-step2':'ct-'+p);
      if(el)el.hidden=(p!==name);
    });
    clearTimeout(ctSearchT);
    var sc=document.getElementById('ct-scroll');if(sc)sc.scrollTop=0;
  }
  // Continue: nothing loads until here. Check for a duplicate first, then confirm the topic.
  function ctContinue(){
    var text=(document.getElementById('ct-think').value||'').trim();
    if(text.length<3)return;
    ctState.think=text;
    var dup=ctFindDup(text);
    if(dup){ ctRenderTaken(dup); ctShowPanel('taken'); return; }
    ctShowPanel('confirm');
    ctRunSearch(text);
  }
  // A trend is "already taken" if the idea and an existing trend name share the name as a WHOLE
  // word/phrase — not a raw substring (which falsely matched "AGI" inside "for-agi-ng").
  function ctWordMatch(hay,needle){
    if(needle.length<3)return false;
    var esc=needle.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    return new RegExp('(^|[^a-z0-9])'+esc+'([^a-z0-9]|$)','i').test(hay);
  }
  function ctFindDup(text){
    var q=text.toLowerCase().trim(),hit=null;
    (ORDERS.all||order).some(function(id){var t=T[id];if(!t||/^coll:/.test(id)||t.kind==='coll')return false;
      var nm=t.name.toLowerCase(); if(nm.length>=3 && (ctWordMatch(q,nm)||ctWordMatch(nm,q))){hit=id;return true;} return false;});
    return hit;
  }
  function ctRenderTaken(id){
    var t=T[id],host=document.getElementById('ct-taken-card');if(!host||!t)return;
    host.innerHTML='<button class="ct-match" data-ctmatch="'+id+'"><span class="ct-match-sw" style="background-image:'+collCover(id)+'"></span>'+
      '<span class="ct-match-id"><span class="ct-match-nm">'+t.name+'</span><span class="ct-match-meta">'+t.fc+' curators · '+Math.round(t.deg)+'°</span></span>'+
      '<span class="ct-match-go">Open ›</span></button>';
  }
  // Simulated "web search": a brief loading state, then two relevant topic candidates to confirm.
  function ctRunSearch(text){
    var host=document.getElementById('ct-search');if(!host)return;
    host.innerHTML='<div class="ct-searching"><span class="ct-spin"></span><span>Searching the web…</span></div>';
    clearTimeout(ctSearchT);
    ctSearchT=setTimeout(function(){
      var topics=ctTopics(text);
      host.innerHTML='<div class="ct-topics">'+topics.map(function(tp){
        return '<button class="ct-topic" data-cttopic="'+encodeURIComponent(tp.name)+'">'+
          '<span class="ct-topic-ic"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3z"/></svg></span>'+
          '<span class="ct-topic-tx"><span class="ct-topic-nm">'+tp.name+'</span><span class="ct-topic-blurb">'+tp.blurb+'</span></span>'+
          '<span class="ct-topic-go">Use ›</span></button>';
      }).join('')+'</div>';
    },820);
  }
  // Derive two plausible topic candidates from the idea (stands in for real web results).
  function ctTopics(text){
    var clean=text.split(/[.\n!?]/)[0].trim();
    var titled=clean.replace(/\b\w/g,function(c){return c.toUpperCase();}).slice(0,44);
    var words=clean.split(/\s+/).filter(Boolean);
    var t1=titled, t2;
    if(words.length>=2){ t2=words.slice(-2).join(' ').replace(/\b\w/g,function(c){return c.toUpperCase();}); }
    else { t2=titled+' Movement'; }
    if(t2.toLowerCase()===t1.toLowerCase()) t2=t1+', Explained';
    var srcA=3+(seedFor(t1)%7), srcB=2+(seedFor(t2)%6);
    return [{name:t1,blurb:srcA+' sources · trending this week'},{name:t2,blurb:srcB+' sources · related topic'}];
  }
  function ctPickTopic(name){ ctGotoContent(name); }
  function ctGotoContent(name){
    ctState.name=(name||ctState.think.split(/[.\n!?]/)[0].trim()).slice(0,48);
    document.getElementById('ct-title').value=ctState.name;
    ctRenderUploads();
    ctShowPanel('content');
    ctUpdatePublish();
  }
  // Upload real photos/videos from the device (no picking from the app's own gallery).
  function ctAddFiles(files){
    Array.prototype.forEach.call(files||[],function(f){
      var kind=(f.type||'').indexOf('video')===0?'video':'image';
      var r=new FileReader();
      r.onload=function(){ ctState.pics.push({url:r.result,kind:kind}); ctRenderUploads(); ctUpdatePublish(); };
      r.readAsDataURL(f);
    });
  }
  function ctRenderUploads(){
    var host=document.getElementById('ct-uploads');if(!host)return;
    host.innerHTML=ctState.pics.map(function(m,i){
      var media=m.kind==='video'
        ? '<video class="ct-up-media" src="'+m.url+'" muted playsinline></video>'
        : '<span class="ct-up-media" style="background-image:url('+m.url+')"></span>';
      return '<div class="ct-up">'+media+(m.kind==='video'?'<span class="ct-up-tag">Video</span>':'')+'<button class="ct-up-x" data-ctrm="'+i+'" aria-label="Remove">✕</button></div>';
    }).join('');
    var pc=document.getElementById('ct-piccount');
    if(pc)pc.textContent=ctState.pics.length?ctState.pics.length+' added':'Add at least 1';
  }
  function ctRemoveUpload(i){ ctState.pics.splice(i,1); ctRenderUploads(); ctUpdatePublish(); }
  function ctUpdatePublish(){
    ctState.name=(document.getElementById('ct-title').value||'').trim();
    ctState.desc=(document.getElementById('ct-desc').value||'').trim();
    ctSetDisabled('ct-publish',!(ctState.name.length>=2 && ctState.pics.length>=1));
  }
  // Submit is NOT an instant create: the trend enters the review queue and the curator lands in
  // the review deck. It goes live only once it clears the promote threshold there.
  function ctPublish(){
    if(!(ctState.name.length>=2 && ctState.pics.length>=1))return;
    var base=ctState.name.toLowerCase().replace(/[^a-z0-9]+/g,'').slice(0,18)||'trend';
    var id='pend-'+base; var k=1; while(PENDING.some(function(p){return p.id===id;})){id='pend-'+base+(++k);}
    PENDING.push({id:id,name:ctState.name,user:'@you',deg:120+seedFor(id)%110,
      coverUrl:ctState.pics[0].url,pics:ctState.pics.slice(),desc:ctState.desc,promotes:1});
    closeAll();
    showToast('Submitted for review · '+ctState.name);
    ctResetForm();          // clear the form so returning to Create starts fresh (no duplicate re-submit)
    openPending(true);      // land on In Review; Back goes to the feed, not the just-submitted form
  }
  // Wipe the create-trend flow back to a blank first step.
  function ctResetForm(){
    ctState={think:'',name:'',pics:[],desc:''};
    var think=document.getElementById('ct-think');if(think)think.value='';
    var tt=document.getElementById('ct-title');if(tt)tt.value='';
    var dd=document.getElementById('ct-desc');if(dd)dd.value='';
    var cf=document.getElementById('ct-file');if(cf)cf.value='';
    ctRenderUploads();
    ctSetDisabled('ct-next',true);
    ctSetDisabled('ct-publish',true);
    ctShowPanel('ideate');
  }
  // Your own submissions, waiting on the community review deck to clear the promote threshold.
  // fromSubmit: reached right after publishing — Back should return to the feed, not the create form.
  function openPending(fromSubmit){show('pending'); if(fromSubmit)navStack=['feed'];}
  function renderPending(){
    var list=document.getElementById('pend-list'); if(!list)return;
    var mine=PENDING.filter(function(p){return p.user==='@you';}).slice().reverse();
    var em=document.getElementById('pend-empty'); if(em)em.style.display=mine.length?'none':'block';
    list.innerHTML=mine.map(function(p){
      var live=!!p.live, pct=Math.min(100,Math.round((p.promotes||0)/RV_THRESHOLD*100));
      var left=Math.max(0,RV_THRESHOLD-(p.promotes||0));
      var status=live
        ? '<span class="pend-status live">● Live now</span>'
        : '<span class="pend-status review">◔ In review · '+left+' promote'+(left===1?'':'s')+' to go live</span>';
      return '<div class="pend-card">'+
          '<span class="pend-thumb" style="background-image:url(\''+p.coverUrl+'\')"></span>'+
          '<div class="pend-info">'+
            '<div class="pend-nm">'+p.name+'</div>'+
            '<div class="pend-meta">'+Math.round(p.deg)+'° · you</div>'+
            '<div class="pend-bar"><span style="width:'+(live?100:pct)+'%"></span></div>'+
            status+
          '</div>'+
        '</div>';
    }).join('');
  }

  // ===== Curator: review deck (Tinder-style promote / discard, vote toward a threshold) =====
  var RV_THRESHOLD=5;
  var PENDING=[
    // Covers borrow a still from the closest real trend — all from media/, no cosmos folder.
    {id:'pend-vertical-ai',name:'Vertical AI Agents',user:'@deepdive',deg:218,coverUrl:'media/agi/p01.jpg',promotes:4},
    {id:'pend-onchain',name:'Onchain Culture',user:'@bluechip',deg:174,coverUrl:'media/coinbase/p01.jpg',promotes:3},
    {id:'pend-metabolic',name:'Metabolic Tracking',user:'@earlybird',deg:190,coverUrl:'media/peptides/p01.jpg',promotes:4},
    {id:'pend-analog',name:'Analog Revival',user:'@nightowl',deg:145,coverUrl:'media/analog/p01.jpg',promotes:2},
    {id:'pend-blindbox',name:'Blind Box Mania',user:'@thelist',deg:160,coverUrl:'media/pokemon/p01.jpg',promotes:1},
    {id:'pend-mine-seed',name:'Silent Walking',user:'@you',deg:131,coverUrl:'media/analog/p02.jpg',promotes:3}
  ];
  var rvQueue=[];
  function pendingReviewCount(){return PENDING.filter(function(p){return p.user!=='@you'&&!p.reviewed&&!p.live;}).length;}
  function openReview(){
    rvQueue=PENDING.filter(function(p){return p.user!=='@you'&&!p.reviewed&&!p.live;});
    show('review');
    renderReviewDeck();
  }
  function rvCoverStyle(c){
    return "background-color:#16161c;background-image:linear-gradient(180deg,rgba(0,0,0,0) 42%,rgba(0,0,0,.72)),url('"+c.coverUrl+"');background-size:cover;background-position:center";
  }
  function renderReviewDeck(){
    var host=document.getElementById('rv-deck'),sub=document.getElementById('rv-sub'),acts=document.getElementById('rv-actions');
    if(!host)return;
    if(!rvQueue.length){
      host.innerHTML='<div class="rv-empty"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg><div class="rv-empty-h">All caught up</div><div class="rv-empty-s">No new trends waiting on your review.</div></div>';
      if(sub)sub.textContent='0 waiting';
      if(acts)acts.style.visibility='hidden';
      return;
    }
    if(acts)acts.style.visibility='';
    if(sub)sub.textContent=rvQueue.length+' waiting';
    var next=rvQueue[1], top=rvQueue[0];
    var pct=Math.min(100,Math.round(top.promotes/RV_THRESHOLD*100));
    var left=Math.max(0,RV_THRESHOLD-top.promotes);
    host.innerHTML=
      (next?'<div class="rv-card peek" style="'+rvCoverStyle(next)+'"></div>':'')+
      '<div class="rv-card" id="rv-top" style="'+rvCoverStyle(top)+'">'+
        '<span class="rv-hint promote" id="rv-hint-p">Promote</span>'+
        '<span class="rv-hint discard" id="rv-hint-d">Discard</span>'+
        '<div class="rv-body">'+
          '<span class="rv-deg">'+Math.round(top.deg)+'°</span>'+
          '<div class="rv-nm">'+top.name+'</div>'+
          '<div class="rv-by">'+top.user+' · new trend</div>'+
          '<div class="rv-tally"><div class="rv-bar"><span style="width:'+pct+'%"></span></div>'+
            '<div class="rv-tally-tx">'+top.promotes+' of '+RV_THRESHOLD+' promotes'+(left?' · '+left+' to go live':' · going live')+'</div></div>'+
        '</div>'+
      '</div>';
    rvAttachDrag();
  }
  // Commit a decision. `fling` (optional) carries the live drag state {dx,dy,vx} so the fly-out
  // continues seamlessly from wherever the finger let go — no jump back to center first.
  var rvBusy=false;
  function rvCommit(dir,fling){
    var c=rvQueue[0]; if(!c||rvBusy)return;
    if(dir==='promote'){
      c.promotes=(c.promotes||0)+1;
      if(c.promotes>=RV_THRESHOLD){ rvGoLive(c); showToast('Promoted · “'+c.name+'” is now live'); }
      else showToast('Promoted · '+c.promotes+'/'+RV_THRESHOLD);
    } else { showToast('Discarded · '+c.name); }
    c.reviewed=true;
    var card=document.getElementById('rv-top');
    function advance(){rvBusy=false;rvQueue.shift();renderReviewDeck();}
    if(!card||prefersReducedMotion()){advance();return;}
    rvBusy=true;
    var w=(card.parentElement&&card.parentElement.clientWidth)||360;
    var quick=fling&&Math.abs(fling.vx||0)>RV_FLICK;
    var tx=(dir==='promote'?1:-1)*Math.round(w*1.35);
    var ty=Math.max(-90,Math.min(90,((fling&&fling.dy)||0)*0.45));
    var rot=(dir==='promote'?1:-1)*(quick?20:15);
    card.style.transition='transform '+(quick?'.30s':'.40s')+' cubic-bezier(.3,.6,.4,1)';
    card.style.transform='translate3d('+tx+'px,'+ty+'px,0) rotate('+rot+'deg)';
    // keep the matching hint lit as the card leaves; promote the peek card into place underneath
    var hint=document.getElementById(dir==='promote'?'rv-hint-p':'rv-hint-d');
    if(hint)hint.style.opacity='1';
    var peek=document.querySelector('#rv-deck .rv-card.peek');
    if(peek){peek.style.transition='transform .36s cubic-bezier(.2,.8,.25,1),filter .36s ease';
      peek.style.transform='scale(1) translateY(0)';peek.style.filter='brightness(1)';}
    setTimeout(advance,quick?280:380);
  }
  function rvGoLive(c){
    c.live=true;
    var id=c.id.replace(/^pend-/,'trend-'); if(T[id])return;
    var pal=FP[seedFor(id)%FP.length];
    T[id]={id:id,name:c.name,kind:'trending',fc:5,deg:c.deg,zone:'Rising',up:true,sent:62,user:c.user,
      chg:Math.max(1,Math.round(c.deg*0.01)),theme:pal,rel:0,media:[{k:'img',n:1}],
      img:c.coverUrl,imgs:(c.pics?c.pics.map(function(p){return p.url;}):[c.coverUrl]),sub:[],byCurator:true};
    if((ORDERS.all||order).indexOf(id)<0){ORDERS.all.unshift(id);order.unshift(id);if(ORDERS.trending)ORDERS.trending.unshift(id);}
  }
  // Drag the top card like Tinder. Pointer deltas are painted once per frame (rAF) to avoid layout
  // thrash. Release under threshold springs back (soft overshoot); over threshold — or a quick
  // flick — flies out from the exact drag position and commits. Hints fade+scale with distance and
  // the peek card grows in underneath, so the whole gesture reads as one continuous motion.
  var RV_FLICK=0.22; // px/ms — a light, quick nudge counts
  // Commit distance is relative to the card and deliberately low: ~12% of the card's width
  // (a thumb's nudge), clamped 32–48px. A short pull left/right is plenty — no need to reach the edge.
  function rvCommitAt(card){ var w=(card&&card.clientWidth)||320; return Math.max(32,Math.min(48,w*0.12)); }
  function rvAttachDrag(){
    var card=document.getElementById('rv-top'); if(!card)return;
    var hp=document.getElementById('rv-hint-p'),hd=document.getElementById('rv-hint-d');
    var peek=document.querySelector('#rv-deck .rv-card.peek');
    var startX=0,startY=0,dx=0,dy=0,drag=false,raf=0,lastX=0,lastT=0,vx=0,commitAt=48;
    function paint(){raf=0;
      var rot=Math.max(-14,Math.min(14,dx*0.055));
      card.style.transform='translate3d('+dx+'px,'+(dy*0.3)+'px,0) rotate('+rot+'deg)';
      var p=Math.min(1,Math.abs(dx)/commitAt), ease=p*p*(3-2*p); // smoothstep — no linear flash
      if(hp){hp.style.opacity=dx>0?ease:0;hp.style.transform='rotate(12deg) scale('+(0.88+0.12*(dx>0?ease:0))+')';}
      if(hd){hd.style.opacity=dx<0?ease:0;hd.style.transform='rotate(-12deg) scale('+(0.88+0.12*(dx<0?ease:0))+')';}
      if(peek)peek.style.transform='scale('+(0.94+0.05*ease)+') translateY('+(14-10*ease)+'px)';
    }
    // Move/up/cancel live on window (not the card) so a release ANYWHERE commits — dragging past
    // the card edge or losing pointer capture no longer strands the gesture and springs it back.
    function onMove(e){if(!drag)return;
      dx=e.clientX-startX;dy=e.clientY-startY;
      var now=performance.now(),dt=Math.max(1,now-lastT);          // exp-smoothed velocity for flick detection
      vx=vx*0.8+((e.clientX-lastX)/dt)*0.2;lastX=e.clientX;lastT=now;
      if(!raf)raf=requestAnimationFrame(paint);}
    function detach(){window.removeEventListener('pointermove',onMove);window.removeEventListener('pointerup',onUp);window.removeEventListener('pointercancel',onCancel);}
    function onUp(e){end(e,false);}
    function onCancel(e){end(e,true);}
    card.addEventListener('pointerdown',function(e){
      if(e.button!=null&&e.button!==0)return;
      if(e.cancelable)e.preventDefault();   // stop text selection / native image drag from hijacking the gesture
      drag=true;startX=e.clientX;startY=e.clientY;dx=0;dy=0;vx=0;lastX=e.clientX;lastT=performance.now();
      commitAt=rvCommitAt(card);
      card.style.transition='none';
      if(hp)hp.style.transition='none'; if(hd)hd.style.transition='none';
      if(peek)peek.style.transition='none';
      card.classList.add('grabbing');try{card.setPointerCapture(e.pointerId);}catch(_){}
      window.addEventListener('pointermove',onMove);window.addEventListener('pointerup',onUp);window.addEventListener('pointercancel',onCancel);});
    function end(e,cancelled){if(!drag)return;drag=false;detach();card.classList.remove('grabbing');
      if(raf){cancelAnimationFrame(raf);raf=0;}
      // Momentum projection: where the card WOULD land ~200ms out. A short-but-moving drag
      // commits even before the raw distance crosses the line — no more "slide it halfway".
      var proj=dx+vx*200;
      var flick=Math.abs(vx)>RV_FLICK&&Math.abs(dx)>8&&((vx>0)===(dx>0));
      var commit=!cancelled&&(Math.abs(dx)>commitAt||Math.abs(proj)>commitAt||flick);
      if(commit){rvCommit(dx>0?'promote':'discard',{dx:dx,dy:dy,vx:vx});}
      else{ // spring back with a soft overshoot
        card.style.transition='transform .42s cubic-bezier(.18,1.2,.34,1)';card.style.transform='';
        [hp,hd].forEach(function(h){if(h){h.style.transition='opacity .22s ease,transform .22s ease';h.style.opacity=0;h.style.transform='';}});
        if(peek){peek.style.transition='transform .3s cubic-bezier(.2,.8,.25,1)';peek.style.transform='';}
      }
      dx=0;dy=0;}
    card.addEventListener('lostpointercapture',function(e){if(drag)end(e,false);});
  }

  var collectionReturn='detail', collCtx={ids:[],assetId:null}, savedColls={};
  var COLL_REOPEN={}; // assetId -> fn() that reopens its collection screen (for position thumbnails)
  // A collection trades like an ETF: one synthetic asset whose degree is the average of its members.
  function ensureCollAssetFromIds(key,name,user,ids){
    var aid='coll:'+key;
    var members=(ids||[]).filter(function(x){return T[x];});
    if(!members.length){T[aid]={id:aid,name:name,deg:0,sent:50,up:true,theme:['#3A4255','#8AA1F2','#6E7BE0'],kind:'coll',user:user||'@you',fc:0,img:null,imgs:null,isColl:true,members:[]};return aid;}
    var sumD=0,sumS=0,ups=0;
    members.forEach(function(x){var m=T[x];sumD+=m.deg;sumS+=(m.sent||50);if(m.up)ups++;});
    var n=members.length, base=T[members[0]];
    // Cover: first member that actually has an image, so collection cards never fall back to a flat
    // gradient (e.g. the Signals position card, which paints t.img).
    var cover=null; for(var mi=0;mi<members.length;mi++){ if(T[members[mi]].img){cover=T[members[mi]].img;break;} }
    T[aid]={id:aid,name:name,deg:Math.round(sumD/n),sent:Math.max(1,Math.min(99,Math.round(sumS/n))),
      up:ups>=n/2,theme:base.theme,kind:'coll',user:user||base.user,fc:n,img:cover,imgs:cover?[cover]:null,isColl:true,members:members};
    return aid;
  }
  // Shared opener: shows the collection screen with a feed-style (masonry) grid of grouped trends.
  function showCollection(title,ids,opts){
    opts=opts||{};
    ids=(ids||[]).filter(function(x){return T[x];});
    var assetId=ensureCollAssetFromIds(opts.key,title,opts.user,ids);
    var reopen=function(){showCollection(title,ids,opts);};
    COLL_REOPEN[assetId]=reopen;
    var isList=!!opts.list;   // user list: untradable, no degree, no signal CTA
    var own=!!opts.own||(isList&&opts.user==='@you');   // your own collection -> editable (even when tradable)
    collCtx={ids:ids,assetId:assetId,reopen:reopen,listKey:own||isList?opts.key:null};
    var a=T[assetId];
    document.getElementById('coll-title').textContent=title;
    document.getElementById('coll-sub').textContent=ids.length+' trend'+(ids.length===1?'':'s')+((!isList&&a.deg)?' · '+a.deg+'° avg':'')+(opts.sub?' · '+opts.sub:'');
    var cd=document.getElementById('coll-deg'); if(cd){cd.textContent=a.deg+'°';cd.className='coll-deg'+(a.up?'':' dn');cd.style.display=isList?'none':'';cd.style.visibility=ids.length?'':'hidden';}
    // One bottom pill (tabbar twin): Save · Signal · Share (· Edit on your own).
    // Signal only on tradable; Save only on collections you DON'T own — your own are yours already.
    var acts=document.getElementById('coll-actions'); if(acts)acts.hidden=!ids.length;
    var sig=document.getElementById('coll-signal'); if(sig)sig.hidden=isList||!ids.length;
    var ced=document.getElementById('coll-edit'); if(ced)ced.hidden=!own;
    var sv=document.getElementById('coll-save'); if(sv){sv.hidden=own;sv.classList.toggle('on',!!savedColls[assetId]);}
    renderCollGallery(ids);
    collectionReturn=currentScreenKey();
    show('collection');
    var gw=document.getElementById('coll-grid-wrap'); if(gw)gw.scrollTop=0;
  }
  function openCollection(trendId,idx){
    var cl=(COLLECTIONS[trendId]||[])[idx]; if(!cl)return;
    var ids=(window.COLL_TRENDS&&COLL_TRENDS[trendId+'#'+idx])||[trendId];
    showCollection(cl.coll,ids,{key:trendId+'#'+idx,user:cl.u,sub:(cl.u&&cl.u!=='@noise'?cl.u:'')});
  }

  // ===== Create / Edit Collection (user, untradable, profile-only) =====
  // Seed @you: collections only. Public = tradable (curator), Private = personal.
  var userLists=[
    {key:'seed-c1',name:'AI Frontier',vis:'public',ids:['agi','claude','chatgpt']},
    {key:'seed-c2',name:'Crypto Pulse',vis:'public',ids:['coinbase','bearmarket','privatecredit']},
    {key:'seed-c3',name:'Body & Habit',vis:'public',ids:['calisthenics','peptides','runclubs']},
    {key:'seed-a1',name:'Weird internet',vis:'private',ids:['dopaminesites','attentioneconomy','irl']},
    {key:'seed-a2',name:'Analog heart',vis:'private',ids:['analog','filmcameras','ninetiesnostalgia']}
  ], nl={name:'',vis:'private',ids:[]}, nlQuery='', nlEditKey=null, favName='Favorites';
  // A few posts authored by @you so the profile's Posts section has content.
  if(typeof POSTS!=='undefined'){POSTS.unshift(
    {id:'vibecoding',u:'@you',t:'3h',title:'The loop is the product',text:'shipped a full feature from one prompt. the loop is the product now.',up:6,c:2},
    {id:'coinbase',u:'@you',t:'1d',title:'Onchain is quietly ripping',text:'onchain volume quietly ripping while everyone looks away.',up:9,c:3},
    {id:'runclubs',u:'@you',t:'2d',title:'The run club is the new bar',text:'saturday morning is the new saturday night. every city has one now.',up:5,c:1}
  );
  // Posts are text only — no user-uploaded pictures.
  POSTS.forEach(function(pp){ delete pp.pic; });
  }
  // ===== ROLE =====
  // Curator  : can create trends, review submissions, and make public (= tradable) collections.
  // User     : browses, signals, publishes posts, and keeps PRIVATE collections only.
  // Flip it in Settings > "Browse as a user". Persisted, because on a phone a stray reload
  // would otherwise snap the demo silently back to Curator.
  var ROLE_KEY='noise.role';
  var IS_CURATOR=true;
  try{ IS_CURATOR=(localStorage.getItem(ROLE_KEY)!=='user'); }catch(e){}
  function setRole(curator){
    IS_CURATOR=!!curator;
    try{ localStorage.setItem(ROLE_KEY, IS_CURATOR?'curator':'user'); }catch(e){}
    applyRole();
  }
  // Everything role-dependent is re-derived here, so a toggle never needs a reload.
  function applyRole(){
    // ＋ : a curator gets the chooser (Trend / Post / Review); a user posts, full stop.
    var fc=document.getElementById('feed-create');
    if(fc)fc.setAttribute('aria-label', IS_CURATOR?'Create':'New post');
    // Profile: no Trends tab for a user — they can't create trends, so it would always be empty.
    var cu=document.querySelector('#pf-tabs [data-pftab="curations"]');
    if(cu)cu.style.display=IS_CURATOR?'':'none';
    if(!IS_CURATOR){
      var pane=document.getElementById('pf-sec-curations');
      if(pane&&!pane.hidden){ try{ pfSetTab('colls'); }catch(e){} }
    }
    // Settings switch reflects the current role.
    var sw=document.getElementById('set-role');
    if(sw)sw.setAttribute('aria-pressed', IS_CURATOR?'false':'true');
    var note=document.getElementById('set-role-note');
    if(note)note.textContent=IS_CURATOR
      ? 'You are a curator: you can create trends, review submissions, and publish tradable collections.'
      : 'You are a user: you can signal, post and keep private collections. Creating and reviewing trends is curator-only.';
  }
  var NL_ADD='<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
  var NL_CHK='<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 6"/></svg>';
  function nlPrep(){   // shared reset of the screen inputs from the current nl state
    var isFav=nlEditKey==='fav';   // editing Favorites
    var edit=!!nlEditKey;
    var nm=document.getElementById('nl-name'); if(nm){nm.value=nl.name||'';nm.readOnly=false;nm.placeholder='Collection name';}
    var sr=document.getElementById('nl-search'); if(sr)sr.value=''; nlQuery='';
    var sw=document.getElementById('nl-searchwrap'); if(sw)sw.setAttribute('hidden','');   // resting state: search icon only
    var stg=document.getElementById('nl-searchtoggle'); if(stg)stg.classList.remove('on');
    nlSyncVis();
    // Private/Public. Favorites is always private; non-curators never see the row at all.
    var vr=document.getElementById('nl-visrow'); if(vr)vr.style.display=(isFav||!IS_CURATOR)?'none':'';
    var ti=document.getElementById('nl-title'); if(ti)ti.textContent=isFav?'Edit Favorites':(edit?'Edit collection':'New collection');
    var cta=document.getElementById('nl-create'); if(cta)cta.textContent=edit?'Save changes':'Create collection';
    var del=document.getElementById('nl-delete'); if(del)del.hidden=!edit||isFav;   // Favorites can't be deleted
    renderNewList();
    nlSetStage('name');
    show('newlist');
    var sc=document.getElementById('nl-scroll'); if(sc)sc.scrollTop=0;
  }
  // Visibility: private -> only you. public -> on your profile AND tradable (curators only).
  function nlSyncVis(){
    var sw=document.getElementById('nl-private');
    if(sw)sw.setAttribute('aria-pressed',nl.vis==='private'?'true':'false');
  }
  function visLabel(vis){ return vis==='private'?'Private':'Public'; }   // Public == tradable
  function openNewCollection(){ nlEditKey=null; nl={name:'',vis:IS_CURATOR?'public':'private',ids:[]}; nlPrep(); }
  function openEditList(rec){ nlEditKey=rec.key; nl={name:rec.name,vis:rec.vis,ids:rec.ids.slice()}; nlPrep(); }
  // Resolve which collection the Edit button edits: a created list, or Favorites.
  function editCollection(key){
    if(key==='fav'){ var favIds=Object.keys(favs).filter(function(id){return favs[id]&&T[id];});
      openEditList({key:'fav',name:favName,vis:'private',ids:favIds}); return; }
    for(var i=0;i<userLists.length;i++){ if(userLists[i].key===key){ openEditList(userLists[i]); return; } }
  }
  function nlRowHTML(id){
    var t=T[id]; if(!t)return '';
    var added=nl.ids.indexOf(id)>=0;
    var sw='background:linear-gradient(135deg,'+t.theme[0]+','+(t.theme[2]||t.theme[1])+')'+(t.img?';background-image:url('+t.img+');background-blend-mode:normal':'');
    return '<button class="nl-row'+(added?' added':'')+'" data-nladd="'+id+'">'+
      '<span class="nl-sw" style="'+sw+';background-size:cover;background-position:center"></span>'+
      '<span class="nl-main"><span class="nl-nm">'+t.name+'</span><span class="nl-deg">'+Math.round(t.deg)+'°</span></span>'+
      '<span class="nl-add">'+(added?NL_CHK:NL_ADD)+'</span></button>';
  }
  function nlRenderChips(){   // selected count + chips + CTA state (cheap; no picker rebuild)
    var head=document.getElementById('nl-selhead');
    if(head)head.textContent=nl.ids.length?(nl.ids.length+' trend'+(nl.ids.length===1?'':'s')+' selected'):'No trends yet';
    var chips=document.getElementById('nl-chips');
    if(chips)chips.innerHTML=nl.ids.map(function(id){var t=T[id];return t?'<button class="nl-thumb" data-nlrm="'+id+'" aria-label="Remove '+t.name+'" title="'+t.name+'" style="'+collCover(id)+'"><span class="nl-thumb-x"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></span></button>':'';}).join('');
    var stack=document.getElementById('nl-stack');
    if(stack)stack.innerHTML=nl.ids.slice(-4).map(function(id){var t=T[id];return t?'<span class="nl-stk" style="'+collCover(id)+'"></span>':'';}).join('');
    nlSyncCTA();
  }
  // Feed-style masonry board of pickable media cards (same cards as Home, plus a +/check toggle).
  function nlBoard(ids){
    var colHtml=['',''], colH=[0,0];
    ids.forEach(function(id,i){
      var t=T[id]; if(!t)return;
      var ar=ratioFor(i), c=colH[0]<=colH[1]?0:1;
      var asImage=([0,2,3].indexOf(i%5)>=0);
      colHtml[c]+=cardHTML(t,id,ar,asImage,nl.ids.indexOf(id)>=0);
      colH[c]+=ar[1]/ar[0];
    });
    return '<div class="nl-board">'+colHtml.map(function(h){return '<div class="feedcol">'+h+'</div>';}).join('')+'</div>';
  }
  function nlRenderPicker(){
    var pk=document.getElementById('nl-picker'); if(!pk)return;
    releaseMediaIn(pk);
    var q=nlQuery.trim().toLowerCase();
    // One seamless board of every trend (added ones just show a check) — feels like the feed.
    var pool=(ORDERS.all||order).filter(function(id){return T[id]&&!/^coll:/.test(id)&&T[id].kind!=='coll'&&(!q||T[id].name.toLowerCase().indexOf(q)>=0);});
    pk.innerHTML=pool.length?nlBoard(pool):'<div class="nl-empty">No trends match that search.</div>';
    observeVids(pk); refreshActiveMedia(pk);
  }
  function renderNewList(){ nlRenderChips(); nlRenderPicker(); }
  // Two-step flow (Cosmos reference): 1) name + privacy toggle  2) full-screen trend picker.
  var nlStage='name';
  function nlSetStage(st){
    nlStage=st;
    var s=document.getElementById('s-newlist');
    if(s){s.classList.toggle('stage-name',st==='name');s.classList.toggle('stage-pick',st==='pick');}
    nlSyncCTA();
    var sc=document.getElementById('nl-scroll'); if(sc)sc.scrollTop=0;
    if(st==='name'){var nm=document.getElementById('nl-name'); if(nm)setTimeout(function(){nm.focus();},60);}
  }
  function nlSyncCTA(){
    var cta=document.getElementById('nl-create'); if(!cta)return;
    var name=((document.getElementById('nl-name')||{}).value||'').trim();
    if(nlStage==='name'){
      cta.textContent='Continue';
      cta.setAttribute('data-disabled',name?'0':'1');
    }else{
      cta.textContent=nlEditKey?'Save changes':'Create collection';
      var ok=!!name && (nlEditKey==='fav' || nl.ids.length>0);
      cta.setAttribute('data-disabled',ok?'0':'1');
    }
  }
  function nlToggle(id){
    var i=nl.ids.indexOf(id); if(i>=0)nl.ids.splice(i,1); else nl.ids.push(id);
    var added=nl.ids.indexOf(id)>=0;
    document.querySelectorAll('#nl-picker [data-nladd="'+id+'"]').forEach(function(card){   // update in place (keeps scroll)
      card.classList.toggle('added',added);
      var p=card.querySelector('.gc-plus');
      if(p){p.classList.toggle('on',added);p.innerHTML=added
        ?'<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 6"/></svg>'
        :'<svg viewBox="0 0 24 24"><path d="M12 6v12M6 12h12"/></svg>';}
    });
    nlRenderChips();
  }
  function openUserList(rec){
    // Platform-surfaced collections are tradable (degree + Signal); private/public stay plain lists.
    showCollection(rec.name,rec.ids,{key:rec.key,user:'@you',sub:visLabel(rec.vis),list:rec.vis==='private',own:true});
    if(navStack[navStack.length-1]==='newlist')navStack.pop();   // back should land on the profile, not the editor
  }
  function refreshProfileColls(){
    if(currentProfile!=='@you')return;var p=PROFILES['@you'];if(!p)return;
    setRail('pf-colls','pf-tn-c','pf-sec-colls',profileCollections('@you',p),true);
  }
  function saveList(){
    var name=((document.getElementById('nl-name')||{}).value||'').trim();
    // Editing Favorites: sync favs to the chosen trends.
    if(nlEditKey==='fav'){
      if(name)favName=name;   // Favorites can be renamed
      for(var k in favs){delete favs[k];}
      nl.ids.forEach(function(id){favs[id]=true;});
      nlEditKey=null; refreshProfileColls(); showToast(favName+' updated');
      var favIds=Object.keys(favs).filter(function(id){return favs[id]&&T[id];});
      showCollection(favName,favIds,{key:'fav',user:'@you',sub:'Private',list:true});
      if(navStack[navStack.length-1]==='newlist')navStack.pop();
      if(navStack[navStack.length-1]==='collection')navStack.pop();
      return;
    }
    if(!name||!nl.ids.length)return;
    var rec;
    if(nlEditKey){
      rec=null; for(var i=0;i<userLists.length;i++){if(userLists[i].key===nlEditKey)rec=userLists[i];}
      if(!rec){nlEditKey=null;return saveList();}
      rec.name=name; rec.vis=nl.vis; rec.ids=nl.ids.slice();
    }else{
      rec={key:'ul'+Date.now(),name:name,vis:nl.vis,ids:nl.ids.slice()};
      userLists.unshift(rec);
    }
    ensureCollAssetFromIds(rec.key,name,'@you',rec.ids);
    var wasEdit=!!nlEditKey; nlEditKey=null;
    refreshProfileColls();
    var noun='Collection';
    showToast(noun+(wasEdit?' updated · ':' created · ')+name);
    openUserList(rec);   // reopens the collection; its guard drops the editor from the back stack
    if(wasEdit&&navStack[navStack.length-1]==='collection')navStack.pop();  // and the pre-edit view, so back = profile
  }
  function deleteList(){
    if(!nlEditKey||nlEditKey==='fav')return;   // Favorites can't be deleted
    var name='';
    userLists=userLists.filter(function(r){if(r.key===nlEditKey){name=r.name;return false;}return true;});
    delete T['coll:'+nlEditKey];
    nlEditKey=null;
    refreshProfileColls();
    showToast('Collection deleted'+(name?' · '+name:''));
    openProfile('@you');
  }
  // Feed-style masonry of trends (same cards as Home) so a collection reads like a mini-feed.
  function renderCollGallery(ids){
    var grid=document.getElementById('coll-grid');
    releaseMediaIn(grid);
    if(!ids.length){grid.innerHTML='<div class="coll-empty">No trends in this collection yet.</div>';return;}
    var colHtml=['',''],colH=[0,0];
    ids.forEach(function(id,i){if(!T[id])return;
      var ar=ratioFor(i),c=colH[0]<=colH[1]?0:1,asImage=([0,2,3].indexOf(i%5)>=0);
      colHtml[c]+=cardHTML(T[id],id,ar,asImage);colH[c]+=ar[1]/ar[0];});
    grid.innerHTML=colHtml.map(function(h){return '<div class="feedcol">'+h+'</div>';}).join('');
    observeVids(grid);
    refreshActiveMedia(grid);
  }
  function openLightbox(grad,cap){document.getElementById('lb-img').style.background=grad;
    document.getElementById('lb-cap').textContent=cap;document.getElementById('lightbox').classList.add('open');}
  function closeLightbox(){document.getElementById('lightbox').classList.remove('open');}

  // ===== Timeline (full event list for a trend) =====
  var timelineReturn='detail';
  function sigRow(s){var isNow=(s.time==='now');return '<div class="sigrow'+(s.live?' sig-live':'')+'" data-art="'+encodeURIComponent(JSON.stringify({src:s.src,head:s.head,time:s.time,dir:s.dir,m:s.m}))+'"><span class="sig-dir '+s.dir+'">'+(s.dir==='up'?'▲':'▼')+'</span>'+
    '<div class="sig-main"><div class="sig-head">'+s.head+'</div><div class="sig-sub">'+(s.live?'<span class="sig-livedot"></span>':'')+s.src+' · '+(isNow?'just now':s.time+' ago')+'</div></div>'+
    '<span class="sig-mag '+s.dir+'">'+(s.dir==='up'?'+':'−')+s.m+'°</span></div>';}
  var articleReturn='timeline';
  function openArticle(s){
    document.getElementById('art-src').textContent=s.src+' · '+s.time+' ago';
    document.getElementById('art-title').textContent=s.head;
    var mv=document.getElementById('art-move');mv.textContent=(s.dir==='up'?'+':'−')+s.m+'°';mv.className='art-move '+(s.dir==='up'?'up':'dn');
    var dir=s.dir==='up'?'pushed the degree up':'pulled the degree down';
    document.getElementById('art-body').innerHTML=
      '<p>'+s.head+'.</p>'+
      '<p>Picked up by <b>'+s.src+'</b> about '+s.time+' ago, this is one of the signals that '+dir+' by <b>'+(s.dir==='up'?'+':'−')+s.m+'°</b> on NOISE.</p>'+
      '<p>Curators flagged it as part of the wider shift around this trend — the kind of moment that moves attention before the mainstream catches on. Read it next to the other moves to see how the momentum is building.</p>'+
      '<p class="art-foot">Sample editorial for the demo. In the live product this opens the original story or clip from '+s.src+'.</p>';
    articleReturn=currentScreenKey();show('article');
    var sa=document.querySelector('#s-article .scrollarea');if(sa)sa.scrollTop=0;}
  function openTimeline(id){var t=T[id];
    var all=timelineFor(id).concat([
      {src:"Substack",head:"A newsletter flags it as one to watch",time:"1w",dir:"up",m:4},
      {src:"Reddit",head:"Early threads start to form",time:"2w",dir:"up",m:3},
      {src:"TikTok",head:"First clips begin circulating",time:"3w",dir:"up",m:2},
      {src:"NOISE",head:t.name+" added to the board",time:"1mo",dir:"up",m:2}]);
    document.getElementById('tl-name').textContent=t.name;
    document.getElementById('tl-list').innerHTML=all.map(sigRow).join('');
    timelineReturn=currentScreenKey();
    show('timeline');
    var sa=document.querySelector('#s-timeline .scrollarea');if(sa)sa.scrollTop=0;
  }

  // ===== Saved + stub destinations (no dead taps) =====
  var savedReturn='feed', stubReturn='feed';
  // Favorites list = the trends you saved. Plain rows — no star (or any other) button hanging
  // off each row; you unsave from the trend page itself.
  // Favorites = two Cosmos-style grids behind tabs: saved trends and saved collections.
  var favTab='trends';
  function favSetTab(k){
    favTab=(k==='colls')?'colls':'trends';
    document.querySelectorAll('#fav-tabs .cprof-tab').forEach(function(b){
      b.setAttribute('aria-current',b.getAttribute('data-favtab')===favTab?'true':'false');});
    renderFavorites();
  }
  function favCardHTML(goId,coverId,title,sub){
    // If the trend has neither a still nor a surviving poster, mount its clip so the card plays
    // rather than sitting as a flat gradient.
    var vs=tileVidAttrs(coverId,1);
    return '<button class="cprof-cc" data-go-trend="'+goId+'">'+
      '<span class="cprof-cc-cover"'+vs+' style="'+collCover(coverId)+'"></span>'+
      '<span class="cprof-cc-t">'+title+'</span>'+
      '<span class="cprof-cc-sub">'+sub+'</span></button>';
  }
  function renderFavorites(){
    var list=document.getElementById('saved-list'); if(!list)return;
    if(favTab==='trends'){
      var ids=order.filter(isFav);
      list.innerHTML=ids.length?ids.map(function(id){var t=T[id];
        return favCardHTML(id,id,t.name,Math.round(t.deg)+'°');}).join('')
        :'<div class="cprof-empty">Nothing saved yet. Tap the bookmark on a trend to keep it here.</div>';
    }else{
      var aids=Object.keys(savedColls).filter(function(a){return savedColls[a]&&T[a];});
      list.innerHTML=aids.length?aids.map(function(a){var c=T[a];
        var mm=(c.members||[]).filter(function(x){return T[x];});
        return favCardHTML(a,mm[0]||a,c.name,mm.length+' trend'+(mm.length===1?'':'s')+(c.user?' · '+c.user:''));}).join('')
        :'<div class="cprof-empty">No collections saved yet. Tap the bookmark on a collection to keep it here.</div>';
    }
  }
  function openSaved(){
    favSetTab(favTab);
    savedReturn=currentScreenKey();show('saved');
    var sa=document.querySelector('#s-saved .scrollarea');if(sa)sa.scrollTop=0;
  }
  function openStub(title){document.getElementById('stub-title').textContent=title||'Coming soon';
    stubReturn=currentScreenKey();show('stub');}

  // ===== Notifications =====
  var subReturn='feed';
  var NOTIFS=[
    {kind:"resolve",icon:"check",iconbg:"#54D9A6",text:"Your <b>Rise</b> call on <b>Claude</b> resolved <b>+240 credits</b>",time:"2h",unread:true,go:{t:"detail",a:"claude"}},
    {kind:"reply",av:"@viceloop",text:"<b>@viceloop</b> replied to your comment on <b>GTA VI</b>",time:"5h",unread:true,go:{t:"post",a:1}},
    {kind:"follow",av:"@thequietedit",text:"<b>@thequietedit</b> started following you",time:"8h",unread:true,go:{t:"profile",a:"@thequietedit"}},
    {kind:"move",icon:"trend",iconbg:"#F2B33D",text:"<b>Humanoid Robots</b> jumped <b>+16°</b> in the last day",time:"1d",unread:false,go:{t:"detail",a:"humanoidrobots"}},
    {kind:"like",av:"@pacers",text:"<b>@pacers</b> and 4 others liked your post",time:"2d",unread:false,go:{t:"post",a:0}}
  ];
  function unreadCount(){return NOTIFS.filter(function(n){return n.unread;}).length;}
  function updateBellDot(){var d=document.querySelector('.bell-dot');if(d)d.style.display=unreadCount()>0?'block':'none';}
  var IC_CHECK='<svg viewBox="0 0 24 24"><path d="M5 12l4 4 10-10"/></svg>';
  var IC_TREND='<svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 7-7M21 8v5M21 8h-5"/></svg>';
  function renderNotifList(){
    document.getElementById('notif-list').innerHTML=NOTIFS.map(function(n,i){
      var av=n.av?('<span class="nf-av" style="'+avatarStyle(n.av,Object.keys(T)[0])+'"></span>')
        :('<span class="nf-av" style="background:'+n.iconbg+'">'+(n.icon==='check'?IC_CHECK:IC_TREND)+'</span>');
      return '<div class="notif'+(n.unread?' unread':'')+'" data-notif="'+i+'">'+av+'<div class="nf-main"><div class="nf-text">'+n.text+'</div><div class="nf-time">'+n.time+' ago</div></div>'+(n.unread?'<span class="nf-dot"></span>':'')+'</div>';
    }).join('')||'<div class="stub-d" style="padding:20px 2px;">No notifications yet.</div>';
  }
  function openNotif(){
    renderNotifList();   // dots persist per-item until the item is tapped (not cleared just by opening)
    subReturn=currentScreenKey();show('notif');
    var sa=document.querySelector('#s-notif .scrollarea');if(sa)sa.scrollTop=0;
  }
  // Tapping a notification marks just that one read (its dot clears), then navigates.
  function notifGo(i){var n=NOTIFS[i];if(!n)return;n.unread=false;renderNotifList();updateBellDot();var g=n.go;
    if(g.t==='detail')openDetail(g.a);else if(g.t==='post')openPost(g.a);else if(g.t==='profile')openProfile(g.a);}

  // ===== Edit profile (avatar / name / bio) =====
  var MY_SW=["#aab2c8","#E0573A","#3FA66A","#9B6BFF","#E48FC0","#36617A","#F2B33D","#19C2C2"];
  var editAvatarImg='',editAvatarCol='#aab2c8';
  function openEdit(){var p=PROFILES['@you'];
    editAvatarImg=avatarImage('@you');editAvatarCol=p.col||'#aab2c8';
    paintAvatar(document.getElementById('edit-av'),'@you',null,editAvatarImg,editAvatarCol);
    document.getElementById('edit-name').value=p.name||'Tadeo';
    document.getElementById('edit-bio').value=p.tag;
    document.getElementById('edit-sw').innerHTML=MY_SW.map(function(c){var on=!editAvatarImg&&c===editAvatarCol;return '<button type="button" class="sw'+(on?' on':'')+'" data-sw="'+c+'" style="background:'+c+'" aria-label="Use '+c+' avatar color" aria-pressed="'+(on?'true':'false')+'"></button>';}).join('');
    subReturn=currentScreenKey();show('editprofile');}
  function uploadAvatar(file){
    if(!file)return;
    if(!/^(image\/png|image\/jpeg|image\/webp|image\/gif)$/i.test(file.type||'')){showToast('Choose a PNG, JPG, WebP, or GIF');return;}
    if(file.size>5*1024*1024){showToast('Choose an image under 5 MB');return;}
    var reader=new FileReader();
    reader.onload=function(){var img=safeAvatarImage(reader.result);if(!img){showToast('Could not use that image');return;}
      editAvatarImg=img;
      document.querySelectorAll('#edit-sw .sw').forEach(function(x){x.classList.remove('on');x.setAttribute('aria-pressed','false');});
      paintAvatar(document.getElementById('edit-av'),'@you',null,editAvatarImg,editAvatarCol);
    };
    reader.onerror=function(){showToast('Could not read that image');};
    reader.readAsDataURL(file);
  }
  function saveEdit(){var p=PROFILES['@you'];
    var nm=(document.getElementById('edit-name').value||'').trim();
    p.name=nm||'Tadeo';p.tag=(document.getElementById('edit-bio').value||'').trim()||'Just getting started on NOISE.';
    p.col=editAvatarCol;if(editAvatarImg)p.img=editAvatarImg;else delete p.img;
    paintOwnAvatarChrome();
    showToast('Profile saved');openProfile('@you');}

  // ===== Help FAQ =====
  var FAQ=[
    {q:"What is a degree?",a:"A trend’s degree (0–700) is its live relevance score — how much real attention and momentum it has right now, set by the community and the signals moving it."},
    {q:"What does it mean to Signal?",a:"Signalling is staking credits on where a trend is heading — Rise or Cool. If the degree moves your way by the lock date, you win credits."},
    {q:"How do credits work?",a:"Credits are the in-app currency you use to signal. You can top up in Credits & wallet. They’re for the demo — no real money moves."},
    {q:"What makes a trend cool down?",a:"Attention fading, no fresh work, time decay, or the real-world signal behind it going quiet. The Moves list shows what pushed each shift."},
  ];
  function openHelp(){
    document.getElementById('faq-list').innerHTML=FAQ.map(function(f,i){
      return '<div class="faq-item" data-faq="'+i+'"><button class="faq-q">'+f.q+'<span class="fq-ic">+</span></button><div class="faq-a"><p>'+f.a+'</p></div></div>';
    }).join('');
    subReturn=currentScreenKey();show('help');
    var sa=document.querySelector('#s-help .scrollarea');if(sa)sa.scrollTop=0;}
  function openSecurity(){subReturn=currentScreenKey();show('security');}
  function openInvite(){subReturn=currentScreenKey();show('invite');}

  // ===== Posts (community posts per trend) =====
  var ICON_UP='<svg viewBox="0 0 24 24"><path d="M7 10v10M7 10l3.2-7a1.8 1.8 0 0 1 3.3 1.4L13 9h5a2 2 0 0 1 2 2.3l-1.1 7A2 2 0 0 1 16.9 20H7z"/></svg>';
  var ICON_DOWN='<svg viewBox="0 0 24 24"><path d="M17 14V4M17 14l-3.2 7a1.8 1.8 0 0 1-3.3-1.4L11 15H6a2 2 0 0 1-2-2.3l1.1-7A2 2 0 0 1 7.1 4H17z"/></svg>';
  var ICON_CMT='<svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.3 7.3L3 21l1.7-6.7A8 8 0 1 1 21 12z"/></svg>';
  var ICON_SHARE='<svg viewBox="0 0 24 24"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13"/></svg>';
  var postsSort='best';
  var postsWhen='today';
  var postsTrendFilter=null;   // when set, the Posts tab shows only this trend's discussion
  // ===== Per-trend discussion (every trend has posts; generate deterministic filler when sparse) =====
  var POST_USERS=['@analog','@nightowl','@basecase','@onchain','@quietloop','@feral','@mainnet','@softlaunch','@delulu','@grail','@lowfloat','@postnut'];
  var POST_TEXTS=['this is heating up faster than people think.','called it three weeks ago, nobody listened.','early but not wrong, watching closely.','everyone i know irl is suddenly talking about this.','underrated how fast this went mainstream.','feels toppy here, watching for a cool-off.','the data doesn’t match the vibes yet, careful.','long-term believer, short-term nervous.','screenshots of this are all over my feed today.','my group chat is completely obsessed rn.','either the floor or i look very dumb soon.','sleeper pick, give it a month.'];
  var POST_TIMES=['1h','3h','5h','9h','14h','1d','2d'];
  var _postsGen={};
  function ensureTrendPosts(id){
    if(_postsGen[id])return; _postsGen[id]=true;
    var have=0; POSTS.forEach(function(p){if(p.id===id)have++;});
    var seed=seedFor(id);
    for(var i=have;i<4;i++){
      POSTS.push({id:id,u:POST_USERS[(seed+i*7)%POST_USERS.length],t:POST_TIMES[(seed+i*3)%POST_TIMES.length],
        text:POST_TEXTS[(seed+i*5)%POST_TEXTS.length],up:4+((seed+i*13)%26),c:(seed+i*11)%9});
    }
  }
  function postsForTrend(id){ ensureTrendPosts(id); var out=[]; POSTS.forEach(function(p,i){if(p.id===id)out.push(i);}); return out; }
  // The poster's live position on this trend (rise/cool), only if they've placed a signal.
  function authorPos(handle,id){
    if(handle==='@you'){for(var i=0;i<positions.length;i++){if(positions[i].id===id&&positions[i].status==='open')return positions[i].dir;}return null;}
    var h=seedFor(handle+'|'+id);
    if(h%20<8)return null;   // ~40% haven't placed a signal
    return (T[id]&&T[id].up)?(h%3===0?'cool':'rise'):(h%3===0?'rise':'cool');
  }
  function dpPostHTML(pi,id){
    var p=POSTS[pi], pos=authorPos(p.u,id);
    var posIco=pos?'<span class="dp-pos '+(pos==='rise'?'up':'dn')+'" aria-label="'+(pos==='rise'?'Holding Rise':'Holding Cool')+'">'+(pos==='rise'?'▲':'▼')+'</span>':'';
    return '<button class="dp-post" data-tpost="'+pi+'">'+
      '<span class="dp-av" style="'+avatarStyle(p.u,id)+'"></span>'+
      '<span class="dp-main">'+
        '<span class="dp-top"><b class="dp-user">'+p.u+'</b>'+posIco+'<span class="dp-dot">·</span><span class="dp-time">'+p.t+'</span></span>'+
        '<span class="dp-text">'+p.text+'</span>'+
        '<span class="dp-react">'+ICON_UP+' '+p.up+'<span class="dp-mdot">·</span>'+ICON_CMT+' '+countComments(pi)+'</span>'+
      '</span>'+
    '</button>';
  }
  function renderTrendPosts(id){
    var host=document.getElementById('d-posts'); if(!host)return;
    var idxs=postsForTrend(id);
    idxs.sort(function(a,b){return postHot(POSTS[b])-postHot(POSTS[a]);});
    host.innerHTML=idxs.slice(0,2).map(function(pi){return dpPostHTML(pi,id);}).join('');
    var all=document.getElementById('dp-all'); if(all){all.textContent='See all '+idxs.length;all.style.display=idxs.length>2?'':'none';}
    var sec=document.getElementById('sec-posts'); if(sec)sec.style.display=idxs.length?'':'none';
  }
  // ===== Infinite collections feed on the trend page (this trend -> related -> broader) =====
  var CF_NAMES=["Ones to watch","The deep cuts","Going mainstream","Underrated picks","Cooling off","Curator's shelf","Blue-chip culture","Early signal","Contrarian bets","Weekend rabbit holes","The it-list","Quiet climbers","Peak hype","Slow burners","Certified movers","Fringe to front","Momentum stack","The watchtower","Cultural blue-chips","Sleeper basket"];
  var CF_CURATORS=["@curated","@deepdive","@signalpick","@thelist","@earlybird","@bluechip","@nightowl","@indexhead","@basecase","@grail","@lowfloat","@mainnet"];
  var cfStore={};
  function cfEntry(tid,n){
    var real=COLLECTIONS[tid]||[];
    if(n<real.length){
      var cl=real[n], members=(window.COLL_TRENDS&&COLL_TRENDS[tid+'#'+n])||[tid];
      members=members.filter(function(m){return T[m];}); if(!members.length)members=[tid];
      var s=0; members.forEach(function(m){s+=T[m].deg;});
      var rpool=members.filter(function(m){return m!==tid;});   // avoid every card showing the current trend
      var rcover=rpool.length?rpool[n%rpool.length]:members[0];
      return {key:'cf:'+tid+'#r'+n,name:cl.coll,members:members,deg:Math.round(s/members.length),curator:cl.u,cover:rcover};
    }
    var g=n-real.length, seed=seedFor(tid+'|cf|'+g);
    var related=(T[tid].sub||[]).map(function(x){return x.id;}).filter(function(m){return T[m];});
    var all=gxPool(), base=(g<8?[tid].concat(related).concat(all):all);
    var size=4+(seed%5), members=[];
    if(g<8)members.push(tid);
    for(var k=0;members.length<size&&k<size*3;k++){var m=base[(seed*(k+3)+g*7)%base.length];if(m&&members.indexOf(m)<0)members.push(m);}
    if(!members.length)members=[tid];
    var s2=0; members.forEach(function(m){s2+=T[m].deg;});
    var gpool=members.filter(function(m){return m!==tid;});   // vary covers so the row isn't repetitive
    var gcover=gpool.length?gpool[(seed>>3)%gpool.length]:members[members.length-1];
    return {key:'cf:'+tid+'#g'+g,name:CF_NAMES[seed%CF_NAMES.length],members:members,deg:Math.round(s2/members.length),
      curator:CF_CURATORS[(seed>>4)%CF_CURATORS.length],cover:gcover};
  }
  // Collections = a finite horizontal carousel (the trend's real collections + a few generated).
  // Exact same form as the profile collection placeholder (.cprof-cc): a clean iPhone 17 Pro
  // cover with the title + meta as text BELOW the cover — no scrim, no overlaid caption.
  function collCarouselCardHTML(e){
    return '<button class="cs-card" data-collfeed="'+e.key+'">'+
      '<span class="cprof-cc-cover" style="'+collCover(e.cover,e.coverFB)+'"></span>'+
      '<span class="cprof-cc-t">'+e.name+'</span>'+
      '<span class="cprof-cc-sub">'+e.deg+'° · '+e.members.length+' trends · '+e.curator+'</span>'+
    '</button>';
  }
  // Jaccard overlap between two member lists — used to keep near-duplicate collections
  // out of the top carousel slots (spec §9: ranked + diversified).
  function cfOverlap(a,b){
    var set={},inter=0; a.forEach(function(x){set[x]=1;});
    b.forEach(function(x){if(set[x])inter++;});
    return inter/Math.max(1,(a.length+b.length-inter));
  }
  function renderCollCarousel(id){
    var host=document.getElementById('d-colls'); if(!host)return;
    cfStore={};
    var real=(COLLECTIONS[id]||[]).length, count=Math.min(10,Math.max(6,real)+2);
    var entries=[];
    // Your own public (tradable) collections that include this trend surface here too.
    userLists.forEach(function(rec){
      if(rec.vis!=='public'||rec.ids.indexOf(id)<0)return;
      var members=rec.ids.filter(function(m){return T[m];}); if(!members.length)return;
      var s=0; members.forEach(function(m){s+=T[m].deg;});
      var pool=members.filter(function(m){return m!==id;});
      entries.push({key:'ul:'+rec.key,name:rec.name,members:members,deg:Math.round(s/members.length),
        curator:'@you',cover:pool.length?pool[0]:members[0],own:true});
    });
    for(var i=0;i<count;i++)entries.push(cfEntry(id,i));
    // Rank by degree (simulated order), then diversify: an entry too similar to one already
    // placed in the top slots gets pushed back so the row's head isn't near-duplicates.
    entries.sort(function(a,b){return b.deg-a.deg;});
    var placed=[],deferred=[];
    entries.forEach(function(e){
      var dup=placed.length<4&&placed.some(function(p){return cfOverlap(p.members,e.members)>0.6;});
      (dup?deferred:placed).push(e);
    });
    entries=placed.concat(deferred);
    // Distinct covers across the row: prefer an unused member per card, else a distinct gradient.
    var used={};
    entries.forEach(function(e,i){
      if(!e.cover||used[e.cover]){
        var alt=e.members.filter(function(m){return m!==id&&!used[m];});
        e.cover=alt.length?alt[i%alt.length]:null;
        if(!e.cover)e.coverFB='linear-gradient(150deg,'+FP[i%FP.length][0]+','+FP[i%FP.length][2]+')';
      }
      if(e.cover)used[e.cover]=1;
    });
    var html='';
    entries.forEach(function(e){cfStore[e.key]=e;html+=collCarouselCardHTML(e);});
    host.innerHTML=html;
    resetDragRail(host);wireDragRail(host);
  }
  // Related = an infinite 2-col masonry of trends: this trend's related trends first, then broader.
  var rfState={id:null,n:0,colH:[0,0],relCount:0}, _rfPool={};
  function relatedPool(id){
    if(_rfPool[id])return _rfPool[id];
    var related=(T[id].sub||[]).map(function(x){return x.id;}).filter(function(m){return T[m]&&m!==id;});
    var all=gxPool().filter(function(m){return m!==id;});
    var seen={},out=[];
    related.forEach(function(m){if(!seen[m]){seen[m]=1;out.push(m);}});
    all.slice().sort(function(a,b){return (seedFor(a+'|'+id)%1000)-(seedFor(b+'|'+id)%1000);})
       .forEach(function(m){if(!seen[m]){seen[m]=1;out.push(m);}});
    _rfPool[id]=out; return out;
  }
  // Related = a horizontal carousel, the same card form as the Collections rail above it.
  // The old scroll-stop break into an infinite "All trends" grid is gone.
  function renderRelatedFeed(id){
    var host=document.getElementById('d-relfeed'); if(!host)return;
    releaseMediaIn(host);
    var pool=relatedPool(id), relCount=Math.min(8,pool.length), cards='';
    for(var i=0;i<relCount;i++){
      var tid=pool[i], t=T[tid]; if(!t)continue;
      cards+='<button class="cs-card" data-go-trend="'+tid+'">'+
        '<span class="cprof-cc-cover" style="'+collCover(tid)+'"></span>'+
        '<span class="cprof-cc-t">'+t.name+'</span>'+
        '<span class="cprof-cc-sub">'+Math.round(t.deg)+'°</span></button>';
    }
    host.innerHTML=cards?('<div class="rf-hd-rel">Related</div>'+
      '<div class="cs-scroll rel-scroll">'+cards+'</div>'):'';
    var rail=host.querySelector('.rel-scroll');if(rail){resetDragRail(rail);wireDragRail(rail);}
  }
  // Profile header collapse (Cosmos): the bar's backdrop goes solid FAST while the big
  // header fades out underneath, so any freeze-frame mid-scroll reads as one clean state -
  // never a double exposure. Everything tracks the finger 1:1 (rAF, no transitions).
  (function(){
    var sa=document.querySelector('#s-profile .scrollarea'), bar=document.getElementById('pfbar');
    if(!sa||!bar)return;
    var hd=null, tick=false;
    function headEls(){
      if(!hd)hd=document.querySelectorAll('#s-profile .cprof-head,#s-profile .cprof-follow,#s-profile .cprof-actions');
      return hd;
    }
    sa.addEventListener('scroll',function(){
      if(tick)return; tick=true;
      requestAnimationFrame(function(){
        tick=false;
        var p=Math.min(1,Math.max(0,(sa.scrollTop-92)/108));   // later trigger: the header gets room to breathe first
        // backdrop solid by the halfway point; content eases in after it
        bar.style.opacity=Math.min(1,p*2);
        var ct=Math.max(0,Math.min(1,(p-.3)/.7));
        for(var i=0;i<bar.children.length;i++){
          bar.children[i].style.opacity=ct;
          bar.children[i].style.transform='translateY('+((1-ct)*7)+'px)';
        }
        // the big header bows out as the bar takes over - nothing bleeds through
        var ho=1-Math.min(1,p*1.35);
        headEls().forEach(function(el){el.style.opacity=p===0?'':String(ho);});
        bar.style.pointerEvents=p>.55?'auto':'none';
        bar.setAttribute('aria-hidden',p>.55?'false':'true');
      });
    },{passive:true});
  })();
  var postVotes={};
  function timeVal(s){var n=parseInt(s,10)||0;if(s.indexOf('mo')>=0)return n*720;if(s.indexOf('w')>=0)return n*168;if(s.indexOf('d')>=0)return n*24;return n;}
  // Hot score: comments weigh 2x upvotes (harder signal), decayed by age so fresh posts surface.
  function postHot(p){return (p.up+2*(p.c||0))/Math.pow(timeVal(p.t)+2,1.5);}
  function renderPosts(){
    var q=((document.getElementById('posts-search')||{}).value||'').trim().toLowerCase();
    var arr=POSTS.slice();
    if(postsTrendFilter){arr=arr.filter(function(p){return p.id===postsTrendFilter;});}
    if(q){arr=arr.filter(function(p){var t=T[p.id];return (p.text+' '+p.u+' '+(t?t.name:'')).toLowerCase().indexOf(q)>=0;});}
    if(postsWhen!=='all'){var lim=postsWhen==='today'?24:postsWhen==='week'?168:720;arr=arr.filter(function(p){return timeVal(p.t)<=lim;});}
    if(postsSort==='new'){arr.sort(function(a,b){return timeVal(a.t)-timeVal(b.t);});}
    else if(postsSort==='top'){arr.sort(function(a,b){return (b.up+2*(b.c||0))-(a.up+2*(a.c||0));});}
    else{arr.sort(function(a,b){return postHot(b)-postHot(a);});} // Hot: engagement decayed by age
    var postsList=document.getElementById('posts-list');releaseMediaIn(postsList);
    var filterBar=(postsTrendFilter&&T[postsTrendFilter])?'<button class="posts-filterbar" id="posts-clearfilter">Posts · <b>'+T[postsTrendFilter].name+'</b><span class="pfx">Clear ✕</span></button>':'';
    postsList.innerHTML=filterBar+arr.map(postCardHTML).join('');
    // Play clips on the post placeholders (only 8 posts, all map to trends with clips).
    var _pl=document.getElementById('posts-list');
    refreshActiveMedia(_pl);
    var pe=document.getElementById('posts-empty'); if(pe)pe.style.display=arr.length?'none':'block';
  }
  // Shared post-card markup, used by the global Posts tab and the per-trend Posts screen.
  function postCardHTML(p){var t=T[p.id];
    var pid=POSTS.indexOf(p), v=postVotes[pid]||'', shown=p.up+(v==='up'?1:0)-(v==='down'?1:0);
    var pvs=vcount(p.id)?clipAttrs(p.id,(pid%vcount(p.id))+1,true):'';
    return '<div class="post" data-post="'+pid+'">'+
      '<span class="post-media" data-go-trend="'+p.id+'"'+pvs+' style="background-image:'+(t.img?'url('+t.img+'),':'')+'linear-gradient(150deg,'+t.theme[0]+','+t.theme[1]+' 55%,'+t.theme[2]+');background-size:cover;background-position:center"></span>'+
      '<div class="post-main">'+
        '<div class="post-top"><span class="post-av" data-user="'+p.u+'" style="'+avatarStyle(p.u,p.id)+'"></span>'+
          '<span class="post-trend" data-go-trend="'+p.id+'">'+t.name+'</span>'+
          '<span class="post-deg" data-go-trend="'+p.id+'">'+t.deg+'°</span><span class="post-sep">·</span>'+
          '<span class="post-u" data-user="'+p.u+'">'+p.u+'</span><span class="ubadges">'+badgeRow(p.u,3)+'</span><span class="post-sep">·</span><span class="post-time">'+p.t+' ago</span></div>'+
        (p.title?'<div class="post-title">'+p.title+'</div>':'')+
        '<div class="post-body">'+p.text+'</div>'+
        '<div class="post-react"><span class="pr vote up'+(v==='up'?' on':'')+'" data-vote="up" data-pid="'+pid+'">'+ICON_UP+' '+shown+'</span>'+
          '<span class="pr vote down'+(v==='down'?' on':'')+'" data-vote="down" data-pid="'+pid+'">'+ICON_DOWN+'</span>'+
          '<span class="pr static">'+ICON_CMT+' '+countComments(pid)+'</span><span class="pr" data-share>'+ICON_SHARE+' Share</span></div>'+
      '</div>'+
    '</div>';
  }
  // ===== Per-trend Posts screen (opened from a trend's "See all") =====
  // A focused feed of one trend's posts. No search — just a timeframe filter, plus open/compose.
  var tcTrend=null, tcWhen='today', tcSort='best';
  function openTrendPostFeed(id){tcTrend=id;tcWhen='today';tcSort='best';show('trendposts');}
  function renderTrendPostFeed(){
    if(!tcTrend)return;
    var arr=POSTS.filter(function(p){return p.id===tcTrend;});
    if(tcWhen!=='all'){var lim=tcWhen==='today'?24:tcWhen==='week'?168:720;arr=arr.filter(function(p){return timeVal(p.t)<=lim;});}
    if(tcSort==='new'){arr.sort(function(a,b){return timeVal(a.t)-timeVal(b.t);});}
    else if(tcSort==='top'){arr.sort(function(a,b){return (b.up+2*(b.c||0))-(a.up+2*(a.c||0));});}
    else{arr.sort(function(a,b){return postHot(b)-postHot(a);});} // Hot: engagement decayed by age
    var list=document.getElementById('tc-list'); if(!list)return; releaseMediaIn(list);
    list.innerHTML=arr.map(postCardHTML).join('');
    refreshActiveMedia(list);
    var nm=document.getElementById('tc-name'); if(nm&&T[tcTrend])nm.textContent=T[tcTrend].name;
    var wl=document.getElementById('tc-when-lbl'), w=POSTWHEN_OPTS.filter(function(o){return o[0]===tcWhen;})[0]; if(wl)wl.textContent=w?w[1]:'Today';
    var sl=document.getElementById('tc-sort-lbl'), s=POSTSORT_OPTS.filter(function(o){return o[0]===tcSort;})[0]; if(sl)sl.textContent=s?s[1]:'Hot';
    var em=document.getElementById('tc-empty'); if(em)em.style.display=arr.length?'none':'block';
  }
  function openTcSheet(which){closeAll();
    if(which==='sort'){var sl=document.getElementById('tcsort-list');
      if(sl)sl.innerHTML=POSTSORT_OPTS.map(function(o){return foptHTML(o[0],o[1],o[2],tcSort===o[0]);}).join('');
      document.getElementById('tcsheet-sort').classList.add('open');}
    else{var el=document.getElementById('tcwhen-list');
      if(el)el.innerHTML=POSTWHEN_OPTS.map(function(o){return foptHTML(o[0],o[1],o[2],tcWhen===o[0]);}).join('');
      document.getElementById('tcsheet-when').classList.add('open');}
    scrim.classList.add('open');}
  var POSTSORT_OPTS=[['best','Hot','Engagement, decayed by age'],['top','Top','Most upvotes + comments'],['new','New','Most recent first']];
  var POSTWHEN_OPTS=[['today','Today','Posted in the last 24 hours'],['week','This week','Past 7 days'],['month','This month','Past 30 days'],['all','All time','Every post']];
  function syncPostsLabels(){
    var s=POSTSORT_OPTS.filter(function(o){return o[0]===postsSort;})[0];
    var w=POSTWHEN_OPTS.filter(function(o){return o[0]===postsWhen;})[0];
    var sl=document.getElementById('posts-sort-lbl'); if(sl)sl.textContent=s?s[1]:'Hot';
    var wl=document.getElementById('posts-when-lbl'); if(wl)wl.textContent=w?w[1]:'Today';
  }
  function renderPostSheets(){
    var sl=document.getElementById('psort-list'); if(sl)sl.innerHTML=POSTSORT_OPTS.map(function(o){return foptHTML(o[0],o[1],o[2],postsSort===o[0]);}).join('');
    var wl=document.getElementById('pwhen-list'); if(wl)wl.innerHTML=POSTWHEN_OPTS.map(function(o){return foptHTML(o[0],o[1],o[2],postsWhen===o[0]);}).join('');
  }
  function openPostSheet(which){closeAll();renderPostSheets();
    var id=which==='sort'?'psheet-sort':'psheet-when';
    document.getElementById(id).classList.add('open'); scrim.classList.add('open');}
  var CSORT_OPTS=[['best','Best','Smartest mix of votes & recency'],['top','Top','Most upvoted first'],['new','New','Most recent first']];
  function openCommentSortSheet(){closeAll();
    var cl=document.getElementById('csort-list');
    if(cl)cl.innerHTML=CSORT_OPTS.map(function(o){return foptHTML(o[0],o[1],o[2],cmtSort===o[0]);}).join('');
    document.getElementById('csheet-sort').classList.add('open'); scrim.classList.add('open');}
  var psi=document.getElementById('posts-search'); if(psi)psi.addEventListener('input',renderPosts);
  var nlsi=document.getElementById('nl-search'); if(nlsi)nlsi.addEventListener('input',function(){nlQuery=this.value||'';renderNewList();});
  var nlni=document.getElementById('nl-name'); if(nlni)nlni.addEventListener('input',nlSyncCTA);
  var ctThink=document.getElementById('ct-think'); if(ctThink)ctThink.addEventListener('input',function(){
    ctSetDisabled('ct-next',(this.value||'').trim().length<3);});
  var ctTitle=document.getElementById('ct-title'); if(ctTitle)ctTitle.addEventListener('input',ctUpdatePublish);
  var ctDesc=document.getElementById('ct-desc'); if(ctDesc)ctDesc.addEventListener('input',ctUpdatePublish);
  var ctFile=document.getElementById('ct-file'); if(ctFile)ctFile.addEventListener('change',function(){ctAddFiles(this.files);this.value='';});
  var editAvatarInput=document.getElementById('edit-avatar-input'); if(editAvatarInput)editAvatarInput.addEventListener('change',function(){uploadAvatar(this.files&&this.files[0]);this.value='';});

  document.addEventListener('click',function(e){
    if(e.target.closest('#prof-back')||e.target.closest('#set-back')||e.target.closest('#saved-back')||e.target.closest('#stub-back')||e.target.closest('#ul-back')||e.target.closest('#pd-back')||e.target.closest('#det-back')||e.target.closest('#notif-back')||e.target.closest('#edit-back')||e.target.closest('#sec-back')||e.target.closest('#help-back')||e.target.closest('#inv-back')||e.target.closest('#sig-back')||e.target.closest('#fc-back')||e.target.closest('#tc-back')||e.target.closest('#pend-back')){goBack(); return;}
    // ---- Create List ----
    var nlrow=e.target.closest('[data-nladd]'); if(nlrow){nlToggle(nlrow.getAttribute('data-nladd')); return;}
    var fvt=e.target.closest('[data-favtab]'); if(fvt){favSetTab(fvt.getAttribute('data-favtab')); return;}
    var pft=e.target.closest('[data-pftab]'); if(pft){pfSetTab(pft.getAttribute('data-pftab')); return;}
    var nlbk=e.target.closest('#nl-back'); if(nlbk){if(nlStage==='pick')nlSetStage('name');else goBack(); return;}
    var nlrm=e.target.closest('[data-nlrm]'); if(nlrm){nlToggle(nlrm.getAttribute('data-nlrm')); return;}
    var nldl=e.target.closest('#nl-delete'); if(nldl){deleteList(); return;}
    var nlcr=e.target.closest('#nl-create'); if(nlcr){if(nlcr.getAttribute('data-disabled')!=='1'){if(nlStage==='name')nlSetStage('pick');else saveList();} return;}
    var ulc=e.target.closest('[data-userlist]'); if(ulc){var uk=ulc.getAttribute('data-userlist');for(var ui=0;ui<userLists.length;ui++){if(userLists[ui].key===uk){openUserList(userLists[ui]);break;}} return;}
    var curc=e.target.closest('[data-curcoll]'); if(curc){var ck=curc.getAttribute('data-curcoll'),chandle=ck.split('#')[0],lib=CUR_LIB[chandle];
      if(lib){var col=lib.colls.filter(function(c){return c.key===ck;})[0]; if(col)showCollection(col.name,col.ids,{key:'curcoll:'+col.key,user:chandle,sub:chandle});} return;}
    var cedit=e.target.closest('#coll-edit'); if(cedit){if(collCtx&&collCtx.listKey)editCollection(collCtx.listKey); return;}
    var cshare=e.target.closest('#coll-share'); if(cshare){showToast('Link copied'); return;}
    var csave=e.target.closest('#coll-save'); if(csave){var aid=collCtx&&collCtx.assetId; if(aid){savedColls[aid]=!savedColls[aid];
      csave.classList.toggle('on',!!savedColls[aid]);showToast(savedColls[aid]?'Collection saved':'Removed from saved');} return;}
    var fg=e.target.closest('[data-feedgo]'); if(fg){openFeedAt(fg.getAttribute('data-feedgo'), parseInt(fg.getAttribute('data-feedidx'),10)); return;}
    var artb=e.target.closest('#art-back'); if(artb){goBack(); return;}
    var art=e.target.closest('[data-art]'); if(art){openArticle(JSON.parse(decodeURIComponent(art.getAttribute('data-art')))); return;}
    var nfr=e.target.closest('[data-notif]'); if(nfr){notifGo(+nfr.getAttribute('data-notif')); return;}
    var fq=e.target.closest('.faq-q'); if(fq){fq.parentElement.classList.toggle('open'); return;}
    var eav=e.target.closest('#edit-avbtn'); if(eav){document.getElementById('edit-avatar-input').click(); return;}
    var esw=e.target.closest('[data-sw]'); if(esw){editAvatarCol=esw.getAttribute('data-sw');editAvatarImg='';document.querySelectorAll('#edit-sw .sw').forEach(function(x){var on=x===esw;x.classList.toggle('on',on);x.setAttribute('aria-pressed',on?'true':'false');});paintAvatar(document.getElementById('edit-av'),'@you',null,'',editAvatarCol); return;}
    var esv=e.target.closest('#edit-save'); if(esv){saveEdit(); return;}
    var icp=e.target.closest('#inv-copy'); if(icp){showToast('Link copied'); return;}
    var ish=e.target.closest('#inv-share'); if(ish){showToast('Share sheet (demo)'); return;}
    var lgt=e.target.closest('[data-logout]'); if(lgt){closeDrawer();showToast('Logged out (demo)');show('feed'); return;}
    var tst=e.target.closest('[data-toast]'); if(tst){showToast(tst.getAttribute('data-toast')); return;}
    var fls=e.target.closest('[data-followlist]'); if(fls){openFollowList(currentProfile,fls.getAttribute('data-followlist')); return;}
    // ===== Profile screen (Cosmos-style) =====
    var pnt=e.target.closest('[data-newtrend]'); if(pnt){openCreateTrend(); return;}
    var pnp=e.target.closest('[data-newpost]'); if(pnp){openCompose(); return;}
    var pup=e.target.closest('.cprof-cc[data-upost]'); if(pup){openPost(+pup.getAttribute('data-upost')); return;}
    var pcoll=e.target.closest('[data-pcoll]'); if(pcoll){var pk=pcoll.getAttribute('data-pcoll');
      if(pk==='favorites'){var favIds=Object.keys(favs).filter(function(id){return favs[id]&&T[id];});showCollection(favName,favIds,{key:'fav',user:'@you',sub:'Private',list:true});}
      else if(pk==='signals')show('forecasts');
      else if(pk==='newcoll')openNewCollection();
      else if(pk==='user'){var up=PROFILES[currentProfile]||{};var uids=((up.leads||[]).concat(up.active||[])).filter(function(id){return T[id];});showCollection((up.name||currentProfile)+' · Trends',uids,{key:'user#'+currentProfile,user:currentProfile,sub:'Public'});}
      return;}
    var pgear=e.target.closest('#prof-gear,#pfbar-gear'); if(pgear){settingsReturn=currentScreenKey();show('settings'); return;}
    var pedit=e.target.closest('#pf-edit,#pfbar-edit'); if(pedit){openEdit(); return;}
    var pchip=e.target.closest('#pfbar-chip'); if(pchip){var psa=document.querySelector('#s-profile .scrollarea');
      if(psa){if(psa.scrollTo)psa.scrollTo({top:0,behavior:'smooth'});else psa.scrollTop=0;} return;}
    var pfb=e.target.closest('#pf-followbtn'); if(pfb){toggleFollow(currentProfile);var on=isFollowing(currentProfile);pfb.classList.toggle('on',on);pfb.textContent=on?'Following':'Follow'; return;}
    var acct=e.target.closest('[data-open-acct]'); if(acct){var ak=acct.getAttribute('data-open-acct');
      if(ak==='signals')show('forecasts');
      else if(ak==='credits')show('forecasts');
      else if(ak==='favorites')openSaved();
      else if(ak==='security')openSecurity();
      else if(ak==='invite')openInvite();
      else if(ak==='help')openHelp();
      return;}
    var ult=e.target.closest('.ultab'); if(ult){ulKind=ult.getAttribute('data-ultab');renderUserList(); return;}
    var fab=e.target.closest('#post-fab'); if(fab){openCompose(); return;}   // Posts page + = new post, nothing else
    // Curator-only. Guarded here too, not just hidden — a user must never land on these screens.
    var ccT=e.target.closest('#cc-trend'); if(ccT){if(!IS_CURATOR)return; closeAll(); openCreateTrend(); return;}
    var ccP=e.target.closest('#cc-post'); if(ccP){closeAll(); openCompose(); return;}
    var ccR=e.target.closest('#cc-review'); if(ccR){if(!IS_CURATOR)return; closeAll(); openReview(); return;}
    var rvbk=e.target.closest('#rv-back'); if(rvbk){goBack(); return;}
    var rvp=e.target.closest('#rv-promote'); if(rvp){rvCommit('promote'); return;}
    var rvd=e.target.closest('#rv-discard'); if(rvd){rvCommit('discard'); return;}
    var ctb=e.target.closest('#ct-back'); if(ctb){goBack(); return;}
    var ctn=e.target.closest('#ct-next'); if(ctn){if(ctn.getAttribute('data-disabled'))return; ctContinue(); return;}
    var cttk=e.target.closest('#ct-taken-back'); if(cttk){ctShowPanel('ideate'); setTimeout(function(){var el=document.getElementById('ct-think');if(el)el.focus();},50); return;}
    var ctrw=e.target.closest('#ct-rewrite'); if(ctrw){ctShowPanel('ideate'); setTimeout(function(){var el=document.getElementById('ct-think');if(el)el.focus();},50); return;}
    var cttp=e.target.closest('#ct-search [data-cttopic]'); if(cttp){ctPickTopic(decodeURIComponent(cttp.getAttribute('data-cttopic'))); return;}
    var ctm=e.target.closest('#s-createtrend [data-ctmatch]'); if(ctm){openDetail(ctm.getAttribute('data-ctmatch')); return;}
    var nlst=e.target.closest('#nl-searchtoggle'); if(nlst){var w=document.getElementById('nl-searchwrap');
      if(w){if(w.hasAttribute('hidden')){w.removeAttribute('hidden');nlst.classList.add('on');var si=document.getElementById('nl-search');if(si)setTimeout(function(){si.focus();},40);}
        else{w.setAttribute('hidden','');nlst.classList.remove('on');var si2=document.getElementById('nl-search');if(si2)si2.value='';nlQuery='';renderNewList();}} return;}
    var ctub=e.target.closest('#ct-upload-btn'); if(ctub){var cf=document.getElementById('ct-file'); if(cf)cf.click(); return;}
    var ctrm=e.target.closest('#ct-uploads [data-ctrm]'); if(ctrm){ctRemoveUpload(+ctrm.getAttribute('data-ctrm')); return;}
    var ctpub=e.target.closest('#ct-publish'); if(ctpub){if(ctpub.getAttribute('data-disabled'))return; ctPublish(); return;}
    // Curator gets the chooser (Trend / Post / Review). A user has only one thing to create,
    // so skip the menu and open the post composer directly.
    var fcreate=e.target.closest('#feed-create');
    if(fcreate){ if(IS_CURATOR)openCreateChooser(fcreate); else openCompose(); return; }
    // Bell lives on the profile — in the expanded header and in the collapsed bar.
    var pnotif=e.target.closest('#prof-notif,#pfbar-notif'); if(pnotif){openNotif(); return;}
    var csl=e.target.closest('#cmp-select'); if(csl){var dd=document.getElementById('cmp-dd');dd.hidden=!dd.hidden;if(!dd.hidden){document.getElementById('cmp-search').focus();refreshActiveMedia(dd);}else{releaseMediaIn(dd);} return;}
    var cx=e.target.closest('#cmp-x'); if(cx){closeAll(); return;}
    var cc=e.target.closest('[data-cmptrend]'); if(cc){cmpPickTrend(cc.getAttribute('data-cmptrend')); return;}
    var cp=e.target.closest('#cmp-post'); if(cp){submitPost(); return;}
    var pds=e.target.closest('#pd-send'); if(pds){sendReply(); return;}
    var cms=e.target.closest('[data-csortsheet]'); if(cms){openCommentSortSheet(); return;}
    var cso=e.target.closest('#csort-list .fopt'); if(cso){cmtSort=cso.getAttribute('data-val');var cl=document.getElementById('cmt-sort-lbl');if(cl)cl.textContent=CSORT_LABEL[cmtSort];closeAll();renderPostDetail(); return;}
    var ctg=e.target.closest('[data-ctoggle]'); if(ctg){var tid=+ctg.getAttribute('data-ctoggle');cmtCollapsed[tid]=!cmtCollapsed[tid];renderComments(); return;}
    var cv=e.target.closest('[data-cvote]'); if(cv){var cid=+cv.getAttribute('data-cid'),cd=cv.getAttribute('data-cvote');cmtVotes[cid]=(cmtVotes[cid]===cd)?'':cd;renderComments(); return;}
    var crp=e.target.closest('[data-creply]'); if(crp){setReplyTo(+crp.getAttribute('data-creply')); return;}
    var ctxx=e.target.closest('#pd-ctx-x'); if(ctxx){clearReplyTo(); return;}
    if(e.target.id==='drawer-scrim'){closeDrawer(); return;}
    var drow=e.target.closest('.dr-row'); if(drow){closeDrawer();
      if(drow.getAttribute('data-user')){openProfile(drow.getAttribute('data-user'));return;}
      if(drow.hasAttribute('data-drawer-add')){show('forecasts');return;}
      if(drow.hasAttribute('data-saved')){openSaved();return;}
      var dopen=drow.getAttribute('data-open'); if(dopen){if(dopen==='security')openSecurity();else if(dopen==='invite')openInvite();else if(dopen==='help')openHelp();return;}
      if(drow.hasAttribute('data-stub')){openStub(drow.getAttribute('data-stub'));return;}
      var dtab=drow.getAttribute('data-tab'); if(dtab){if(dtab==='settings')settingsReturn=currentScreenKey();show(dtab);} return;}
    var dlo=e.target.closest('#dr-logout'); if(dlo){closeDrawer(); showToast('Logged out (demo)'); show('feed'); return;}
    var srl=e.target.closest('.setrow.link'); if(srl){openStub(srl.getAttribute('data-stub')); return;}
    var lbx=e.target.closest('#lb-close'); if(lbx||e.target.id==='lightbox'){closeLightbox(); return;}
    var tile=e.target.closest('.coll-tile'); if(tile){openLightbox(tile.getAttribute('data-grad'),tile.getAttribute('data-lb')); return;}
    var csig=e.target.closest('#coll-signal'); if(csig){if(collCtx&&collCtx.assetId){currentId=collCtx.assetId;openSheet();}return;}
    var chb=e.target.closest('#chart-back'); if(chb){closeChartScreen(); return;}
    var cb=e.target.closest('#coll-back'); if(cb){goBack(); return;}
    var tlb=e.target.closest('#tl-back'); if(tlb){goBack(); return;}
    var tlm=e.target.closest('#d-sigmore'); if(tlm){openTimeline(currentId); return;}
    var col=e.target.closest('[data-collection]'); if(col){openCollection(currentId,+col.getAttribute('data-collection')); return;}
    var cff=e.target.closest('[data-collfeed]'); if(cff){var ce=cfStore[cff.getAttribute('data-collfeed')];
      if(ce)showCollection(ce.name,ce.members,{key:ce.own?ce.key.replace(/^ul:/,''):ce.key,user:ce.curator,sub:ce.curator,own:!!ce.own}); return;}
    var sw=e.target.closest('.switch'); if(sw){var son=sw.getAttribute('aria-pressed')!=='true';sw.setAttribute('aria-pressed',son?'true':'false');
      if(sw.id==='tpsl-on')document.getElementById('tpsl-fields').style.display=son?'':'none';
      if(sw.id==='nl-private')nl.vis=son?'private':'public';
      if(sw.id==='set-motion')document.body.classList.toggle('reduce-motion',son);   // app-wide reduced motion
      // "Browse as a user" ON  => not a curator. Re-derives the whole UI, no reload needed.
      if(sw.id==='set-role'){ setRole(!son); showToast(son?'Browsing as a user':'Browsing as a curator'); }
      return;}
    var vt=e.target.closest('.pr.vote'); if(vt){var pid=vt.getAttribute('data-pid'),d=vt.getAttribute('data-vote');postVotes[pid]=(postVotes[pid]===d)?'':d;renderPosts();if(currentScreenKey()==='postdetail')renderPostDetail();if(currentScreenKey()==='trendposts')renderTrendPostFeed(); return;}
    var flw=e.target.closest('.cb-follow'); if(flw){if(flw.id==='pf-follow'&&flw.dataset.self==='1'){openEdit();return;}
      var fh=flw.getAttribute('data-followtoggle'); if(fh){toggleFollow(fh);var fon=isFollowing(fh);flw.classList.toggle('on',fon);flw.textContent=fon?'Following':'Follow';return;}
      var on=flw.classList.toggle('on');flw.textContent=on?'Following':'Follow'; return;}
    var ac=e.target.closest('[data-addcredits]'); if(ac){openAdd(); return;}
    var rs=e.target.closest('[data-resolve]'); if(rs){openResolveSheet(+rs.getAttribute('data-resolve')); return;}
    var rmode=e.target.closest('[data-resmode]'); if(rmode){setResolveMode(rmode.getAttribute('data-resmode')); return;}
    var sigb=e.target.closest('[data-signal]'); if(sigb){openSignal(+sigb.getAttribute('data-signal')); return;}
    var fadd=e.target.closest('#fc-add'); if(fadd){openAdd(); return;}
    var ftab=e.target.closest('#fc-tabs [data-fctab]'); if(ftab){fcTab=ftab.getAttribute('data-fctab');
      document.querySelectorAll('#fc-tabs .fc-tab').forEach(function(b){b.setAttribute('aria-current',b===ftab?'true':'false');});
      renderForecasts(); return;}
    var fchip=e.target.closest('[data-filtersheet]'); if(fchip){openFilterSheet(fchip.getAttribute('data-filtersheet'));return;}
    var pchip=e.target.closest('[data-postsheet]'); if(pchip){openPostSheet(pchip.getAttribute('data-postsheet'));return;}
    var psopt=e.target.closest('#psort-list .fopt'); if(psopt){postsSort=psopt.getAttribute('data-val');syncPostsLabels();renderPostSheets();closeAll();renderPosts();return;}
    var pwopt=e.target.closest('#pwhen-list .fopt'); if(pwopt){postsWhen=pwopt.getAttribute('data-val');syncPostsLabels();renderPostSheets();closeAll();renderPosts();return;}
    var wopt=e.target.closest('#fwhen-list .fopt'); if(wopt){exFilters.when=wopt.getAttribute('data-val');syncFilterLabels();renderFilterSheets();closeAll();renderExplore();return;}
    var sopt=e.target.closest('#fsort-list .fopt'); if(sopt){exFilters.sort=sopt.getAttribute('data-val');syncFilterLabels();renderFilterSheets();closeAll();renderExplore();return;}
    var fcback=e.target.closest('#floc-back'); if(fcback){locView=null;renderLocSheet();return;}
    var ctopt=e.target.closest('#floc-list .fopt[data-city]'); if(ctopt){exFilters.country=ctopt.getAttribute('data-country');exFilters.city=ctopt.getAttribute('data-city');syncFilterLabels();renderFilterSheets();closeAll();renderExplore();return;}
    var copt=e.target.closest('#floc-list .fopt[data-country]'); if(copt){locView=copt.getAttribute('data-country');renderLocSheet();return;}
    var fv=e.target.closest('[data-fav]'); if(fv){var fid=fv.getAttribute('data-fav');toggleFav(fid);fv.classList.toggle('on',isFav(fid));
      document.querySelectorAll('[data-fav="'+fid+'"]').forEach(function(s){s.classList.toggle('on',isFav(fid));});
      document.querySelectorAll('.pd-act[data-fav="'+fid+'"]').forEach(function(a){a.innerHTML=(isFav(fid)?'Saved':'Save');});
      showToast(isFav(fid)?'Saved to Favorites':'Removed from Favorites');
      if(currentScreenKey()==='saved')renderFavorites(); return;}
    // A username or the "you follow" chip must win over the card's open-trend tap.
    var u=e.target.closest('[data-user]'); if(u){closeDrawer();openProfile(u.getAttribute('data-user')||T[currentId].user); return;}
    var yf=e.target.closest('.nh-follow'); if(yf){var ytp=yf.closest('[data-id]'); openTrendFollows(ytp?ytp.getAttribute('data-id'):currentId); return;}
    var gt=e.target.closest('[data-go-trend]'); if(gt){var gid=gt.getAttribute('data-go-trend');
      if(feedPanSuppress&&gt.getAttribute('data-gx')==='1'){return;} // a drag on the galaxy shouldn't open a tile
      if(/^coll:/.test(gid)){if(COLL_REOPEN[gid]){COLL_REOPEN[gid]();return;}var cm=gid.slice(5).split('#');if(T[cm[0]]){openCollection(cm[0],+cm[1]);}return;}
      if(GX.open)gxClose(true);   // tapping a galaxy tile flies into that trend
      setZoomFrom(gt);openDetail(gid); return;}
    var f=e.target.closest('[data-forecast]'); if(f){
      var tp2=f.closest('.topic'); if(tp2)currentId=tp2.getAttribute('data-id'); openSheet(); return;}
    var go=e.target.closest('[data-go]'); if(go){if(feedPanSuppress&&go.closest('#feed')){return;} var tp3=go.closest('[data-id]'); setZoomFrom(tp3||go); openDetail(tp3?tp3.getAttribute('data-id'):currentId); return;}
    var sh=e.target.closest('[data-share]'); if(sh){showToast('Link copied'); return;}
    var tpo=e.target.closest('[data-tpost]'); if(tpo){openPost(+tpo.getAttribute('data-tpost')); return;}   // trend-page discussion post
    var dpa=e.target.closest('#dp-all'); if(dpa){openTrendPostFeed(currentId); return;}                       // See all -> per-trend Posts screen
    var dpc=e.target.closest('#dp-compose'); if(dpc){openCompose(); cmpPickTrend(currentId); composeReturnTrend=currentId; return;}   // post lands in this trend's dedicated Posts feed
    var rvm=e.target.closest('#rv-mine'); if(rvm){openPending(); return;}                                     // Review deck -> your own submissions in review
    var tcf=e.target.closest('#tc-fab'); if(tcf){openCompose(); cmpPickTrend(tcTrend); composeReturnTrend=tcTrend; return;}  // new post from Posts screen
    var tcw=e.target.closest('[data-tcsheet]'); if(tcw){openTcSheet(tcw.getAttribute('data-tcsheet')); return;}
    var tcwo=e.target.closest('#tcwhen-list .fopt'); if(tcwo){tcWhen=tcwo.getAttribute('data-val');closeAll();renderTrendPostFeed();return;}
    var tcso=e.target.closest('#tcsort-list .fopt'); if(tcso){tcSort=tcso.getAttribute('data-val');closeAll();renderTrendPostFeed();return;}
    var pcf=e.target.closest('#posts-clearfilter'); if(pcf){postsTrendFilter=null; renderPosts(); return;}
    var po=e.target.closest('.post[data-post]'); if(po){openPost(+po.getAttribute('data-post')); return;}
    var tb=e.target.closest('[data-tab]'); if(tb){var tk=tb.getAttribute('data-tab'); if(tk==='posts')postsTrendFilter=null; if(tk==='profile')openProfile('@you'); else show(tk); return;}
  });

  // ---- forecast sheet ----
  var sheet=document.getElementById('sheet'),addsheet=document.getElementById('addsheet'),scrim=document.getElementById('scrim'),cmpsheet=document.getElementById('cmpsheet');
  var sel={dir:'rise',s:100,lev:1,amt:null};
  // resolved stake in credits: custom amount if entered, else the chosen amount
  function stakeAmt(){var v=parseInt(document.getElementById('amt').value,10);return (isNaN(v)||v<0)?0:v;}
  var MOVE=0.20; // reference move for the displayed target; payout scales with the real move at lock
  function openSheet(){var t=T[currentId];
    document.getElementById('amt').value='';
    document.getElementById('sheet-name').textContent=t.name;
    document.getElementById('m-rise').textContent=t.sent+'% backing';
    document.getElementById('m-cool').textContent=(100-t.sent)+'% backing';
    document.getElementById('sheet-bal').textContent=fmt(balance);
    setPro(true); // leverage + TP/SL always available (single surface)
    sheet.classList.add('proticket');
    out(); sheet.classList.add('open'); scrim.classList.add('open');var _fb=document.querySelector('.forecast-bar');if(_fb)_fb.classList.add('under-sheet');}
  function setPro(on){
    document.getElementById('levwrap').style.display=on?'':'none';
    if(!on){sel.lev=1;document.querySelectorAll('#lev .chip').forEach(function(x){x.setAttribute('aria-pressed',x.getAttribute('data-l')==='1'?'true':'false');});
      document.getElementById('tpsl-on').setAttribute('aria-pressed','false');document.getElementById('tpsl-fields').style.display='none';}
    out();}
  // Single surface: leverage + TP/SL are always on the ticket (setPro(true)); tpsl-on and the
  // Settings switches use the delegated '.switch' handler above. There is no Pro/Simple split.
  var settingsReturn='feed';
  document.getElementById('open-settings').addEventListener('click',function(){settingsReturn=currentScreenKey();show('settings');});
  function closeAll(){releaseMediaIn(cmpsheet);var _fb=document.querySelector('.forecast-bar');if(_fb)_fb.classList.remove('under-sheet');sheet.classList.remove('open');addsheet.classList.remove('open');cmpsheet.classList.remove('open');scrim.classList.remove('open');scrim.classList.remove('dim-lite');
    ['fsheet-when','fsheet-sort','fsheet-loc','psheet-sort','psheet-when','tcsheet-sort','tcsheet-when','csheet-sort','ressheet','createsheet'].forEach(function(idd){var el=document.getElementById(idd);if(el)el.classList.remove('open');});}
  scrim.addEventListener('click',closeAll);
  document.getElementById('res-confirm').addEventListener('click',function(){if(this.getAttribute('data-disabled')==='1')return;confirmResolve();});
  document.getElementById('res-limit-in').addEventListener('input',updateResolveCTA);
  document.getElementById('res-limit-clear').addEventListener('click',function(){
    if(curResolve==null)return; var p=positions[curResolve]; if(p)delete p.limit;
    document.getElementById('res-limit-in').value=''; this.hidden=true; updateResolveCTA();
    renderForecasts(); if(curSignal===curResolve&&currentScreenKey()==='signaldetail')openSignal(curResolve);
    showToast('Resting limit removed');});
  document.querySelectorAll('.diropt').forEach(function(b){b.addEventListener('click',function(){
    document.querySelectorAll('.diropt').forEach(function(x){x.classList.remove('active');x.setAttribute('aria-pressed','false');});
    b.classList.add('active');b.setAttribute('aria-pressed','true');sel.dir=b.getAttribute('data-dir');out();});});
  document.querySelectorAll('#lev .chip').forEach(function(c){c.addEventListener('click',function(){
    document.querySelectorAll('#lev .chip').forEach(function(x){x.setAttribute('aria-pressed','false');});c.setAttribute('aria-pressed','true');sel.lev=+c.getAttribute('data-l');out();});});
  document.querySelectorAll('#stake .amt-add').forEach(function(c){c.addEventListener('click',function(){
    var cur=parseInt(document.getElementById('amt').value,10);if(isNaN(cur)||cur<0)cur=0;
    document.getElementById('amt').value=cur+(+c.getAttribute('data-add'));out();});});
  document.getElementById('amt').addEventListener('input',out);
  document.getElementById('tp').addEventListener('input',updateTPSL);
  document.getElementById('sl').addEventListener('input',updateTPSL);
  document.getElementById('sheet-add').addEventListener('click',openAdd);
  function targetDeg(t,dir){return Math.round(t.deg*(dir==='rise'?1+MOVE:1-MOVE));}
  // PnL in credits if the trend reaches degree g (signed: + in your favour, - against)
  function pnlAtDeg(g){var t=T[currentId],stake=stakeAmt(),entry=t.deg;
    if(!stake||!entry||isNaN(g))return null;
    var fav=(sel.dir==='rise')?(g-entry)/entry:(entry-g)/entry;
    return stake*sel.lev*fav;}
  function updateTPSL(){
    var stake=stakeAmt();
    var tp=parseFloat(document.getElementById('tp').value),sl=parseFloat(document.getElementById('sl').value);
    var to=document.getElementById('tp-out'),so=document.getElementById('sl-out');
    if(!to||!so)return;
    // take profit -> win
    if(stake>0&&!isNaN(tp)){var w=pnlAtDeg(tp);
      if(w>0){to.className='tpsl-out win';to.textContent='Win +'+fmt(Math.round(w))+' ◇ (+'+Math.round(w/stake*100)+'%)';}
      else{to.className='tpsl-out muted';to.textContent='Set above entry';}
    }else{to.className='tpsl-out muted';to.textContent='Win —';}
    if(stake>0&&!isNaN(tp)&&sel.dir==='cool'&&pnlAtDeg(tp)<=0)to.textContent='Set below entry';
    // stop loss -> loss (capped at stake = liquidation)
    if(stake>0&&!isNaN(sl)){var l=pnlAtDeg(sl);
      if(l<0){var loss=Math.min(stake,-l),liq=(-l>=stake);so.className='tpsl-out loss';
        so.textContent=(liq?'Liq · ':'')+'Lose -'+fmt(Math.round(loss))+' ◇ (-'+Math.round(loss/stake*100)+'%)';}
      else{so.className='tpsl-out muted';so.textContent=(sel.dir==='rise')?'Set below entry':'Set above entry';}
    }else{so.className='tpsl-out muted';so.textContent='Loss —';}
  }
  function out(){var t=T[currentId],stake=stakeAmt(),profit=Math.round(stake*sel.lev*MOVE),tg=targetDeg(t,sel.dir);
    document.getElementById('out').textContent=fmt(stake>0?stake+profit:0);
    document.getElementById('out-cond').textContent=(sel.dir==='rise'?'reaches ':'falls to ')+tg+'°';
    document.getElementById('sheet-bal').textContent=fmt(balance);
    var pl=document.getElementById('place');
    if(stake<=0){pl.textContent='Signal';pl.dataset.mode='disabled';}
    else if(stake>balance){pl.textContent='Add credits';pl.dataset.mode='add';}
    else{pl.textContent='Signal';pl.dataset.mode='place';}
    pl.setAttribute('aria-disabled',pl.dataset.mode==='disabled'?'true':'false');
    document.getElementById('os-entry').textContent=t.deg+'°';
    document.getElementById('os-liq').textContent=sel.lev>1?Math.round(t.deg*(sel.dir==='rise'?(1-0.9/sel.lev):(1+0.9/sel.lev)))+'°':'—';
    document.getElementById('os-cost').textContent=fmt(stake*sel.lev)+' ◇';
    document.getElementById('os-pay').textContent=fmt(stake>0?stake+profit:0)+' ◇';
    if(pl.dataset.mode==='place'){
      pl.textContent=(sel.dir==='rise'?'Rise':'Cool')+' '+sel.lev+'× · '+fmt(stake)+' ◇';
    }
    updateTPSL();}
  document.getElementById('place').addEventListener('click',function(){
    if(this.dataset.mode==='disabled')return;
    if(this.dataset.mode==='add'){openAdd();return;}
    var t=T[currentId],stake=stakeAmt(),profit=Math.round(stake*sel.lev*MOVE),tg=targetDeg(t,sel.dir);
    ledgerAdd('stake','Placed · '+t.name, -stake);
    positions.unshift({id:currentId,dir:sel.dir,stake:stake,lev:sel.lev,entry:t.deg,target:tg,profit:profit,payout:stake+profit,status:'open',day:LOCK,placedAt:Date.now()});
    setBal();closeAll();show('forecasts');});

  // ---- add credits sheet ----
  var addsel=5000, addCustom=null;
  document.querySelectorAll('#addamt .chip').forEach(function(c){c.addEventListener('click',function(){
    document.querySelectorAll('#addamt .chip').forEach(function(x){x.setAttribute('aria-pressed','false');});c.setAttribute('aria-pressed','true');
    addsel=+c.getAttribute('data-a');addCustom=null;document.getElementById('addamt-custom').value='';updateAddCTA();});});
  document.getElementById('addamt-custom').addEventListener('input',function(){
    var v=parseInt(this.value,10);addCustom=(isNaN(v)||v<=0)?null:v;
    document.querySelectorAll('#addamt .chip').forEach(function(x){x.setAttribute('aria-pressed',(addCustom==null&&+x.getAttribute('data-a')===addsel)?'true':'false');});updateAddCTA();});
  function addAmt(){return (addCustom!=null&&addCustom>0)?addCustom:addsel;}
  function updateAddCTA(){document.getElementById('addconfirm').textContent='Add '+fmt(addAmt())+' ◇';}
  function openAdd(){addCustom=null;document.getElementById('addamt-custom').value='';updateAddCTA();
    sheet.classList.remove('open');addsheet.classList.add('open');scrim.classList.add('open');}
  document.getElementById('addconfirm').addEventListener('click',function(){var amt=addAmt();ledgerAdd('add','Added credits',amt);setBal();closeAll();if(currentScreenKey()==='forecasts')renderForecasts();});

  // ---- compose + reply inputs ----
  document.getElementById('cmp-text').addEventListener('input',setCmpPost);
  document.getElementById('cmp-title').addEventListener('input',setCmpPost);
  document.getElementById('cmp-search').addEventListener('input',function(){cmpRenderOpts(this.value);});
  document.getElementById('pd-reply').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();sendReply();}});

  // ---- forecasts (lifecycle) ----
  var fcTab='open';
  function fmtSigned(n){return (n>=0?'+':'−')+fmt(Math.abs(n));}
  function timeAgoMs(ms){var s=(Date.now()-ms)/1000;var d=Math.floor(s/86400);if(d>0)return d+'d ago';var h=Math.floor(s/3600);if(h>0)return h+'h ago';var m=Math.floor(s/60);if(m>0)return m+'m ago';return 'just now';}
  function openPosCardHTML(p,idx){
    var t=T[p.id],ahead=(p.dir==='rise')===t.up,
    cond=(p.dir==='rise'?'Rise from ':'Cool from ')+(p.entry!=null?p.entry:p.target)+'° → '+p.target+'°';
    return '<div class="pcard"><span class="pos-th" data-go-trend="'+p.id+'"'+(vcount(p.id)?clipAttrs(p.id,1,true):'')+' style="background-image:'+(t.img?'url('+t.img+'),':'')+'linear-gradient(135deg,'+t.theme[0]+','+t.theme[2]+')"></span><div class="pos-body" data-signal="'+idx+'"><div class="prow"><h3>'+t.name+'</h3><span class="dirchip '+p.dir+'">'+(p.dir==='rise'?'Rise ▲':'Cool ▼')+'</span></div>'+
      '<div class="pmeta">'+p.stake+' credits · '+((p.lev||1)>1?(p.lev+'× · '):'')+cond+' · wins ~'+fmt(p.profit!=null?p.profit:(p.payout-p.stake))+'</div>'+
      '<div class="pstate"><span class="when">'+(p.limit!=null?'<span class="pos-limit">limit @ '+p.limit+'°</span> · ':'')+(ahead?'currently ahead':'currently behind')+'</span>'+
      '<button class="btn-resolve" data-resolve="'+idx+'">Resolve</button></div></div></div>';
  }
  function renderForecasts(){
    var openStake=0;positions.forEach(function(p){if(p.status==='open')openStake+=p.stake;});
    var bb=document.getElementById('fc-bal');if(bb)bb.textContent=fmt(balance);
    document.getElementById('fc-stake').textContent=fmt(openStake);
    var pl=netPL(),ple=document.getElementById('fc-pl');ple.textContent=fmtSigned(pl);ple.className='ws-v '+(pl>0?'up':pl<0?'dn':'');
    document.getElementById('fc-rec').textContent=record.won+'–'+record.lost;
    // OPEN positions
    var open=positions.filter(function(p){return p.status==='open';});
    var oh='';
    if(!open.length){oh='<div class="fc-blank"><p>No open signals.<br><span>Find a topic you have a read on and forecast where it\'s heading.</span></p><button class="cta-place" data-tab="feed" style="width:auto;padding:11px 18px;border-radius:var(--r-md);">Open Home</button></div>';}
    positions.forEach(function(p,idx){ if(p.status==='open')oh+=openPosCardHTML(p,idx); });
    releaseMediaIn(document.getElementById('fc-open'));
    document.getElementById('fc-open').innerHTML=oh;
    refreshActiveMedia(document.getElementById('fc-open'));
    // HISTORY (ledger, newest first)
    var hh='';
    ledger.slice().reverse().forEach(function(e){
      var cls=e.kind==='win'?'up':(e.kind==='loss'||e.kind==='stake')?(e.kind==='loss'?'dn':''):'';
      var sign=e.delta>0?'up':e.delta<0?'dn':'';
      hh+='<div class="ledrow"><div class="led-ic '+e.kind+'">'+ledIcon(e.kind)+'</div>'+
        '<div class="led-main"><div class="led-lbl">'+e.label+'</div><div class="led-sub">'+timeAgoMs(e.t)+' · balance '+fmt(e.bal)+' ◇</div></div>'+
        '<div class="led-delta '+sign+'">'+(e.delta===0?'—':fmtSigned(e.delta))+'</div></div>';
    });
    document.getElementById('fc-history').innerHTML=hh;
    // tab visibility
    document.getElementById('fc-open').hidden=(fcTab!=='open');
    document.getElementById('fc-history').hidden=(fcTab!=='history');
  }
  function ledIcon(kind){
    if(kind==='add')return '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
    if(kind==='win')return '<svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>';
    if(kind==='loss')return '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    if(kind==='stake')return '<svg viewBox="0 0 24 24"><path d="M12 3v18M3 12h18" opacity=".0"/><circle cx="12" cy="12" r="7"/></svg>';
    return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/></svg>';
  }
  function resolvePos(i){var p=positions[i];if(!p||p.status!=='open')return;var t=T[p.id];var win=(p.dir==='rise')===t.up;
    if(win){ledgerAdd('win','Won · '+t.name, p.payout - p.stake);record.won++;p.status='won';p.settledAt=Date.now();}
    else{ledgerAdd('loss','Lost · '+t.name, -p.stake);record.lost++;p.status='lost';p.settledAt=Date.now();}
    setBal();renderForecasts();renderProfileSignals('@you');   // refresh both surfaces so the closed signal leaves the profile tab too
    if(curSignal===i&&currentScreenKey()==='signaldetail')openSignal(i);}

  // ---- resolve sheet: close at market, or rest a limit price (separate from TP/SL) ----
  var curResolve=null, resMode='market';
  function setResolveMode(m){
    resMode=m;
    document.querySelectorAll('#ressheet .res-opt').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-resmode')===m);});
    document.getElementById('res-market').style.display=(m==='market')?'':'none';
    document.getElementById('res-limit').style.display=(m==='limit')?'':'none';
    updateResolveCTA();
  }
  function updateResolveCTA(){
    var cta=document.getElementById('res-confirm');
    if(resMode==='market'){cta.textContent='Close at market';cta.removeAttribute('data-disabled');cta.setAttribute('aria-disabled','false');}
    else{var v=parseFloat(document.getElementById('res-limit-in').value);
      var ok=!isNaN(v)&&v>0;
      cta.textContent=ok?'Rest limit @ '+v+'°':'Set a degree';
      cta.setAttribute('data-disabled',ok?'0':'1');cta.setAttribute('aria-disabled',ok?'false':'true');}
  }
  function openResolveSheet(idx){
    var p=positions[idx]; if(!p||p.status!=='open')return; var t=T[p.id];
    curResolve=idx;
    var ahead=(p.dir==='rise')===t.up, profit=(p.profit!=null?p.profit:(p.payout-p.stake));
    document.getElementById('res-name').textContent=t.name;
    document.getElementById('res-now').textContent=Math.round(t.deg)+'°';
    var pnl=document.getElementById('res-pnl');
    pnl.textContent=(ahead?'+'+fmt(profit):'−'+fmt(p.stake))+' ◇';
    pnl.className=ahead?'up':'dn';
    var li=document.getElementById('res-limit-in'), clr=document.getElementById('res-limit-clear');
    li.value=(p.limit!=null?p.limit:'');
    clr.hidden=(p.limit==null);
    document.getElementById('res-limit-out').textContent=(p.dir==='rise'
      ? 'Order rests until the degree climbs to your price, then closes.'
      : 'Order rests until the degree falls to your price, then closes.');
    setResolveMode('market');
    closeAll(); document.getElementById('ressheet').classList.add('open'); scrim.classList.add('open');
  }
  function confirmResolve(){
    if(curResolve==null)return; var p=positions[curResolve]; if(!p)return;
    if(resMode==='market'){ resolvePos(curResolve); closeAll(); return; }
    var v=parseFloat(document.getElementById('res-limit-in').value);
    if(isNaN(v)||v<=0)return;
    p.limit=Math.round(v);
    closeAll(); renderForecasts(); renderProfileSignals('@you');
    if(curSignal===curResolve&&currentScreenKey()==='signaldetail')openSignal(curResolve);
    showToast('Limit set — closes automatically at '+p.limit+'°');
  }

  // ===== Single signal (position) detail — built for a trader, simplified =====
  var curSignal=null, signalReturn='forecasts';
  function openSignal(idx){
    var p=positions[idx]; if(!p)return; var t=T[p.id];
    curSignal=idx; signalReturn=currentScreenKey();
    var rise=p.dir==='rise';
    var entry=(p.entry!=null?p.entry:p.target);
    var nowDeg=Math.round(t.deg);
    var target=p.target;
    var profit=(p.profit!=null?p.profit:(p.payout-p.stake));
    var payout=p.stake+profit;
    var lev=p.lev||1;
    var roi=Math.round(profit/p.stake*100);
    // progress from entry -> target, clamped 0..100
    var span=Math.abs(target-entry)||1;
    var moved=rise?(nowDeg-entry):(entry-nowDeg);
    var prog=Math.max(0,Math.min(100,Math.round(moved/span*100)));
    var ahead=(p.dir==='rise')===t.up;
    // unrealized: simple model — fraction of profit earned by progress, or -stake risk
    var unreal=ahead?Math.round(profit*(prog/100)):-Math.round(p.stake*Math.min(1,(100-prog)/100)*0.5);
    var dirColor=rise?'var(--up)':'var(--down)';
    var statusTxt=ahead?'On track':'Off track';
    var html=''+
      '<div class="sig-hero">'+
        '<span class="sig-th" data-go-trend="'+p.id+'"'+(vcount(p.id)?clipAttrs(p.id,1,true):'')+' style="background-image:'+(t.img?'url('+t.img+'),':'')+'linear-gradient(135deg,'+t.theme[0]+','+t.theme[2]+')"></span>'+
        '<div class="sig-htext">'+
          '<div class="sig-trend" data-go-trend="'+p.id+'">'+t.name+'</div>'+
          '<div class="sig-chips"><span class="dirchip '+p.dir+'">'+(rise?'Rise ▲':'Cool ▼')+'</span>'+
            (lev>1?'<span class="sig-lev">'+lev+'×</span>':'')+
            '<span class="sig-status '+(ahead?'up':'dn')+'">'+statusTxt+'</span></div>'+
        '</div>'+
      '</div>'+
      // headline P&L
      '<div class="sig-pnl">'+
        '<div class="sig-pnl-k">Unrealized P&amp;L</div>'+
        '<div class="sig-pnl-v '+(unreal>=0?'up':'dn')+'">'+(unreal>=0?'+':'−')+fmt(Math.abs(unreal))+' <span>◇</span></div>'+
        '<div class="sig-pnl-sub">'+(ahead?'Currently ahead of your call':'Currently behind your call')+'</div>'+
      '</div>'+
      // the call: entry -> now -> target with progress
      '<div class="sig-card">'+
        '<div class="sig-card-h">The call</div>'+
        '<div class="sig-degs">'+
          '<div class="sig-deg"><span class="k">Entry</span><span class="v">'+entry+'°</span></div>'+
          '<svg class="sig-arrow" viewBox="0 0 24 24"><path d="M4 12h15M13 6l6 6-6 6"/></svg>'+
          '<div class="sig-deg"><span class="k">Target</span><span class="v" style="color:'+dirColor+'">'+target+'°</span></div>'+
        '</div>'+
        '<div class="sig-track"><div class="sig-track-fill '+(ahead?'up':'dn')+'" style="width:'+prog+'%"></div>'+
          '<div class="sig-track-now" style="left:'+prog+'%"><span>now '+nowDeg+'°</span></div></div>'+
        '<div class="sig-track-meta"><span>'+prog+'% to target</span><span>'+(rise?'needs +':'needs −')+Math.max(0,Math.abs(target-nowDeg))+'°</span></div>'+
      '</div>'+
      // trade stats grid
      '<div class="sig-grid">'+
        '<div class="sig-stat"><div class="k">Stake</div><div class="v">'+fmt(p.stake)+' ◇</div></div>'+
        '<div class="sig-stat"><div class="k">To win</div><div class="v up">+'+fmt(profit)+' ◇</div></div>'+
        '<div class="sig-stat"><div class="k">Payout</div><div class="v">'+fmt(payout)+' ◇</div></div>'+
        '<div class="sig-stat"><div class="k">Return</div><div class="v up">+'+roi+'%</div></div>'+
      '</div>'+
      // resolution
      '<div class="sig-card">'+
        '<div class="sig-card-h">Resolution</div>'+
        '<div class="sig-rrow"><span>Resolves</span><b>Only when you close it</b></div>'+
        (p.limit!=null?'<div class="sig-rrow"><span>Resting limit</span><b class="up">Close @ '+p.limit+'°</b></div>':'')+
        '<div class="sig-rrow"><span>If you close now</span><b class="'+(ahead?'up':'dn')+'">'+(ahead?'Win +'+fmt(profit):'Lose −'+fmt(p.stake))+' ◇</b></div>'+
        '<div class="sig-rrow"><span>Direction</span><b>'+(rise?'Rise — degree climbs':'Cool — degree falls')+'</b></div>'+
      '</div>'+
      // actions
      '<div class="sig-actions">'+
        '<button class="cta-place" data-resolve="'+idx+'">Resolve</button>'+
        '<button class="sig-viewtrend" data-go-trend="'+p.id+'">View trend</button>'+
      '</div>';
    releaseMediaIn(document.getElementById('sig-content'));
    document.getElementById('sig-content').innerHTML=html;
    refreshActiveMedia(document.getElementById('sig-content'));
    show('signaldetail');
    var sa=document.getElementById('sig-scroll'); if(sa)sa.scrollTop=0;
  }

  function renderTaste(){var resolved=record.won+record.lost,open=positions.filter(function(p){return p.status==='open';}).length;
    var rk=document.getElementById('t-rank'),acc=document.getElementById('t-acc'),pos=document.getElementById('t-pos'),sub=document.getElementById('t-sub');
    if(resolved>0){var a=(record.won/resolved),rank=Math.max(4,312-record.won*55);
      rk.innerHTML='#'+rank+' <small>of 1,312</small>';
      acc.innerHTML='<b>'+a.toFixed(2)+'</b> accuracy · '+record.won+' won · '+record.lost+' lost';
      pos.textContent=String(rank).padStart(2,'0');sub.textContent=a.toFixed(2)+' accuracy · '+resolved+' settled';
    }else if(open>0){rk.innerHTML='—';acc.textContent=open+' open call'+(open>1?'s':'')+' — resolve them to build your record.';pos.textContent='—';sub.textContent=open+' open, none settled';}
    else{rk.innerHTML='—';acc.textContent='Forecast to start your track record.';pos.textContent='—';sub.textContent='unranked';}}

  function kickVideos(){document.querySelectorAll('.screen.active video').forEach(function(v){v.muted=true;var q=v.play&&v.play();if(q&&q.catch)q.catch(function(){});});}
  document.addEventListener('pointerdown',kickVideos);document.addEventListener('click',kickVideos);

  // ===== All / Trending / Niche switcher =====
  function moveSeg(){} // seamless switcher uses a CSS underline on the active label; no sliding pill to position
  function openDrawer(){document.getElementById('drawer').classList.add('open');document.getElementById('drawer-scrim').classList.add('open');}
  function closeDrawer(){document.getElementById('drawer').classList.remove('open');document.getElementById('drawer-scrim').classList.remove('open');}
  document.getElementById('feed-menu').addEventListener('click',toggleFeedZoom);
  (function bindFeedZoomGestures(){
    // ⌘/Ctrl + wheel (trackpad pinch) toggles the galaxy in/out.
    feed.addEventListener('wheel',function(e){ if(!(e.ctrlKey||e.metaKey))return; e.preventDefault();
      nudgeZoom(Math.max(-0.25,Math.min(0.25,e.deltaY*0.012))); },{passive:false});
    // iOS Safari pinch
    var gPrev=1;
    feed.addEventListener('gesturestart',function(e){e.preventDefault();gPrev=e.scale||1;});
    feed.addEventListener('gesturechange',function(e){e.preventDefault();var sc=e.scale||1,r=sc/(gPrev||1);gPrev=sc;nudgeZoom(-(r-1)*1.3);});
    feed.addEventListener('gestureend',function(e){e.preventDefault();scheduleSettle();});

    // ===== Galaxy canvas navigation =====
    // Plain wheel pans the board; ⌘/Ctrl+wheel (or pinch-in) closes it.
    galaxyEl.addEventListener('wheel',function(e){ e.preventDefault();
      if(e.ctrlKey||e.metaKey){ nudgeZoom(Math.max(-0.25,Math.min(0.25,e.deltaY*0.012))); return; }
      cancelAnimationFrame(GX.raf); gxPanBy(-e.deltaX,-e.deltaY);
    },{passive:false});
    // pinch-in on the board closes it (Safari + touch fallback)
    var gP2=1;
    galaxyEl.addEventListener('gesturestart',function(e){e.preventDefault();gP2=e.scale||1;});
    galaxyEl.addEventListener('gesturechange',function(e){e.preventDefault();var sc=e.scale||1,r=sc/(gP2||1);gP2=sc;nudgeZoom(-(r-1)*1.3);});
    // drag / flick to pan, with momentum; a real drag suppresses the tile tap
    var drag=null,last=null;
    function down(x,y){ cancelAnimationFrame(GX.raf); drag={x:x,y:y,moved:false}; last={x:x,y:y,t:Date.now()}; GX.vx=GX.vy=0; }
    function move(x,y){ if(!drag)return; var dx=x-drag.x,dy=y-drag.y; if(Math.abs(dx)+Math.abs(dy)>4)drag.moved=true;
      var now=Date.now(),dt=Math.max(1,now-last.t); GX.vx=(x-last.x)/dt*16; GX.vy=(y-last.y)/dt*16; last={x:x,y:y,t:now};
      gxPanBy(x-drag.x,y-drag.y); drag.x=x; drag.y=y; }
    function up(){ if(!drag)return; if(drag.moved){ feedPanSuppress=true; setTimeout(function(){feedPanSuppress=false;},90);
        if(Math.abs(GX.vx)>1||Math.abs(GX.vy)>1)gxMomentum(); } drag=null; }
    galaxyEl.addEventListener('pointerdown',function(e){ if(e.pointerType==='touch')return; down(e.clientX,e.clientY); });
    window.addEventListener('pointermove',function(e){ if(drag&&e.pointerType!=='touch')move(e.clientX,e.clientY); });
    window.addEventListener('pointerup',function(e){ if(e.pointerType!=='touch')up(); });
    galaxyEl.addEventListener('touchstart',function(e){ if(e.touches.length===1){var t=e.touches[0];down(t.clientX,t.clientY);} },{passive:true});
    galaxyEl.addEventListener('touchmove',function(e){ if(e.touches.length===1&&drag){var t=e.touches[0];move(t.clientX,t.clientY);e.preventDefault();} },{passive:false});
    galaxyEl.addEventListener('touchend',function(e){ if(e.touches.length===0)up(); });
  })();
  // One feed. Trending/Niche is gone — every trend lives in a single surface ordered by degree.
  function setSwitcher(){
    renderFeed('all');
    kickVideos();
  }

  renderFeed('all');
  // Seed the account chrome with your own avatar image (or its selected colour fallback).
  paintOwnAvatarChrome();
  // Match the phone to Safari's true visible area (kills the black bars; updates as toolbars resize)
  // ===== Pull-to-refresh (posts + feed) =====
  function attachPTR(scrollEl, ptrEl, onRefresh){
    if(!scrollEl||!ptrEl)return;
    var THRESH=64, MAX=96, startY=0, pulling=false, dist=0, busy=false;
    function setH(h){ptrEl.style.height=h+'px';}
    function begin(y){ if(busy)return; if(scrollEl.scrollTop>2)return; startY=y; pulling=true; dist=0; ptrEl.classList.add('show'); }    function move(y,ev){
      if(!pulling||busy)return;
      var d=y-startY;
      if(d<=0){ // user scrolling up/normal — cancel
        if(dist===0){pulling=false;ptrEl.classList.remove('show');setH(0);}
        return;
      }
      if(scrollEl.scrollTop>2){pulling=false;setH(0);ptrEl.classList.remove('show');return;}
      dist=Math.min(MAX, d*0.5); // rubber-band damping
      scrollEl.classList.add('ptr-pulling');
      setH(dist);
      ptrEl.querySelector('.ptr-spin').style.transform='rotate('+(dist/MAX*270)+'deg)';
      if(ev&&ev.cancelable)ev.preventDefault();
    }
    function end(){
      if(!pulling||busy){return;}
      pulling=false; scrollEl.classList.remove('ptr-pulling');
      if(dist>=THRESH){
        busy=true; setH(THRESH); ptrEl.classList.add('spinning');
        setTimeout(function(){
          try{onRefresh&&onRefresh();}catch(e){}
          ptrEl.classList.remove('spinning');
          ptrEl.style.transition='height .26s ease';
          setH(0);
          setTimeout(function(){ptrEl.style.transition='';ptrEl.classList.remove('show');busy=false;},300);
        },820);
      }else{
        ptrEl.style.transition='height .2s ease'; setH(0);
        setTimeout(function(){ptrEl.style.transition='';ptrEl.classList.remove('show');},220);
      }
      dist=0;
    }
    // touch
    scrollEl.addEventListener('touchstart',function(e){begin(e.touches[0].clientY);},{passive:true});
    scrollEl.addEventListener('touchmove',function(e){move(e.touches[0].clientY,e);},{passive:false});
    scrollEl.addEventListener('touchend',end);
    scrollEl.addEventListener('touchcancel',end);
    // mouse (desktop preview)
    var mdown=false;
    scrollEl.addEventListener('mousedown',function(e){if(scrollEl.scrollTop>2)return;mdown=true;begin(e.clientY);});
    window.addEventListener('mousemove',function(e){if(mdown)move(e.clientY,e);});
    window.addEventListener('mouseup',function(){if(mdown){mdown=false;end();}});
  }
  function flashRefresh(){ /* tiny visual nudge that content reloaded */ }
  attachPTR(document.getElementById('posts-scroll'), document.getElementById('posts-ptr'), function(){renderPosts();});
  attachPTR(document.getElementById('tc-scroll'), document.getElementById('tc-ptr'), function(){renderTrendPostFeed();});
  attachPTR(document.getElementById('feed'), document.getElementById('feed-ptr'), function(){renderFeed(feedKind);});

  function setAppHeight(){document.documentElement.style.setProperty('--app-height',window.innerHeight+'px');}
  setAppHeight();
  window.addEventListener('resize',setAppHeight);
  window.addEventListener('orientationchange',function(){setTimeout(setAppHeight,200);});
  if(window.visualViewport)window.visualViewport.addEventListener('resize',setAppHeight);
  updateBellDot();
  applyRole();   // honour the persisted role (Settings > Browse as a user) on first paint
  window.addEventListener('load',function(){moveInd();moveSeg();setBal();kickVideos();updateBellDot();setAppHeight();syncFilterLabels();renderFilterSheets();syncPostsLabels();renderPostSheets();applyRole();});setTimeout(function(){moveInd();moveSeg();setBal();setAppHeight();},60);
})();
