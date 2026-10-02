from pathlib import Path
import subprocess, sys
root = Path(__file__).resolve().parents[1]
raise SystemExit(subprocess.call([str(root / 'cms/.venv/bin/python'), str(root / 'cms/manage.py'), 'prepare_release', *sys.argv[1:]], cwd=root))
