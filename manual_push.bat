@echo off
echo Setting remote to https://github.com/nagorrentalsdecor/Nagor-system-management-.git
git remote remove origin
git remote add origin https://github.com/nagorrentalsdecor/Nagor-system-management-.git
git remote set-url origin https://github.com/nagorrentalsdecor/Nagor-system-management-.git

echo Adding changes...
git add .
echo Committing...
git commit -m "System updates: Fix forms and toasts"
echo Pushing to main...
git branch -M main
git push -u origin main

echo.
echo Process Complete.
pause
