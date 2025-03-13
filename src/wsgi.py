"""
WSGI配置文件 - 用于在生产环境中使用Gunicorn部署应用
WSGI Configuration File - Used for deploying the application with Gunicorn in production

此文件主要用于在Heroku等平台上使用Gunicorn运行应用程序
This file was created to run the application on platforms like Heroku using Gunicorn
更多信息请参考：https://devcenter.heroku.com/articles/python-gunicorn
"""

# 导入Flask应用实例并重命名为application（WSGI标准要求）
# Import Flask app instance and rename it to 'application' (WSGI standard)
from app import app as application

# 仅在直接运行此文件时执行
# Only execute when this file is run directly
if __name__ == "__main__":
    application.run()
