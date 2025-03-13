"""
此模块负责处理API路由、数据库操作和端点定义
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
from flask import Flask, request, jsonify, url_for, Blueprint
from api.models import db, User, ProjectInfo, ProjectPriceConfig
from api.utils import generate_sitemap, APIException
from api.enum.error_code import ErrorCode
from flask_cors import CORS
from datetime import datetime
from sqlalchemy import or_
import pdb

# 创建API蓝图
api = Blueprint('api', __name__)

# 允许跨域请求
CORS(api)

# 成功响应处理函数
def success_response(result=None):
    """
    生成统一的成功响应格式
    :param result: 响应数据，默认为None
    :return: JSON格式的成功响应
    """
    return jsonify({
        "success": True,
        "result": result if result else {},
        "error_code": ErrorCode.SUCCESS['code'],
        "error_message": ErrorCode.SUCCESS['message']
    })

# 错误响应处理函数
def error_response(error_code_enum):
    """
    生成统一的错误响应格式
    :param error_code_enum: 错误代码枚举
    :return: JSON格式的错误响应
    """
    return jsonify({
        "success": False,
        "result": {},
        "error_code": error_code_enum['code'],
        "error_message": error_code_enum['message']
    })

# 全局异常处理装饰器
@api.errorhandler(Exception)
def handle_exception(e):
    """
    全局异常处理函数
    :param e: 异常对象
    :return: 统一的错误响应
    """
    from app import app
    app.logger.debug(f'handle_exception {e}')
    return error_response(ErrorCode.INTERNAL_SERVER_ERROR)


@api.route('/hello', methods=['POST', 'GET'])
def handle_hello():

    response_body = {
        "message": "Hello! I'm a message that came from the backend, check the network tab on the google inspector and you will see the GET request"
    }

    return jsonify(response_body)


@api.route('/hello2', methods=['POST', 'GET'])
def handle_hello2():
    response_body = {
        "message": ErrorCode.BAD_REQUEST['message']
    }
    # from app import app
    # app.logger.debug(f'This is a debug message {response_body}')
    return jsonify(response_body)


@api.route('/project/list', methods=['POST'])
def get_projects():
    """
    获取项目列表，支持分页和搜索
    :return: 分页后的项目列表数据
    """
    # 解析请求体中的JSON数据
    data = request.get_json()
    page = data.get('page', 1)  # 获取页码，默认为1
    per_page = data.get('per_page', 10)  # 获取每页显示的项目数，默认为10
    search_query = data.get('search_query', '')  # 获取搜索查询字符串，默认为空

    print(search_query)
    # 执行分页查询
    query = ProjectInfo.query
    if search_query:
        # 添加模糊查询条件
        query = query.filter(or_(
            ProjectInfo.project_name.like(f'%{search_query}%'),
            ProjectInfo.customer_name.like(f'%{search_query}%')
        ))

    # 添加排序条件，按id从大到小排序
    query = query.order_by(ProjectInfo.id.desc())

    # 执行分页查询
    pagination = query.paginate(
        page=page, per_page=per_page, error_out=False)
    projects = pagination.items

    # 构造返回的数据
    projects_list = [
        {
            'id': project.id,
            'project_name': project.project_name,
            'customer_name': project.customer_name,
            'start_date': project.start_date.isoformat(),
            'end_date': project.end_date.isoformat(),
            'project_description': project.project_description
        }
        for project in projects
    ]

    # 返回分页数据
    return jsonify({
        'data': projects_list,
        'total': pagination.total,
        'pages': pagination.pages,
        'page': page
    })


@api.route('/project/upload', methods=['POST'])
def bulk_add_projects():
    """
    批量添加项目
    :return: 添加结果
    """
    projects_data = request.get_json()  # 获取JSON数据
    if (not projects_data) or (not projects_data.get('upload_list')):
        return error_response(ErrorCode.BAD_REQUEST)

    new_projects = []
    for project in projects_data.get('upload_list'):
        # 检查项目名称是否已存在
        existing_project = ProjectInfo.query.filter_by(project_name=project['project_name']).first()
        if not existing_project:
            new_project = ProjectInfo(
                project_name=project['project_name'],
                customer_name=project['customer_name'],
                start_date=project['start_date'],
                end_date=project['end_date'],
                project_description=project.get('project_description', '')
            )
            new_projects.append(new_project)
        else:
            # 如果项目名称已存在，生成不重复的尾缀
            suffix = 1
            while True:
                new_project_name = f"{project['project_name']}_{suffix}"
                if not ProjectInfo.query.filter_by(project_name=new_project_name).first():
                    new_project = ProjectInfo(
                        project_name=new_project_name,
                        customer_name=project['customer_name'],
                        start_date=project['start_date'],
                        end_date=project['end_date'],
                        project_description=project.get('project_description', '')
                    )
                    new_projects.append(new_project)
                    break
                suffix += 1

    # 批量插入新项目
    if new_projects:
        db.session.add_all(new_projects)
        db.session.commit()
        return success_response()
    else:
        return error_response(ErrorCode.PROJECTS_ALL_EXISTED)


@api.route('/project/edit', methods=['POST'])
def edit_project():
    """
    编辑项目信息
    :return: 更新后的项目信息
    """
    data = request.json
    id = data.get('id')
    project = ProjectInfo.query.get(id)
    if not project:
        return error_response(ErrorCode.PROJECT_NOT_FOUND)

    project.project_name = data.get('project_name', project.project_name)
    project.customer_name = data.get('customer_name', project.customer_name)
    project.start_date = datetime.strptime(
        data.get('start_date'), '%Y-%m-%d').date()
    project.end_date = datetime.strptime(
        data.get('end_date'), '%Y-%m-%d').date()
    project.project_description = data.get(
        'project_description', project.project_description)

    try:
        db.session.commit()
        return success_response(project.to_dict())
    except Exception as e:
        db.session.rollback()
        return error_response(ErrorCode.INTERNAL_SERVER_ERROR)


@api.route('/project/delete', methods=['POST'])
def delete_project():
    """
    删除项目
    :return: 删除操作结果
    """
    data = request.json
    id = data.get('id')
    project = ProjectInfo.query.get(id)
    if not project:
        return error_response(ErrorCode.PROJECT_NOT_FOUND)

    try:
        db.session.delete(project)
        db.session.commit()
        return success_response()
    except Exception as e:
        db.session.rollback()
        return error_response(ErrorCode.INTERNAL_SERVER_ERROR)


#报价表相关逻辑
@api.route('/project_price_config/list', methods=['POST'])
def query_project_price_config():
    """
    查询项目价格配置
    :return: 分页后的价格配置列表
    """
    data = request.get_json()
    
    # 解析请求参数
    try:
        departure_province = data.get('departure_province')
        departure_city = data.get('departure_city')
        destination_province = data.get('destination_province')
        destination_city = data.get('destination_city')
        page = data.get('page', 1)  # 获取页码，默认为1
        per_page = data.get('per_page', 10)  # 获取每页显示的项目数，默认为10
    except Exception as e:
        return error_response(ErrorCode.BAD_REQUEST)
    
    # 构建查询条件
    query = ProjectPriceConfig.query
    if departure_province:
        query = query.filter_by(departure_province=departure_province)
    if departure_city:
        query = query.filter_by(departure_city=departure_city)
    if destination_province:
        query = query.filter_by(destination_province=destination_province)
    if destination_city:
        query = query.filter_by(destination_city=destination_city)
    
    # 分页查询
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
     
    # 将查询结果转换为字典列表
    result_list = [item.__dict__ for item in pagination.items]
    for item in result_list:
        item.pop('_sa_instance_state', None)  # 移除不需要的字段
    
    # 返回分页信息
    result = {
        "items": result_list,
        "page": pagination.page,
        "pages": pagination.pages,
        "total": pagination.total
    }
    
    return success_response(result)