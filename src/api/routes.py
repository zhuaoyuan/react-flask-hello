"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
from flask import Flask, request, jsonify, url_for, Blueprint
from api.models import db, User, ProjectInfo
from api.utils import generate_sitemap, APIException
from api.enum.error_code import ErrorCode
from flask_cors import CORS
from datetime import datetime
from sqlalchemy import or_

api = Blueprint('api', __name__)

# Allow CORS requests to this API
CORS(api)

# 成功响应


def success_response(result=None):
    return jsonify({
        "success": True,
        "result": result if result else {},
        "error_code": ErrorCode.SUCCESS['code'],
        "error_message": ErrorCode.SUCCESS['message']
    })

# 失败响应


def error_response(error_code_enum):
    return jsonify({
        "success": False,
        "result": {},
        "error_code": error_code_enum['code'],
        "error_message": error_code_enum['message']
    })

# 全局异常处理


@api.errorhandler(Exception)
def handle_exception(e):
    # 这里可以根据异常类型返回不同的错误码和错误信息
    # 例如，可以根据e.__class__来判断异常类型
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

    return jsonify(response_body)


@api.route('/project/list', methods=['POST'])
def get_projects():
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
    projects_data = request.get_json()  # 获取JSON数据
    if (not projects_data) or (not projects_data.get('upload_list')):
        return error_response(ErrorCode.BAD_REQUEST)

    new_projects = []
    for project in projects_data.get('upload_list'):
        # 检查项目名称是否已存在
        if not ProjectInfo.query.filter_by(project_name=project['project_name']).first():
            new_project = ProjectInfo(
                project_name=project['project_name'],
                customer_name=project['customer_name'],
                start_date=project['start_date'],
                end_date=project['end_date'],
                project_description=project.get('project_description', '')
            )
            new_projects.append(new_project)

    # 批量插入新项目
    if new_projects:
        db.session.add_all(new_projects)
        db.session.commit()
        return success_response()
    else:
        return error_response(ErrorCode.PROJECTS_ALL_EXISTED)


@api.route('/project/edit', methods=['POST'])
def edit_project():
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
