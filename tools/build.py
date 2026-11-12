#!/usr/bin/env python3
"""Tek dosyalik index.html uretir: CSS + JS gomulu."""
import re, pathlib, datetime

ROOT = pathlib.Path(__file__).resolve().parent.parent
tpl = (ROOT / 'src/index.template.html').read_text(encoding='utf-8')
css = (ROOT / 'assets/style.css').read_text(encoding='utf-8')
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
