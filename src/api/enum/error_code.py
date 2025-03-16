class ErrorCode:
    """错误码枚举类"""
    
    # 通用错误码 (0-999)
    SUCCESS = {'code': 0, 'message': '成功'}
    BAD_REQUEST = {'code': 400, 'message': '请求参数错误'}
    UNAUTHORIZED = {'code': 401, 'message': '未授权'}
    FORBIDDEN = {'code': 403, 'message': '禁止访问'}
    NOT_FOUND = {'code': 404, 'message': '资源未找到'}
    INTERNAL_SERVER_ERROR = {'code': 500, 'message': '服务器内部错误'}
    
    # 用户相关错误码 (2001-2999)
    USER_NOT_FOUND = {'code': 2001, 'message': '用户不存在'}
    USER_ALREADY_EXISTS = {'code': 2002, 'message': '用户已存在'}
    INVALID_CREDENTIALS = {'code': 2003, 'message': '用户名或密码错误'}
    
    # 项目相关错误码 (3001-3999)
    PROJECT_NOT_FOUND = {'code': 3001, 'message': '项目不存在'}
    PROJECTS_ALL_EXISTED = {'code': 3002, 'message': '项目均已存在'}
    
    # 价格配置相关错误码 (4001-4999)
    PRICE_CONFIG_NOT_FOUND = {'code': 4001, 'message': '价格配置不存在'}
    PRICE_CONFIG_DUPLICATE = {'code': 4002, 'message': '价格配置重复'}
    
    # 订单相关错误码 (5001-5999)
    ORDER_NOT_FOUND = {'code': 5001, 'message': '订单不存在'}
    ORDER_NUMBER_DUPLICATE = {'code': 5002, 'message': '订单号重复'}


    # 可以继续添加其他错误码和描述
