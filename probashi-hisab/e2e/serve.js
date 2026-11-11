const http=require('http'),fs=require('fs'),path=require('path');
const root=process.argv[2];const types={'.html':'text/html','.js':'application/javascript','.wasm':'application/wasm','.ttf':'font/ttf','.png':'image/png','.ico':'image/x-icon','.json':'application/json','.css':'text/css'};
http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);let f=path.join(root,p);if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(root,'index.html');
res.setHeader('Cross-Origin-Embedder-Policy','credentialless');res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);}).listen(8099,()=>console.log('up'));
