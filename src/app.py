"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
此模块负责启动API服务器、加载数据库和添加端点
"""
import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify, url_for, send_from_directory
from flask_migrate import Migrate
from flask_swagger import swagger
from flask_cors import CORS
from flask_session import Session
from api.utils import generate_sitemap
from api.models import db
from api.routes import api, init_routes
from api.admin import setup_admin
from api.commands import setup_commands
import logging
from logging.handlers import RotatingFileHandler

load_dotenv()

# 在 app.py 中添加
def setup_logger(app):
    # 创建日志目录
    if not os.path.exists('logs'):
        os.mkdir('logs')
    
    # 配置日志处理器
    file_handler = RotatingFileHandler(
        'logs/app.log', 
        maxBytes=10240000,  # 10MB
        backupCount=10
    )
    
    # 设置日志格式
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    
    # 设置日志级别
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
    app.logger.info('Application startup')



# from models import Person

# 确定当前运行环境（开发/生产）
# Determine current environment (development/production)
ENV = os.getenv("FLASK_ENV")

# 设置静态文件目录路径
# Set static files directory path
static_file_dir = os.path.join(os.path.dirname(
    os.path.realpath(__file__)), '../public/')

# 初始化Flask应用
# Initialize Flask application
app = Flask(__name__)
app.debug = True

# 在创建 app 后调用
setup_logger(app)

# 禁用URL末尾的斜杠强制要求
# Disable strict slashes requirement for URLs
app.url_map.strict_slashes = False

# 数据库配置
# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'mysql://root:123456@localhost/logistics')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Session配置
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev')
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = True  # 启用永久 session
app.config['PERMANENT_SESSION_LIFETIME'] = 86400  # session有效期24小时
app.config['SESSION_COOKIE_NAME'] = 'session'  # cookie 名称
app.config['SESSION_COOKIE_SECURE'] = False  # 开发环境不要求 HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True  # 防止 XSS 攻击
app.config['SESSION_COOKIE_DOMAIN'] = None  # 允许所有域名
app.config['SESSION_COOKIE_PATH'] = '/'  # Cookie 路径

# 配置跨域
CORS(app, 
     supports_credentials=True,
     resources={
         r"/api/*": {
             "origins": ["http://localhost:3000", "http://127.0.0.1:3000", "http://129.211.171.118:8461"],
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
             "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
             "expose_headers": ["Content-Type", "Authorization", "Set-Cookie"],
             "supports_credentials": True,
             "send_wildcard": False,
             "max_age": 86400
         }
     })

# 初始化各种扩展
Session(app)  # 初始化Session
db.init_app(app)  # 初始化数据库
MIGRATE = Migrate(app, db)  # 初始化数据库迁移

# 设置管理界面
# Setup admin interface
setup_admin(app)

# 设置命令行工具
# Setup CLI commands
setup_commands(app)

# 注册API蓝图
app.register_blueprint(api)

# 初始化所有路由
init_routes(app)

# 处理/api/docs
@app.route('/api/docs', methods=['GET'])
def get_docs():
    return jsonify(generate_sitemap(app))


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
