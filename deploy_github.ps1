
# Set the remote URL provided by the user
$remoteUrl = "https://github.com/nagorrentalsdecor/Nagor-system-management-.git"

Write-Host "Setting remote origin to $remoteUrl..."
git remote remove origin 2>$null
git remote add origin $remoteUrl
# Ensure it's set correctly if it already existed
git remote set-url origin $remoteUrl

Write-Host "Staging all changes..."
git add .

Write-Host "Committing changes..."
# We use 'allow-empty' just in case there's nothing new to commit, so the script doesn't error out
git commit -m "Fix submission forms, add toast notifications, and update system configuration" --allow-empty

Write-Host "Renaming branch to main..."
git branch -M main

Write-Host "Pushing to GitHub..."
git push -u origin main
