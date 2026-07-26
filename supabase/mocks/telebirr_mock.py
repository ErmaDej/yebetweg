#!/usr/bin/env python3
from http.server import BaseHTTPRequestHandler, HTTPServer
import json

class MockHandler(BaseHTTPRequestHandler):
    def _set_headers(self, code=200):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()

    def do_POST(self):
        if self.path != '/v1/payment/create':
            self._set_headers(404)
            self.wfile.write(json.dumps({'code':'404','msg':'not found'}).encode())
            return
        length = int(self.headers.get('content-length', 0))
        body = self.rfile.read(length).decode('utf-8') if length else '{}'
        try:
            payload = json.loads(body)
        except Exception:
            payload = {}
        reference = payload.get('reference', 'mock-ref-0001')
        prepay = 'mock-prepay-' + reference[-6:]
        resp = {
            'code': '0000',
            'msg': 'success',
            'data': {
                'prepayId': prepay,
                'codeUrl': f'https://mock.pay/{prepay}',
                'reference': reference,
                'qrCode': f'https://mock.pay/qr/{prepay}'
            }
        }
        self._set_headers(200)
        self.wfile.write(json.dumps(resp).encode())

    def log_message(self, format, *args):
        # quieter logs
        print("[MockTeleBirr] " + format % args)

if __name__ == '__main__':
    import os
    port = int(os.environ.get('TELEBIRR_MOCK_PORT', '8081'))
    server_address = ('0.0.0.0', port)
    print(f'Starting TeleBirr mock on http://0.0.0.0:{port} (reachable from other containers)')
    httpd = HTTPServer(server_address, MockHandler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('Shutting down mock')
        httpd.server_close()
