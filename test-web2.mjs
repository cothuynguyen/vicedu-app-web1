async function run() {
  const html = await fetch('https://vic-edu-web2.vercel.app').then(r => r.text());
  const scripts = [...html.matchAll(/src="([^"]+\.js)"/g)].map(m => m[1]);
  for (const s of scripts) {
    let url = s.startsWith('http') ? s : 'https://vic-edu-web2.vercel.app' + (s.startsWith('/') ? '' : '/') + s;
    const js = await fetch(url).then(r => r.text());
    if (js.includes('BCN3G3')) {
      console.log('FOUND IN:', url);
      return;
    }
  }
  console.log('NOT FOUND IN ANY SCRIPT TAG');
}
run();
