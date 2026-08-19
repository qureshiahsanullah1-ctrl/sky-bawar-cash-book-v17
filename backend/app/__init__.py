import os
from pathlib import Path
import sys

backend_dir = str(Path(__file__).resolve().parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

VENDOR_DIR = Path(__file__).resolve().parent.parent / ".vendor"

if VENDOR_DIR.exists() and os.name != "nt":
    vendor_path = str(VENDOR_DIR)
    if vendor_path not in sys.path:
        sys.path.insert(0, vendor_path)

