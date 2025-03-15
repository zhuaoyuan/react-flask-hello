"""
基础路由模块，包含通用功能和测试端点
Base routing module containing common functionality and test endpoints
"""
from flask import jsonify
from api.enum.error_code import ErrorCode
from api.utils import success_response, error_response, handle_exceptions
from . import api

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
def error_response(error_code_enum, error_message=None):
    """
    生成统一的错误响应格式
    :param error_code_enum: 错误代码枚举
    :return: JSON格式的错误响应
    """
    return jsonify({
        "success": False,
        "result": {},
        "error_code": error_code_enum['code'],
        "error_message": error_message if error_message else error_code_enum['message']
    })

@api.route('/hello', methods=['GET'])
@handle_exceptions
def handle_hello():
    """测试端点"""
    return jsonify({"message": "Hello! I'm a message that came from the backend, check the network tab on the google inspector and you will see the GET request"})

@api.route('/hello2', methods=['POST', 'GET'])
def handle_hello2():
    response_body = {
        "message": ErrorCode.BAD_REQUEST['message']
    }
    return jsonify(response_body) 