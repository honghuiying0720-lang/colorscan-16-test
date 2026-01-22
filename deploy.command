#!/bin/bash

# 脚本名称：deploy.sh
# 功能：构建并部署 ColorScan 项目到服务器

# 显示欢迎信息
echo "========================================"
echo "   ColorScan 项目部署脚本"
echo "========================================"

# 进入脚本所在目录
cd "$(dirname "$0")"

# 显示当前目录
echo "当前目录：$(pwd)"

# Git 操作
echo "========================================"
echo "   Git 操作"
echo "========================================"

# 检查 Git 状态
echo "检查 Git 状态..."
git status

# 添加所有更改到暂存区
echo "添加更改到暂存区..."
git add .

# 使用默认提交信息
echo "提交更改..."
git commit -m "更新项目: $(date '+%Y-%m-%d %H:%M:%S')"

# 推送到远程仓库
echo "推送到远程仓库..."
git push origin main

# 检查 Git 操作是否成功
if [ $? -eq 0 ]; then
    echo "✅ Git 操作成功！"
    
    # 构建项目
    echo "========================================"
    echo "   构建项目"
    echo "========================================"
    echo "正在构建项目..."
    npm run build
else
    echo "❌ Git 操作失败，请检查 Git 仓库配置"
    
    # 等待用户按回车退出
    echo ""
    echo "按回车键退出..."
    read -r
    exit 1
fi

# 检查构建是否成功
if [ $? -eq 0 ]; then
    echo "✅ 构建成功！"
    
    # 上传文件到服务器
        echo "正在上传文件到服务器..."
        scp -r dist/* root@8.134.98.247:/www/wwwroot/xindeh.xyz/colorscan16test/
    
    # 检查上传是否成功
    if [ $? -eq 0 ]; then
        echo "✅ 上传成功！"
        echo "========================================"
        echo "   部署完成！"
        echo "   请访问 https://xindeh.xyz 查看更新"
        echo "========================================"
    else
        echo "❌ 上传失败，请检查服务器连接和密码"
    fi
else
    echo "❌ 构建失败，请检查代码错误"
fi

# 等待用户按回车退出
echo ""
echo "按回车键退出..."
read -r