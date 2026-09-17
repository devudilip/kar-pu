#!/usr/bin/env python3
"""Extract text from KEA question-paper / answer-key PDFs so they can be typed into the app's CSV format.

Usage:
  tools/.venv/bin/python tools/pyq-extract.py data/pyq/raw/2024-physics.pdf
  -> writes data/pyq/raw/2024-physics.txt (one block per page, '=== page N ===' separators)

Uses the PDF text layer when present; falls back to Tesseract OCR (300 dpi) for scanned pages.
"""
import subprocess, sys, tempfile, os
import fitz  # pymupdf

def ocr_page(page):
    pix = page.get_pixmap(dpi=300)
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
        pix.save(f.name)
        try:
            out = subprocess.run(['tesseract', f.name, 'stdout', '--psm', '6'], capture_output=True, text=True)
            return out.stdout
        finally:
            os.unlink(f.name)

def main(path):
    doc = fitz.open(path)
    out_path = os.path.splitext(path)[0] + '.txt'
    with open(out_path, 'w', encoding='utf-8') as out:
        for i, page in enumerate(doc, 1):
            text = page.get_text()
            source = 'text'
            if len(text.strip()) < 80:
                text = ocr_page(page); source = 'ocr'
            out.write(f'=== page {i} ({source}) ===\n{text}\n')
            print(f'page {i}: {source}, {len(text)} chars')
    print('wrote', out_path)

if __name__ == '__main__':
    for p in sys.argv[1:]:
        main(p)
