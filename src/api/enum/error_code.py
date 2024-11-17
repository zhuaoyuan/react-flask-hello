class ErrorCode:


    # 通用错误码
    SUCCESS = {'code': 0, 'message': '成功'}
    BAD_REQUEST = {'code': 1000, 'message': '参数错误'}
    INTERNAL_SERVER_ERROR = {'code': 1001, 'message': '服务器内部错误'}


    # 项目
    PROJECTS_ALL_EXISTED = {'code': 2001, 'message': '项目均已存在'}
    PROJECT_NOT_FOUND = {'code': 2002, 'message': '项目不存在'}


    # 可以继续添加其他错误码和描述
