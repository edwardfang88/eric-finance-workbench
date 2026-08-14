@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\WorkBuddy\个人金融工作台"
echo 正在准备本地服务器...
echo.
"C:\Users\Administrator\.workbuddy\binaries\python\versions\3.13.12\python.exe" -c "import socket; ips=sorted({i[4][0] for i in socket.getaddrinfo(socket.gethostname(),None,socket.AF_INET) if not i[4][0].startswith('127.') and i[4][0].split('.')[0] in ('10','192') and not i[4][0].startswith('198.18.')}); print('本机在局域网中的访问地址（手机和电脑需连同一WiFi）：'); [print('  http://%s:8080/eric-review.html' %% ip) for ip in (ips or ['192.168.x.x'])]"
echo.
echo 服务器即将启动……保持此窗口打开，关闭即停止服务。
echo.
"C:\Users\Administrator\.workbuddy\binaries\python\versions\3.13.12\python.exe" -m http.server 8080 --bind 0.0.0.0
echo.
echo 服务器已关闭。
pause
