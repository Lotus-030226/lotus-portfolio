"""本案獨立開發工具：setup / start / stop / status。"""
import json, os, secrets, shutil, signal, socket, subprocess, sys, time
from pathlib import Path
from urllib.request import urlopen
ROOT = Path(__file__).resolve().parents[1]
PRIVATE = ROOT / 'private'
PRIVATE.mkdir(exist_ok=True)
os.chmod(PRIVATE, 448)
ENV = os.environ.copy()
ENV['PATH'] = os.pathsep.join([ENV.get('PATH', ''), str(Path.home() / '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin'), str(Path.home() / '.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback')])
ENV['NEXT_TELEMETRY_DISABLED'] = '1'
PYTHON = ROOT / 'cms/.venv/bin/python'
STATE = PRIVATE / 'processes.json'

def run(args):
    subprocess.run(args, cwd=ROOT, env=ENV, check=True)

def owned(pid):
    try:
        os.kill(pid, 0)
        return str(ROOT) in subprocess.check_output(['ps', '-p', str(pid), '-o', 'command='], text=True)
    except (ProcessLookupError, subprocess.CalledProcessError):
        return False

def start():
    run(['docker', 'compose', 'up', '-d', '--wait', 'db'])
    run([str(PYTHON), 'cms/manage.py', 'migrate', '--noinput'])
    run(['pnpm', 'admin:build'])
    processes = json.loads(STATE.read_text()) if STATE.exists() else {}
    commands = {'studio': (8100, [str(PYTHON), str(ROOT / 'cms/manage.py'), 'runserver', '127.0.0.1:8100', '--noreload']), 'public': (3100, [shutil.which('node', path=ENV['PATH']), str(ROOT / 'node_modules/next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', '3100']), 'preview': (3102, [sys.executable, str(ROOT / 'scripts/preview.py')])}
    for name, (port, _) in commands.items():
        if processes.get(name) and owned(processes[name]):
            continue
        with socket.socket() as listener:
            try:
                listener.bind(('127.0.0.1', port))
            except OSError:
                raise SystemExit(f'{port} 已被其他程序使用；未啟動重複服務。請檢查該程序後再啟動。')
    for name, (port, command) in commands.items():
        if processes.get(name) and owned(processes[name]):
            continue
        log = PRIVATE / f'{name}.log'
        with log.open('ab') as output:
            os.chmod(log, 384)
            process = subprocess.Popen(command, cwd=ROOT, env=ENV, stdout=output, stderr=subprocess.STDOUT, start_new_session=True)
        processes[name] = process.pid
        STATE.write_text(json.dumps(processes))
        deadline = time.monotonic() + 25
        while time.monotonic() < deadline:
            if process.poll() is not None:
                raise SystemExit(f'{name} 啟動失敗，請查看 private/{name}.log。')
            try:
                with socket.create_connection(('127.0.0.1', port), timeout=0.5):
                    break
            except OSError:
                time.sleep(0.2)
        else:
            raise SystemExit(f'{name} 啟動逾時，請查看 private/{name}.log。')
    with urlopen('http://127.0.0.1:8100/api/auth/session/', timeout=10) as response:
        if response.status != 200:
            raise SystemExit('後台健康檢查未通過。')
    print('後台 http://127.0.0.1:8100/studio/\n開發頁 http://127.0.0.1:3100\n靜態預覽 http://127.0.0.1:3102（需先準備更新）')

def setup():
    if not (ROOT / '.env').exists():
        (ROOT / '.env').write_text(f'DJANGO_SECRET_KEY={secrets.token_urlsafe(48)}\nDB_NAME=lotus_portfolio\nDB_USER=lotus\nDB_PASSWORD={secrets.token_urlsafe(32)}\nDB_HOST=127.0.0.1\nDB_PORT=55433\nNEXT_PUBLIC_BASE_PATH=\nSITE_URL=\n')
        os.chmod(ROOT / '.env', 384)
    if not PYTHON.exists():
        run([sys.executable, '-m', 'venv', 'cms/.venv'])
    for args in [[str(PYTHON), '-m', 'pip', 'install', '-r', 'cms/requirements.txt'], ['pnpm', 'install', '--frozen-lockfile'], ['docker', 'compose', 'up', '-d', '--wait', 'db'], [str(PYTHON), 'cms/manage.py', 'migrate'], [str(PYTHON), 'cms/manage.py', 'seed_content'], [str(PYTHON), 'cms/manage.py', 'export_content'], ['pnpm', 'admin:build']]:
        run(args)
    print('環境已就緒。建立帳號：cms/.venv/bin/python cms/manage.py createsuperuser')
if __name__ == '__main__':
    if len(sys.argv) != 2 or sys.argv[1] not in ['setup', 'start', 'stop', 'status']:
        raise SystemExit('使用：python3 scripts/local.py setup|start|stop|status')
    action = sys.argv[1]
    if action == 'setup':
        setup()
    elif action == 'start':
        start()
    elif action == 'stop':
        stopped = []
        for name, pid in (json.loads(STATE.read_text()) if STATE.exists() else {}).items():
            if owned(pid):
                os.killpg(pid, signal.SIGTERM)
                stopped.append(pid)
            else:
                print(name, '已停止或 PID 已變更；保留其他程序。')
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline and any((owned(pid) for pid in stopped)):
            time.sleep(0.2)
        STATE.unlink(missing_ok=True)
        run(['docker', 'compose', 'stop', 'db'])
        print('本案服務已停止，資料庫 volume 保留。')
    else:
        for name, pid in (json.loads(STATE.read_text()) if STATE.exists() else {}).items():
            print(name, '執行中' if owned(pid) else '已停止')
        run(['docker', 'compose', 'ps'])
