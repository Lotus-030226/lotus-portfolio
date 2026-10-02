from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
root = Path(__file__).resolve().parents[1] / 'private/preview'

class Handler(SimpleHTTPRequestHandler):

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
if __name__ == '__main__':
    print('靜態預覽：http://127.0.0.1:3102（請先準備更新）', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 3102), partial(Handler, directory=str(root))).serve_forever()
