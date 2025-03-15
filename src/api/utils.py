"""
工具函数模块
提供了API异常处理和站点地图生成等通用功能
"""

from flask import jsonify, url_for

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
