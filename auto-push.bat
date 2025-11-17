@echo off
cd /d C:\lml\1
git add .
git commit -m "自动更新 %date% %time%"
git push
echo 已自动推送到 GitHub！
timeout /t 3
