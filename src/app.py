"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
此模块负责启动API服务器、加载数据库和添加端点
"""
import os
from flask import Flask, request, jsonify, url_for, send_from_directory
from flask_migrate import Migrate
from flask_swagger import swagger
from api.utils import APIException, generate_sitemap
from api.models import db
from api.routes import api
from api.admin import setup_admin
from api.commands import setup_commands

# from models import Person

# 确定当前运行环境（开发/生产）
# Determine current environment (development/production)
ENV = "development" if os.getenv("FLASK_DEBUG") == "1" else "production"

# 设置静态文件目录路径
# Set static files directory path
static_file_dir = os.path.join(os.path.dirname(
    os.path.realpath(__file__)), '../public/')

# 初始化Flask应用
# Initialize Flask application
app = Flask(__name__)
app.debug = True

# 禁用URL末尾的斜杠强制要求
# Disable strict slashes requirement for URLs
app.url_map.strict_slashes = False

# 数据库配置
# Database configuration
db_url = os.getenv("DATABASE_URL")
if db_url is not None:
    # 处理PostgreSQL数据库URL格式
    # Handle PostgreSQL database URL format
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url.replace(
        "postgres://", "postgresql://")
else:
    # 默认使用SQLite数据库
    # Use SQLite database by default
    app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:////tmp/test.db"

# 禁用SQLAlchemy的修改跟踪
# Disable SQLAlchemy modification tracking
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# 初始化数据库迁移
# Initialize database migration
MIGRATE = Migrate(app, db, compare_type=True)
db.init_app(app)

# 设置管理界面
# Setup admin interface
setup_admin(app)

# 设置命令行工具
# Setup CLI commands
setup_commands(app)

# 注册API蓝图，添加/api前缀
# Register API blueprint with /api prefix
app.register_blueprint(api, url_prefix='/api')

# 处理API异常，返回JSON格式的错误信息
# Handle API exceptions and return JSON formatted error messages
@app.errorhandler(APIException)
def handle_invalid_usage(error):
    return jsonify(error.to_dict()), error.status_code

# 生成包含所有端点的站点地图
# Generate sitemap with all endpoints
@app.route('/')
def sitemap():
    if ENV == "development":
        return generate_sitemap(app)
    return send_from_directory(static_file_dir, 'index.html')

# 处理所有其他路径的静态文件请求
# Handle static file requests for all other paths
@app.route('/<path:path>', methods=['GET'])
def serve_any_other_file(path):
    if not os.path.isfile(os.path.join(static_file_dir, path)):
        path = 'index.html'
    response = send_from_directory(static_file_dir, path)
    # 禁用缓存以避免内存问题
    # Disable cache to avoid memory issues
    response.cache_control.max_age = 0
    return response

# 仅在直接运行此文件时执行
# Only run when this file is executed directly
if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 3001))
    app.run(host='0.0.0.0', port=PORT, debug=True)
