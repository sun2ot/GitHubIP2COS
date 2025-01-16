# 获取北京时间并格式化为需要的样式
TIME=$(TZ='Asia/Shanghai' date +'%Y/%m/%d %H:%M:%S')

# 推送更新
git add .
git commit -m "update at ${TIME}"
git push