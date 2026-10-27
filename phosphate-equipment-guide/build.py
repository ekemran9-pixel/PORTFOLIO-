"""Assemble src/ into site/index.html (deployable) and dist/artifact.html (body-only preview)."""
import pathlib
root = pathlib.Path(__file__).parent
src = root / 'src'
parts = ['shell.html'] + sorted(p.name for p in src.glob('m*.html'))
three = '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>\n'
body = ''.join((src / p).read_text() for p in parts)
body += '</main>\n</div>\n' + three + '<script>\n' + '\n'.join((src / f).read_text() for f in ('data.js', 'viewer3d.js', 'app.js')) + '\n</script>\n'
head = (src / 'head.html').read_text()
(root / 'dist').mkdir(exist_ok=True)
(root / 'dist' / 'artifact.html').write_text(head + body)
meta = '''<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#FFFFFF" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#161A1D" media="(prefers-color-scheme: dark)">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'%3E%3Crect x='1' y='1' width='28' height='28' fill='%23F2C230' stroke='%2315191C' stroke-width='2'/%3E%3Cellipse cx='9' cy='15' rx='3.2' ry='7' fill='none' stroke='%2315191C' stroke-width='2.4'/%3E%3Cpath d='M9 8h12M9 22h12' stroke='%2315191C' stroke-width='2.4'/%3E%3Cellipse cx='21' cy='15' rx='3.2' ry='7' fill='%2315191C'/%3E%3C/svg%3E">
<link rel="apple-touch-icon" href="images/icon-192.png">
<link rel="manifest" href="manifest.webmanifest">
<meta property="og:type" content="website">
<meta property="og:title" content="ফসফেট প্লান্ট ড্রাম গাইড">
<meta property="og:description" content="গ্রানুলেটর, ফসফেট ড্রায়ার ও কোটিং ড্রাম: ৩ডি ভিউ, পার্টস, মেইনটেনেন্স, ইন্সপেকশন ও সব ক্যালকুলেশন, বাংলায়।">
<meta property="og:locale" content="bn_BD">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}img{max-width:100%}[hidden]{display:none!important}</style>
'''
site = '<!doctype html>\n<html lang="bn">\n<head>\n' + meta + head + '</head>\n<body>\n' + body + \
  '<script>if("serviceWorker" in navigator&&location.protocol==="https:"){navigator.serviceWorker.register("sw.js").catch(()=>{})}</script>\n</body>\n</html>\n'
(root / 'site' / 'index.html').write_text(site)
print('site/index.html', len(site.encode()), 'bytes')
