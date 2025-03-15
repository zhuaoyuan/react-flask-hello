"""
基础路由模块，包含通用功能和测试端点
Base routing module containing common functionality and test endpoints
"""
from flask import jsonify
from api.enum.error_code import ErrorCode
from api.utils import handle_exceptions
from . import api

@api.route('/hello', methods=['GET'])
@handle_exceptions
def handle_hello():
    """测试端点"""
    return jsonify({"message": "Hello! I'm a message that came from the backend, check the network tab on the google inspector and you will see the GET request"})

@api.route('/hello2', methods=['POST', 'GET'])
@handle_exceptions
def handle_hello2():
    response_body = {
        "message": ErrorCode.BAD_REQUEST['message']
    }
    return jsonify(response_body) 