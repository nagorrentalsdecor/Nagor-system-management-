@echo off
echo --- PUSHING BLACKLIST UI UPDATES ---
echo Remote: https://github.com/nagorrentalsdecor/Nagor-system-management-.git

git remote remove origin
git remote add origin https://github.com/nagorrentalsdecor/Nagor-system-management-.git
git remote set-url origin https://github.com/nagorrentalsdecor/Nagor-system-management-.git

echo Adding all changes...
git add .

echo Committing...
git commit -m "Update blacklist UI to red warning style"

echo Pushing...
git branch -M main
git push -u origin main --force

echo.
echo ==========================================
echo Push Complete. Please check GitHub now.
echo ==========================================
pause
