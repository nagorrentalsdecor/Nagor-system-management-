
$logFile = "git_diag_output.txt"
"--- GIT STATUS ---" > $logFile
git status >> $logFile 2>&1
"--- GIT REMOTE ---" >> $logFile
git remote -v >> $logFile 2>&1
"--- GIT BRANCH ---" >> $logFile
git branch -vv >> $logFile 2>&1
"--- LAST LOG ---" >> $logFile
git log -1 --oneline >> $logFile 2>&1
