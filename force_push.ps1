
# Validating path and setting remote
$remoteUrl = "https://github.com/nagorrentalsdecor/Nagor-system-management-.git"

Write-Host "Configuring git remote..."
git remote remove origin 2>$null
git remote add origin $remoteUrl
git remote set-url origin $remoteUrl

Write-Host "Staging all files..."
git add .

Write-Host "Committing..."
git commit -m "Force push update: Fix submission forms and notifications" --allow-empty

Write-Host "Force Pushing to GitHub..."
git branch -M main
git push -u origin main --force

Write-Host "Done."
