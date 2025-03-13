"""
管理界面配置模块
用于设置Flask-Admin管理后台界面
"""
  
import os
from flask_admin import Admin
from .models import db, User
from flask_admin.contrib.sqla import ModelView

def setup_admin(app):
    """
    配置管理后台
    :param app: Flask应用实例
    """
    # 设置应用密钥
    app.secret_key = os.environ.get('FLASK_APP_KEY', 'sample key')
    # 设置管理界面主题
    app.config['FLASK_ADMIN_SWATCH'] = 'cerulean'
    # 创建管理后台实例
    admin = Admin(app, name='4Geeks Admin', template_mode='bootstrap3')

    # 添加模型视图
    # 这里展示了如何添加User模型到管理界面
    admin.add_view(ModelView(User, db.session))

    # 您可以通过复制上面的代码行来添加新的模型
    # 例如: admin.add_view(ModelView(YourModelName, db.session))