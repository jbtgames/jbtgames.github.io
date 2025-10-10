async function tryFetch(path){
  const res = await fetch(path, {cache: 'no-store'});
  if(!res.ok) throw new Error('fetch failed');
  return res.json();
}

async function loadLatestWindow(days=10){
  const now = new Date();
  for(let i=0;i<days;i++){
    const d = new Date(now); d.setDate(now.getDate()-i);
    const iso = d.toISOString().slice(0,10);
    const url = `content/${iso}/index.json`;
    try{
      const data = await tryFetch(url);
      return {date: iso, items: data};
    }catch(e){}
  }
  throw new Error('No recent content found');
}

function render({date, items}){
  const status = document.getElementById('status');
  const container = document.getElementById('stories');
  status.textContent = `Showing stories for ${date}`;
  container.innerHTML = '';
  items.forEach(item=>{
    const el = document.createElement('div');
    el.className = 'card';
    const link = `content/${item.path}`.replace(/^site\//,'');
    el.innerHTML = `
      <h2>${item.title}</h2>
      <div class="meta">${item.domain || ''}</div>
      <a href="${link}" target="_blank" rel="noopener">Read article →</a>
    `;
    container.appendChild(el);
  });
}

(async () => {
  const status = document.getElementById('status');
  status.textContent = 'Loading latest stories…';
  try{
    const payload = await loadLatestWindow(14);
    render(payload);
  }catch(e){
    status.textContent = 'No new stories yet. Check back later today.';
  }
})();