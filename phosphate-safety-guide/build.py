"""Assemble src/ into site/index.html (deployable) and dist/artifact.html (body-only preview)."""
import pathlib
root = pathlib.Path(__file__).parent
src = root / 'src'
parts = ['shell.html'] + sorted(p.name for p in src.glob('m*.html'))
three = ''
body = ''.join((src / p).read_text() for p in parts)
body += '</main>\n</div>\n' + three + '<script>\n' + '\n'.join((src / f).read_text() for f in ('data.js', 'app.js')) + '\n</script>\n'
head = (src / 'head.html').read_text()
(root / 'dist').mkdir(exist_ok=True)
(root / 'dist' / 'artifact.html').write_text(head + body)
meta = '''<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#FFFFFF" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#161A1D" media="(prefers-color-scheme: dark)">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'%3E%3Crect x='1' y='1' width='28' height='28' fill='%23F2C230' stroke='%2315191C' stroke-width='2'/%3E%3Cpath d='M6 20a9 9 0 0 1 18 0z' fill='%2315191C'/%3E%3Crect x='4' y='20' width='22' height='3' fill='%2315191C'/%3E%3C/svg%3E">
<link rel="apple-touch-icon" href="images/icon-192.png">
<link rel="manifest" href="manifest.webmanifest">
<meta property="og:type" content="website">
<meta property="og:title" content="ফসফেট প্লান্ট সেফটি অফিসার গাইড">
<meta property="og:description" content="সেফটি অফিসারের সম্পূর্ণ গাইড: ঝুঁকি, রাসায়নিক, PPE, পারমিট, LOTO, কনফাইন্ড স্পেস, জরুরি অবস্থা, KPI ও ক্যালকুলেটর। বাংলা + English।">
<meta property="og:locale" content="bn_BD">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}img{max-width:100%}[hidden]{display:none!important}</style>
'''
site = '<!doctype html>\n<html lang="bn">\n<head>\n' + meta + head + '</head>\n<body>\n' + body + \
  '<script>if("serviceWorker" in navigator&&location.protocol==="https:"){navigator.serviceWorker.register("sw.js").catch(()=>{})}</script>\n</body>\n</html>\n'
(root / 'site' / 'index.html').write_text(site)
print('site/index.html', len(site.encode()), 'bytes')
