"""
站点地图生成工具模块
Sitemap generation utility module
"""

def generate_sitemap(app):
    """
    为应用程序生成站点地图
    Generate sitemap for the application
    
    :param app: Flask应用实例
    :return: 包含所有路由信息的字典
    """
    links = ['/']
    for rule in app.url_map.iter_rules():
        # 过滤掉静态文件和特殊端点
        if "GET" in rule.methods and has_no_empty_params(rule):
            url = rule.rule
            links.append(url)

    return {
        "endpoints": sorted(links)
    }

def has_no_empty_params(rule):
    """
    检查URL规则是否包含参数
    Check if URL rule contains parameters
    
    :param rule: URL规则
    :return: 如果URL没有参数则返回True
    """
    defaults = rule.defaults if rule.defaults is not None else ()
    arguments = rule.arguments if rule.arguments is not None else ()
    return len(defaults) >= len(arguments) 