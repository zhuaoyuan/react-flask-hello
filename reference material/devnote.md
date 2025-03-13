# 本地环境启动
## 在项目目录打开控制台
vscode右键目录react-flask-hello > open in integrated terminal
## 本地启动后端
打开一个新的控制台，执行 pipenv run start
.py文件修改后ctrl+s保存，运行中的后端应用会自动重加载代码

## 本地启动前端
打开一个新的控制台，执行 npm run start
.js文件修改后ctrl+s保存，运行中的前端应用会自动重加载代码

# 调试后端接口
postman 
在flask api目录下保存了项目查询、编辑、删除、上传接口

# 查看数据库
dbeaver > mydatabase > 数据库 > mydatabase > 表 
可以查看数据和表结构
双击选中mydatabase F3打开sql编辑器，贴入dml（修改数据）或ddl（修改表结构）语句。左侧小三角形执行sql

