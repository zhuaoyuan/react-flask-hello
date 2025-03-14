"""
此模块负责处理API路由、数据库操作和端点定义
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
from flask import Flask, request, jsonify, url_for, Blueprint
from api.models import db, User, ProjectInfo, ProjectPriceConfig, Order
from api.utils import generate_sitemap, APIException
from api.enum.error_code import ErrorCode
from flask_cors import CORS
from datetime import datetime
from sqlalchemy import or_, and_
import pdb
from api.enum.provinces_and_cities import provinces_and_cities

# 创建API蓝图
api = Blueprint('api', __name__)

# 允许跨域请求
CORS(api)

# 定义承运类型
TRANSPORT_TYPES = ['整车运输', '零担运输']

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

# 验证价格配置数据
def validate_price_config(price_config):
    """
    验证价格配置数据的正确性
    :param price_config: 价格配置数据列表
    :return: (bool, list) 是否验证通过，错误信息列表
    """
    errors = []
    unique_keys = set()

    for index, item in enumerate(price_config):
        # 验证省市是否存在
        if item['departure_province'] not in provinces_and_cities:
            errors.append(f"第 {index + 1} 行：出发省 '{item['departure_province']}' 不存在")
        elif item['departure_city'] not in provinces_and_cities[item['departure_province']]:
            errors.append(f"第 {index + 1} 行：出发市 '{item['departure_city']}' 不是 {item['departure_province']} 的城市")

        if item['destination_province'] not in provinces_and_cities:
            errors.append(f"第 {index + 1} 行：到达省 '{item['destination_province']}' 不存在")
        elif item['destination_city'] not in provinces_and_cities[item['destination_province']]:
            errors.append(f"第 {index + 1} 行：到达市 '{item['destination_city']}' 不是 {item['destination_province']} 的城市")

        # 验证承运类型
        if item['transport_type'] not in TRANSPORT_TYPES:
            errors.append(f"第 {index + 1} 行：承运类型必须是 '整车运输' 或 '零担运输'")

        # 验证唯一性
        key = f"{item['departure_province']}-{item['departure_city']}-{item['destination_province']}-{item['destination_city']}"
        if key in unique_keys:
            errors.append(f"第 {index + 1} 行：出发地-到达地组合重复")
        unique_keys.add(key)

        # 验证价格
        if not isinstance(item['price'], (int, float)) or item['price'] <= 0:
            errors.append(f"第 {index + 1} 行：价格必须是大于0的数字")

    return len(errors) == 0, errors

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


@api.route('/project/create', methods=['POST'])
def create_project():
    """
    创建新项目及其价格配置
    :return: 创建结果
    """
    try:
        data = request.get_json()
        
        # 验证必要字段
        required_fields = ['project_name', 'customer_name', 'start_date', 'end_date', 'price_config']
        for field in required_fields:
            if field not in data:
                return error_response(ErrorCode.BAD_REQUEST, f"缺少必要字段: {field}")

        # 检查项目名称是否已存在
        if ProjectInfo.query.filter_by(project_name=data['project_name']).first():
            return error_response(ErrorCode.BAD_REQUEST, "项目名称已存在")

        # 验证日期
        start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
        if start_date > end_date:
            return error_response(ErrorCode.BAD_REQUEST, "合作起始时间不能晚于结束时间")

        # 验证价格配置
        is_valid, errors = validate_price_config(data['price_config'])
        if not is_valid:
            return error_response(ErrorCode.BAD_REQUEST, "\n".join(errors))

        # 创建项目
        new_project = ProjectInfo(
            project_name=data['project_name'],
            customer_name=data['customer_name'],
            start_date=start_date,
            end_date=end_date,
            project_description=data.get('project_description', '')
        )
        db.session.add(new_project)
        db.session.flush()  # 获取新项目的ID

        # 创建价格配置
        price_configs = []
        for config in data['price_config']:
            price_config = ProjectPriceConfig(
                project_id=new_project.id,
                project_name=new_project.project_name,
                departure_province=config['departure_province'],
                departure_city=config['departure_city'],
                destination_province=config['destination_province'],
                destination_city=config['destination_city'],
                carrier_type=1 if config['transport_type'] == '整车运输' else 2,
                tonnage_upper_limit=999999,  # 默认上限
                tonnage_lower_limit=0,  # 默认下限
                unit_price=config['price']
            )
            price_configs.append(price_config)

        db.session.add_all(price_configs)
        db.session.commit()

        return success_response({
            'id': new_project.id,
            'project_name': new_project.project_name
        })

    except Exception as e:
        db.session.rollback()
        return error_response(ErrorCode.INTERNAL_SERVER_ERROR, str(e))

@api.route('/project_price_config/list', methods=['POST'])
def query_project_price_config():
    """
    查询项目价格配置
    :return: 分页后的价格配置列表
    """
    data = request.get_json()
    
    try:
        # 构建查询条件，添加明确的连接条件
        query = ProjectPriceConfig.query.join(
            ProjectInfo,
            ProjectPriceConfig.project_id == ProjectInfo.id
        )
        
        # 项目名称搜索
        if 'project_name' in data and data['project_name']:
            query = query.filter(ProjectInfo.project_name == data['project_name'])
        
        # 出发地筛选
        if 'departure_province' in data and data['departure_province']:
            query = query.filter(ProjectPriceConfig.departure_province == data['departure_province'])
            if 'departure_city' in data and data['departure_city']:
                query = query.filter(ProjectPriceConfig.departure_city == data['departure_city'])

        # 分页
        page = data.get('page', 1)
        per_page = data.get('per_page', 10)
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        # 构造返回数据
        items = [{
            'id': item.id,
            'project_id': item.project_id,
            'project_name': item.project_name,
            'departure_province': item.departure_province,
            'departure_city': item.departure_city,
            'destination_province': item.destination_province,
            'destination_city': item.destination_city,
            'carrier_type': item.carrier_type,
            'unit_price': item.unit_price
        } for item in pagination.items]

        return success_response({
            'items': items,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        })

    except Exception as e:
        return error_response(ErrorCode.INTERNAL_SERVER_ERROR, str(e))

@api.route('/project_price_config/upload', methods=['POST'])
def upload_project_price_config():
    """
    批量上传项目价格配置
    :return: 上传结果
    """
    price_data = request.get_json()
    if (not price_data) or (not price_data.get('upload_list')):
        return error_response(ErrorCode.BAD_REQUEST)

    new_prices = []
    error_messages = []

    for index, price in enumerate(price_data.get('upload_list')):
        # 检查项目是否存在
        project = ProjectInfo.query.filter_by(
            id=price['project_id'],
            project_name=price['project_name']
        ).first()
        
        # 计算行号
        sheet_index = index + 2

        if not project:
            error_messages.append(f"第{sheet_index}行：项目不存在")
            continue

        # 校验省市数据
        departure_province = price['departure_province']
        departure_city = price['departure_city']
        destination_province = price['destination_province']
        destination_city = price['destination_city']

        # 检查出发省份是否存在
        if departure_province not in provinces_and_cities:
            error_messages.append(f"第{sheet_index}行：出发省份 '{departure_province}' 不存在")
            continue

        # 检查出发城市是否属于该省份
        if departure_city not in provinces_and_cities[departure_province]:
            error_messages.append(f"第{sheet_index}行：出发城市 '{departure_city}' 不属于省份 '{departure_province}'")
            continue

        # 检查目的省份是否存在
        if destination_province not in provinces_and_cities:
            error_messages.append(f"第{sheet_index}行：目的省份 '{destination_province}' 不存在")
            continue

        # 检查目的城市是否属于该省份
        if destination_city not in provinces_and_cities[destination_province]:
            error_messages.append(f"第{sheet_index}行：目的城市 '{destination_city}' 不属于省份 '{destination_province}'")
            continue

        new_price = ProjectPriceConfig(
            project_id=price['project_id'],
            project_name=price['project_name'],
            departure_province=departure_province,
            departure_city=departure_city,
            destination_province=destination_province,
            destination_city=destination_city,
            carrier_type=1,  # 默认承运类型
            tonnage_upper_limit=999999,  # 默认上限
            tonnage_lower_limit=0,  # 默认下限
            unit_price=price['unit_price']
        )
        new_prices.append(new_price)

    try:
        # 如果有错误信息，返回错误
        if error_messages:
            error_message = "\n".join(error_messages)
            return error_response(ErrorCode.BAD_REQUEST, error_message)
        # 批量插入新价格配置
        if new_prices:
            db.session.add_all(new_prices)
            db.session.commit()
            return success_response()
        else:
            return error_response(ErrorCode.BAD_REQUEST)
    except Exception as e:
        db.session.rollback()
        return error_response(ErrorCode.INTERNAL_SERVER_ERROR)

@api.route('/order/list', methods=['POST'])
def get_orders():
    """
    获取订单列表，支持分页和搜索
    :return: 分页后的订单列表数据
    """
    data = request.get_json()
    page = data.get('page', 1)
    per_page = data.get('per_page', 10)
    
    # 构建查询条件
    query = Order.query
    
    # 项目筛选
    if 'project_name' in data and data['project_name']:
        query = query.filter(Order.project_name == data['project_name'])
    
    # 下单日期筛选
    if 'order_date_start' in data and data['order_date_start']:
        query = query.filter(Order.order_date >= datetime.strptime(data['order_date_start'], '%Y-%m-%d').date())
    if 'order_date_end' in data and data['order_date_end']:
        query = query.filter(Order.order_date <= datetime.strptime(data['order_date_end'], '%Y-%m-%d').date())
    
    # 发货日期筛选
    if 'delivery_date_start' in data and data['delivery_date_start']:
        query = query.filter(Order.delivery_date >= datetime.strptime(data['delivery_date_start'], '%Y-%m-%d').date())
    if 'delivery_date_end' in data and data['delivery_date_end']:
        query = query.filter(Order.delivery_date <= datetime.strptime(data['delivery_date_end'], '%Y-%m-%d').date())
    
    # 订单号搜索
    if 'order_number' in data and data['order_number']:
        query = query.filter(Order.order_number.like(f"%{data['order_number']}%"))
    
    # 送达地筛选
    if 'destination_province' in data and data['destination_province']:
        query = query.filter(Order.destination_province.like(f"%{data['destination_province']}%"))
    if 'destination_city' in data and data['destination_city']:
        query = query.filter(Order.destination_city.like(f"%{data['destination_city']}%"))

    # 按订单号降序排序
    query = query.order_by(Order.order_number.desc())
    
    # 执行分页查询
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    # 构造返回数据
    orders = [{
        'id': order.id,
        'project_id': order.project_id,
        'project_name': order.project_name,
        'order_number': order.order_number,
        'order_date': order.order_date.strftime('%Y-%m-%d'),
        'delivery_date': order.delivery_date.strftime('%Y-%m-%d'),
        'customer_info': order.customer_info,
        'cargo_info': order.cargo_info,
        'departure_province': order.departure_province,
        'departure_city': order.departure_city,
        'destination_province': order.destination_province,
        'destination_city': order.destination_city,
        'destination_address': order.destination_address,
        'remark': order.remark,
        'amount': float(order.amount),
        'status': order.status
    } for order in pagination.items]
    
    return success_response({
        'items': orders,
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    })

@api.route('/order/export', methods=['POST'])
def export_orders():
    """
    导出订单列表
    :return: 订单列表数据
    """
    data = request.get_json()
    
    # 构建查询条件
    query = Order.query
    
    # 项目筛选
    if 'project_name' in data and data['project_name']:
        query = query.filter(Order.project_name == data['project_name'])
    
    # 下单日期筛选
    if 'order_date_start' in data and data['order_date_start']:
        query = query.filter(Order.order_date >= datetime.strptime(data['order_date_start'], '%Y-%m-%d').date())
    if 'order_date_end' in data and data['order_date_end']:
        query = query.filter(Order.order_date <= datetime.strptime(data['order_date_end'], '%Y-%m-%d').date())
    
    # 发货日期筛选
    if 'delivery_date_start' in data and data['delivery_date_start']:
        query = query.filter(Order.delivery_date >= datetime.strptime(data['delivery_date_start'], '%Y-%m-%d').date())
    if 'delivery_date_end' in data and data['delivery_date_end']:
        query = query.filter(Order.delivery_date <= datetime.strptime(data['delivery_date_end'], '%Y-%m-%d').date())
    
    # 订单号搜索
    if 'order_number' in data and data['order_number']:
        query = query.filter(Order.order_number.like(f"%{data['order_number']}%"))
    
    # 送达地筛选
    if 'destination_province' in data and data['destination_province']:
        query = query.filter(Order.destination_province.like(f"%{data['destination_province']}%"))
    if 'destination_city' in data and data['destination_city']:
        query = query.filter(Order.destination_city.like(f"%{data['destination_city']}%"))

    # 按订单号降序排序
    query = query.order_by(Order.order_number.desc())
    
    # 获取所有符合条件的订单
    orders = query.all()
    
    # 构造返回数据
    orders_data = [{
        'order_number': order.order_number,
        'order_date': order.order_date.strftime('%Y-%m-%d'),
        'delivery_date': order.delivery_date.strftime('%Y-%m-%d'),
        'customer_info': order.customer_info,
        'cargo_info': order.cargo_info,
        'departure_province': order.departure_province,
        'departure_city': order.departure_city,
        'destination_province': order.destination_province,
        'destination_city': order.destination_city,
        'destination_address': order.destination_address,
        'remark': order.remark,
        'amount': float(order.amount),
        'status': order.status
    } for order in orders]
    
    return success_response({
        'items': orders_data
    })

@api.route('/order/import', methods=['POST'])
def import_orders():
    """
    导入订单
    :return: 导入结果
    """
    data = request.get_json()
    if not data or 'orders' not in data or 'project_id' not in data:
        return error_response(ErrorCode.BAD_REQUEST, '无效的请求数据')
    
    try:
        project = ProjectInfo.query.get(data['project_id'])
        if not project:
            return error_response(ErrorCode.BAD_REQUEST, '项目不存在')

        new_orders = []
        for order_data in data['orders']:
            # 检查订单号是否已存在
            if Order.query.filter_by(order_number=order_data['order_number']).first():
                continue
            
            # 创建新订单
            new_order = Order(
                project_id=project.id,
                project_name=project.project_name,
                order_number=order_data['order_number'],
                order_date=datetime.strptime(order_data['order_date'], '%Y-%m-%d').date(),
                delivery_date=datetime.strptime(order_data['delivery_date'], '%Y-%m-%d').date(),
                customer_info=order_data['customer_info'],
                cargo_info=order_data['cargo_info'],
                departure_province=order_data['departure_province'],
                departure_city=order_data['departure_city'],
                destination_province=order_data['destination_province'],
                destination_city=order_data['destination_city'],
                destination_address=order_data.get('destination_address'),
                remark=order_data.get('remark'),
                amount=order_data.get('amount', 0),
                status='新建'
            )
            new_orders.append(new_order)
        
        if new_orders:
            db.session.add_all(new_orders)
            db.session.commit()
            return success_response({'imported_count': len(new_orders)})
        else:
            return error_response(ErrorCode.BAD_REQUEST, '没有新的订单需要导入')
            
    except Exception as e:
        db.session.rollback()
        return error_response(ErrorCode.INTERNAL_SERVER_ERROR, str(e))