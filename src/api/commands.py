"""
命令行工具模块
此模块提供了一系列自定义的Flask CLI命令，用于执行各种管理任务
例如：数据库初始化、测试数据导入等

您可以使用@app.cli.command装饰器添加任意数量的命令
这些命令可用于执行定时任务或在API之外但仍需要与数据库集成的任务
"""

import click
from api.models import db, User

def setup_commands(app):
    """
    设置命令行工具
    :param app: Flask应用实例
    """
    
    @app.cli.command("insert-test-users") # 命令名称
    @click.argument("count") # 命令参数
    def insert_test_users(count):
        """
        插入测试用户数据
        使用方法: $ flask insert-test-users 5
        :param count: 要创建的测试用户数量
        """
        print("开始创建测试用户")
        for x in range(1, int(count) + 1):
            user = User()
            user.email = "test_user" + str(x) + "@test.com"
            user.password = "123456"
            # user.is_active = True
            db.session.add(user)
            db.session.commit()
            print("用户已创建: ", user.email)

        print("所有测试用户创建完成")

    @app.cli.command("insert-test-data")
    def insert_test_data():
        """
        插入测试数据
        此函数预留用于插入其他类型的测试数据
        """
        pass