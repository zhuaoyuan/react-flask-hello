"""
路由包初始化文件
Routes package initialization file
"""
from flask import Blueprint

# 创建主API蓝图
api = Blueprint('api', __name__, url_prefix='/api')

# 导入子模块
from .project import project
from .order import order
from .auth import auth
from . import base

# 初始化所有路由的函数
def init_routes(app):
    """初始化所有路由"""
    app.register_blueprint(project, url_prefix='/api/project')
    app.register_blueprint(order, url_prefix='/api/order')
    app.register_blueprint(auth, url_prefix='/api/auth')

# 导出公共接口
__all__ = ['api', 'init_routes', 'project', 'order', 'auth']

# 导出工具函数
from api.utils import success_response, error_response, handle_exceptions