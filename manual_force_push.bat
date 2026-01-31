@echo off
echo --- FORCE PUSHING TO GITHUB ---
echo Remote: https://github.com/nagorrentalsdecor/Nagor-system-management-.git

git remote remove origin
git remote add origin https://github.com/nagorrentalsdecor/Nagor-system-management-.git
git remote set-url origin https://github.com/nagorrentalsdecor/Nagor-system-management-.git

echo Adding changes...
git add .
echo Committing...
git commit -m "Force push update"
echo Pushing...
git branch -M main
git push -u origin main --force

echo.
echo Force Push Complete.
pause
