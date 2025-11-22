#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import http.server
import socketserver
import socket

PORT = 8001

def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

Handler = http.server.SimpleHTTPRequestHandler

print("=" * 50)
print("地铁跑酷 3D - 游戏服务器")
print("=" * 50)
print()
print(f"电脑访问: http://localhost:{PORT}")
print(f"手机访问: http://{get_ip()}:{PORT}")
print()
print("=" * 50)
print("请确保手机和电脑连接同一个 WiFi")
print("按 Ctrl+C 停止服务器")
print("=" * 50)
print()

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    httpd.serve_forever()
