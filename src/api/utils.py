"""
工具函数模块
提供了API异常处理和站点地图生成等通用功能
"""

from flask import jsonify, url_for

class APIException(Exception):
    """
    API异常类
    用于处理API调用过程中的异常情况
    """
    status_code = 400

    def __init__(self, message, status_code=None, payload=None):
        """
        初始化API异常
        :param message: 错误信息
        :param status_code: HTTP状态码
        :param payload: 额外的负载数据
        """
        Exception.__init__(self)
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        self.payload = payload

    def to_dict(self):
        """
        将异常信息转换为字典格式
        :return: 包含错误信息的字典
        """
        rv = dict(self.payload or ())
        rv['message'] = self.message
        return rv

def has_no_empty_params(rule):
    """
    检查URL规则是否包含必需的参数
    :param rule: URL规则对象
    :return: 如果没有必需参数返回True，否则返回False
    """
    defaults = rule.defaults if rule.defaults is not None else ()
    arguments = rule.arguments if rule.arguments is not None else ()
    return len(defaults) >= len(arguments)

def generate_sitemap(app):
    """
    生成API站点地图
    :param app: Flask应用实例
    :return: 包含所有可访问端点的HTML页面
    """
    # 收集所有管理员路由
    links = ['/admin/']
    
    # 遍历所有URL规则
    for rule in app.url_map.iter_rules():
        # 过滤掉不能在浏览器中导航的规则和需要参数的规则
        if "GET" in rule.methods and has_no_empty_params(rule):
            url = url_for(rule.endpoint, **(rule.defaults or {}))
            if "/admin/" not in url:
                links.append(url)

    # 生成HTML链接列表
    links_html = "".join(["<li><a href='" + y + "'>" + y + "</a></li>" for y in links])
    
    # 返回完整的HTML页面
    return """
        <div style="text-align: center;">
        <img style="max-height: 80px" src='https://storage.googleapis.com/breathecode/boilerplates/rigo-baby.jpeg' />
        <h1>Rigo欢迎您访问API！</h1>
        <p>API地址: <script>document.write('<input style="padding: 5px; width: 300px" type="text" value="'+window.location.href+'" />');</script></p>
        <p>请按照<a href="https://start.4geeksacademy.com/starters/full-stack" target="_blank">快速入门指南</a>开始您的项目</p>
        <p>以下是可用的API端点: </p>
        <ul style="text-align: left;">"""+links_html+"</ul></div>"
