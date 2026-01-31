#!/bin/bash

# 进入项目目录
cd "$(dirname "$0")"

echo "正在启动色彩测试项目..."

# 检查是否存在node_modules目录
if [ ! -d "node_modules" ]; then
    echo "未找到依赖，正在安装..."
    npm install
    if [ $? -ne 0 ]; then
        echo "依赖安装失败，请检查网络连接或package.json文件"
        read -p "按任意键退出..."
        exit 1
    fi
fi

# 启动开发服务器
echo "依赖检查完成，正在启动开发服务器..."
npm run dev

# 保持窗口打开
read -p "按任意键关闭窗口..."
