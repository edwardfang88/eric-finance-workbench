#!/bin/bash
# Eric 金融工作台 —— 一键部署到 GitHub（用于 Mac / Windows 跨设备同步）
# 用法（在仓库根目录执行）：
#   ./deploy.sh                 # 用默认提交信息
#   ./deploy.sh "修复日历交互"   # 自定义提交信息
# 前置：本机已配置好 GitHub 凭据（AccessToken / ssh / 系统凭据管理器均可）
set -e
cd "$(dirname "$0")"

# 1) 拉取远端最新（避免与 Mac/Windows 另一端的提交冲突）
git pull --rebase origin main 2>/dev/null || true

# 2) 提交本地改动
git add -A
if [ -n "$(git status --porcelain)" ]; then
  git commit -m "${1:-chore: update workbench}"
else
  echo "没有需要提交的改动。"
fi

# 3) 推送到 GitHub
git push origin main
echo ""
echo "✅ 已推送到 GitHub：https://github.com/edwardfang88/eric-finance-workbench"
echo "公网分享链接（由 WorkBuddy CloudStudio 部署）需在工作台中触发部署。"
