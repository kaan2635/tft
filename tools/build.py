#!/usr/bin/env python3
"""Tek dosyalik index.html uretir: CSS + JS gomulu."""
import re, pathlib, datetime, base64, io

ROOT = pathlib.Path(__file__).resolve().parent.parent
tpl = (ROOT / 'src/index.template.html').read_text(encoding='utf-8')
css = (ROOT / 'assets/style.css').read_text(encoding='utf-8')

# --- şampiyon sanatı: png -> küçük jpeg -> data-uri (tek dosyada gömülü) ---
ART_NAMES = ['warrior', 'mage', 'ranger', 'assassin', 'guardian', 'legendary']
def art_data_uri(path, size=256, quality=78):
    try:
        from PIL import Image
    except ImportError:
        return None
    im = Image.open(path).convert('RGB')
    im.thumbnail((size, size), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=quality, optimize=True, progressive=True)
    return 'url(data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode() + ')'

missing = []
for name in ART_NAMES:
    f = ROOT / 'assets' / 'art' / (name + '.png')
    uri = art_data_uri(f) if f.exists() else None
    if uri is None:
        missing.append(name)
        continue
    css = css.replace('--art-%s:none;' % name, '--art-%s:%s;' % (name, uri))
if missing:
    print('uyari: gomulemeyen sanat dosyalari:', ', '.join(missing))
js_files = ['data.js', 'combat.js', 'bots.js', 'ui.js', 'game.js']

js_parts = []
for f in js_files:
    code = (ROOT / 'src' / f).read_text(encoding='utf-8')
    js_parts.append(f'/* ==== {f} ==== */\n' + code)
js = '\n\n'.join(js_parts)

stamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
out = tpl.replace('<!--INJECT_CSS-->', f'<style>\n{css}\n</style>')
out = out.replace('<!--INJECT_JS-->', '<script>\n' + js + '\n</script>')
out = out.replace('__STAMP__', stamp)
(ROOT / 'index.html').write_text(out, encoding='utf-8')
print(f'index.html yazildi: {len(out)/1024:.1f} KB  ({stamp})')
