# Eric 金融工作台 —— 一键部署到 GitHub（用于 Mac / Windows 跨设备同步）
# 用法（在仓库根目录执行）：
#   .\deploy.ps1                 # 用默认提交信息
#   .\deploy.ps1 "修复日历交互"   # 自定义提交信息
# 前置：本机已配置好 GitHub 凭据（AccessToken / 系统凭据管理器均可）
param(
  [string]$msg = "chore: update workbench"
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
Push-Location $root

# 1) 拉取远端最新（避免与 Mac/Windows 另一端的提交冲突）
git pull --rebase origin main 2>$null

# 2) 提交本地改动
git add -A
$status = git status --porcelain
if ($status) {
  git commit -m $msg | Out-Host
} else {
  Write-Host "没有需要提交的改动。"
}

# 3) 推送到 GitHub
git push origin main
Write-Host "`n✅ 已推送到 GitHub：https://github.com/edwardfang88/eric-finance-workbench"
Write-Host "公网分享链接（由 WorkBuddy CloudStudio 部署）需在工作台中触发部署。"
Pop-Location
