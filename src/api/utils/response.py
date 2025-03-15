"""
响应处理工具模块
Response handling utility module
"""
from flask import jsonify
from api.enum.error_code import ErrorCode
from functools import wraps
import traceback
import logging

def success_response(result=None):
    """
    生成统一的成功响应格式
    Generate unified success response format
    :param result: 响应数据，默认为None
    :return: JSON格式的成功响应
    """
    return jsonify({
        "success": True,
        "result": result if result else {},
        "error_code": ErrorCode.SUCCESS['code'],
        "error_message": ErrorCode.SUCCESS['message']
    })

def error_response(error_code_enum, error_message=None):
    """
    生成统一的错误响应格式
    Generate unified error response format
    :param error_code_enum: 错误代码枚举
    :param error_message: 自定义错误消息
    :return: JSON格式的错误响应
    """
    return jsonify({
        "success": False,
        "result": {},
        "error_code": error_code_enum['code'],
        "error_message": error_message if error_message else error_code_enum['message']
    })

def handle_exceptions(f):
    """
    全局异常处理装饰器
    :param f: 被装饰的函数
    :return: 装饰后的函数
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            # 记录错误日志
            logging.error(f"Error: {str(e)}")
            logging.error(traceback.format_exc())
            # 返回标准化的错误响应
            return jsonify({
                "success": False,
                "message": str(e),
                "error": traceback.format_exc()
            }), 500
    return decorated_function

def register_error_handlers(blueprint):
    """
    为蓝图注册全局错误处理器
    Register global error handlers for blueprint
    
    :param blueprint: Flask蓝图实例
    """
    @blueprint.errorhandler(Exception)
    def handle_error(error):
        # 记录错误日志
        logging.error(f"Error: {str(error)}")
        logging.error(traceback.format_exc())
        # 返回标准化的错误响应
        return error_response(
            ErrorCode.INTERNAL_SERVER_ERROR, 
            str(error)
        ) 