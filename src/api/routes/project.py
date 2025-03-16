from flask import request, jsonify, Blueprint
from api.models import db, ProjectInfo, ProjectPriceConfig, Order
from api.enum.error_code import ErrorCode
from api.utils import success_response, error_response, register_error_handlers
from datetime import datetime
from sqlalchemy import or_, text
from functools import wraps

def transactional(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # 设置事务隔离级别为REPEATABLE READ
            db.session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ"))
            
            # 执行函数
            result = f(*args, **kwargs)
            
            # 提交事务
            db.session.commit()
            return result
        except Exception as e:
            # 回滚事务
            db.session.rollback()
            raise e
        finally:
            # 确保会话被正确清理
            db.session.remove()
    return decorated_function

project = Blueprint('project', __name__)
# 注册全局错误处理器
register_error_handlers(project)

# 定义承运类型
TRANSPORT_TYPES = ['整车运输', '零担运输']

# 验证价格配置数据
def validate_price_config(price_config):
    errors = []
    unique_keys = set()

    for index, item in enumerate(price_config):
        # 校验必填字段
        if not item['departure_province'] or not item['departure_city'] or \
           not item['destination_province'] or not item['destination_city']:
            errors.append(f"第 {index + 1} 行：出发地和到达地的省市信息不能为空")

        # 校验唯一性
        key = f"{item['departure_province']}-{item['departure_city']}-{item['destination_province']}-{item['destination_city']}"
        if key in unique_keys:
            errors.append(f"第 {index + 1} 行：出发地-到达地组合重复")
        unique_keys.add(key)

        # 校验价格
        if not isinstance(item['price'], (int, float)) or item['price'] <= 0:
            errors.append(f"第 {index + 1} 行：价格必须是大于0的数字")

    return len(errors) == 0, errors

@project.route('/list', methods=['POST'])
def get_projects():
    """获取项目列表，支持分页和搜索"""
    data = request.get_json()
    page = data.get('page', 1)
    per_page = data.get('per_page', 10)
    search_query = data.get('search_query', '')

    query = ProjectInfo.query.filter(ProjectInfo.is_deleted == 0)
    if search_query:
        query = query.filter(or_(
            ProjectInfo.project_name.like(f'%{search_query}%'),
            ProjectInfo.customer_name.like(f'%{search_query}%')
        ))

    query = query.order_by(ProjectInfo.id.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    projects = pagination.items

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

    return jsonify({
        'data': projects_list,
        'total': pagination.total,
        'pages': pagination.pages,
        'page': page
    })

@project.route('/upload', methods=['POST'])
@transactional
def bulk_add_projects():
    """批量添加项目"""
    projects_data = request.get_json()
    if (not projects_data) or (not projects_data.get('upload_list')):
        return error_response(ErrorCode.BAD_REQUEST)

    new_projects = []
    for project in projects_data.get('upload_list'):
        existing_project = ProjectInfo.query.filter_by(
            project_name=project['project_name'],
            is_deleted=0
        ).with_for_update().first()
        
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
            suffix = 1
            while True:
                new_project_name = f"{project['project_name']}_{suffix}"
                if not ProjectInfo.query.filter_by(
                    project_name=new_project_name,
                    is_deleted=0
                ).first():
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

    if new_projects:
        db.session.add_all(new_projects)
        return success_response()
    else:
        return error_response(ErrorCode.PROJECTS_ALL_EXISTED)

@project.route('/edit', methods=['POST'])
@transactional
def edit_project():
    """编辑项目信息"""
    data = request.json
    id = data.get('id')
    project = ProjectInfo.query.filter_by(id=id, is_deleted=0).with_for_update().first()
    if not project:
        return error_response(ErrorCode.PROJECT_NOT_FOUND)

    project.project_name = data.get('project_name', project.project_name)
    project.customer_name = data.get('customer_name', project.customer_name)
    project.start_date = datetime.strptime(data.get('start_date'), '%Y-%m-%d').date()
    project.end_date = datetime.strptime(data.get('end_date'), '%Y-%m-%d').date()
    project.project_description = data.get('project_description', project.project_description)

    return success_response(project.to_dict())

@project.route('/delete', methods=['POST'])
@transactional
def delete_project():
    """删除项目"""
    data = request.json
    id = data.get('id')
    project = ProjectInfo.query.filter_by(id=id, is_deleted=0).with_for_update().first()
    if not project:
        return error_response(ErrorCode.PROJECT_NOT_FOUND)

    try:
        print(f"[事务开始] 删除项目，ID：{id}，项目名称：{project.project_name}")
        
        # 查找并逻辑删除项目下的所有订单
        orders = Order.query.filter_by(
            project_id=project.id,
            is_deleted=0
        ).with_for_update().all()
        
        print(f"[事务处理] 找到{len(orders)}个关联订单")
        for order in orders:
            order.is_deleted = order.id
            print(f"[事务处理] 设置订单{order.sub_order_number} is_deleted={order.id}")
            db.session.add(order)
        
        # 逻辑删除项目
        project.is_deleted = project.id
        print(f"[事务处理] 设置项目is_deleted={project.id}")
        db.session.add(project)
        db.session.flush()  # 立即刷新确保更新生效
        
        # 验证项目更新是否成功
        db.session.refresh(project)  # 从数据库重新加载记录
        print(f"[事务验证1] 刷新后项目is_deleted={project.is_deleted}")
        
        # 查找并逻辑删除关联的价格配置
        price_configs = ProjectPriceConfig.query.filter_by(
            project_id=project.id,
            is_deleted=0
        ).with_for_update().all()
        
        print(f"[事务处理] 找到{len(price_configs)}条关联的价格配置")
        for price_config in price_configs:
            price_config.is_deleted = price_config.id
            print(f"[事务处理] 设置价格配置is_deleted={price_config.id}")
            db.session.add(price_config)
        
        db.session.flush()  # 立即刷新确保所有更新生效
        
        # 再次验证项目状态
        db.session.expire_all()  # 使所有对象过期，强制重新加载
        check_project = ProjectInfo.query.get(project.id)
        print(f"[事务验证2] 重新查询项目is_deleted={check_project.is_deleted}")
        
        # 验证价格配置更新
        for price_config in price_configs:
            db.session.refresh(price_config)
            print(f"[事务验证3] 价格配置{price_config.id} is_deleted={price_config.is_deleted}")
        
        # 验证订单更新
        for order in orders:
            db.session.refresh(order)
            print(f"[事务验证4] 订单{order.sub_order_number} is_deleted={order.is_deleted}")
        
        print(f"[事务处理] 删除项目关联的{len(price_configs)}条价格配置和{len(orders)}个订单")
        print("[事务完成] 项目删除成功")
        
        # 最后一次验证
        final_check = ProjectInfo.query.get(project.id)
        print(f"[事务验证5] 最终验证项目is_deleted={final_check.is_deleted}")
        
        return success_response()
    except Exception as e:
        print(f"[事务回滚] 项目删除失败：{str(e)}")
        raise

@project.route('/create', methods=['POST'])
@transactional
def create_project():
    """创建新项目及其价格配置"""
    try:
        data = request.get_json()
        
        required_fields = ['project_name', 'customer_name', 'start_date', 'end_date', 'price_config']
        for field in required_fields:
            if field not in data:
                return error_response(ErrorCode.BAD_REQUEST, f"缺少必要字段: {field}")

        if ProjectInfo.query.filter_by(project_name=data['project_name'], is_deleted=0).first():
            return error_response(ErrorCode.BAD_REQUEST, "项目名称已存在")

        start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
        if start_date > end_date:
            return error_response(ErrorCode.BAD_REQUEST, "合作起始时间不能晚于结束时间")

        is_valid, errors = validate_price_config(data['price_config'])
        if not is_valid:
            return error_response(ErrorCode.BAD_REQUEST, "\n".join(errors))

        new_project = ProjectInfo(
            project_name=data['project_name'],
            customer_name=data['customer_name'],
            start_date=start_date,
            end_date=end_date,
            project_description=data.get('project_description', '')
        )
        db.session.add(new_project)
        db.session.flush()

        price_configs = []
        for config in data['price_config']:
            price_config = ProjectPriceConfig(
                project_id=new_project.id,
                project_name=new_project.project_name,
                departure_province=config['departure_province'],
                departure_city=config['departure_city'],
                destination_province=config['destination_province'],
                destination_city=config['destination_city'],
                tonnage_upper_limit=999999,
                tonnage_lower_limit=0,
                unit_price=config['price']
            )
            price_configs.append(price_config)

        db.session.add_all(price_configs)
        return success_response({
            'id': new_project.id,
            'project_name': new_project.project_name
        })

    except Exception as e:
        print(f"[事务回滚] 创建项目失败：{str(e)}")
        raise

@project.route('/price_config/list', methods=['POST'])
def query_project_price_config():
    """查询项目价格配置"""
    data = request.get_json()
    
    try:
        # 获取项目信息
        project = ProjectInfo.query.filter_by(
            project_name=data['project_name'],
            is_deleted=0
        ).first()
        
        if not project:
            return error_response(ErrorCode.PROJECT_NOT_FOUND)

        # 查询价格配置
        query = ProjectPriceConfig.query.filter(
            ProjectPriceConfig.project_id == project.id,
            ProjectPriceConfig.is_deleted == 0
        )

        # 添加筛选条件
        if data.get('departure_province'):
            query = query.filter(ProjectPriceConfig.departure_province == data['departure_province'])
        if data.get('departure_city'):
            query = query.filter(ProjectPriceConfig.departure_city == data['departure_city'])
            
        if data.get('destination_province'):
            query = query.filter(ProjectPriceConfig.destination_province == data['destination_province'])
        if data.get('destination_city'):
            query = query.filter(ProjectPriceConfig.destination_city == data['destination_city'])
            
        if data.get('price_min') is not None:
            query = query.filter(ProjectPriceConfig.unit_price >= data['price_min'])
        if data.get('price_max') is not None:
            query = query.filter(ProjectPriceConfig.unit_price <= data['price_max'])

        # 分页
        page = data.get('page', 1)
        per_page = data.get('per_page', 10)
        
        # 获取分页数据
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        items = pagination.items

        # 转换为字典列表
        result = [{
            'id': item.id,
            'departure_province': item.departure_province,
            'departure_city': item.departure_city,
            'destination_province': item.destination_province,
            'destination_city': item.destination_city,
            'unit_price': float(item.unit_price)
        } for item in items]

        return success_response({
            'items': result,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        })

    except Exception as e:
        print(f"查询价格配置失败：{str(e)}")
        return error_response(ErrorCode.INTERNAL_SERVER_ERROR, str(e))

@project.route('/price_config/upload', methods=['POST'])
@transactional
def upload_project_price_config():
    """批量上传项目价格配置"""
    price_data = request.get_json()
    if (not price_data) or (not price_data.get('upload_list')):
        return error_response(ErrorCode.BAD_REQUEST)

    new_prices = []
    updated_prices = []
    error_messages = []

    for index, price in enumerate(price_data.get('upload_list')):
        project = ProjectInfo.query.filter_by(
            id=price['project_id'],
            project_name=price['project_name'],
            is_deleted=0
        ).with_for_update().first()
        
        sheet_index = index + 2

        if not project:
            error_messages.append(f"第{sheet_index}行：项目不存在")
            continue

        departure_province = price['departure_province']
        departure_city = price['departure_city']
        destination_province = price['destination_province']
        destination_city = price['destination_city']

        # 校验必填字段
        if not departure_province or not departure_city or \
           not destination_province or not destination_city:
            error_messages.append(f"第{sheet_index}行：出发地和到达地的省市信息不能为空")
            continue

        # 查找是否存在相同的价格配置
        existing_price = ProjectPriceConfig.query.filter_by(
            project_id=price['project_id'],
            departure_province=departure_province,
            departure_city=departure_city,
            destination_province=destination_province,
            destination_city=destination_city,
            is_deleted=0
        ).with_for_update().first()

        if existing_price:
            # 更新已存在的价格配置
            existing_price.unit_price = price['unit_price']
            updated_prices.append(existing_price)
        else:
            # 创建新的价格配置
            new_price = ProjectPriceConfig(
                project_id=price['project_id'],
                project_name=price['project_name'],
                departure_province=departure_province,
                departure_city=departure_city,
                destination_province=destination_province,
                destination_city=destination_city,
                tonnage_upper_limit=999999,
                tonnage_lower_limit=0,
                unit_price=price['unit_price']
            )
            new_prices.append(new_price)

    try:
        if error_messages:
            error_message = "\n".join(error_messages)
            return error_response(ErrorCode.BAD_REQUEST, error_message)

        # 批量更新和新增
        if updated_prices:
            for price in updated_prices:
                db.session.add(price)
        if new_prices:
            db.session.add_all(new_prices)

        return success_response({
            'message': f'成功更新{len(updated_prices)}条记录，新增{len(new_prices)}条记录'
        })
    except Exception as e:
        print(f"[事务回滚] 上传价格配置失败：{str(e)}")
        raise

@project.route('/carrier/list', methods=['POST'])
def get_carrier_list():
    """获取项目下的承运人列表"""
    data = request.get_json()
    
    try:
        print(f"获取承运人列表，项目名称: {data.get('project_name')}")
        
        # 获取项目信息
        project = ProjectInfo.query.filter_by(
            project_name=data['project_name'],
            is_deleted=0
        ).first()
        
        if not project:
            print(f"项目未找到: {data.get('project_name')}")
            return error_response(ErrorCode.PROJECT_NOT_FOUND)

        print(f"找到项目，ID: {project.id}")

        # 查询该项目下的所有不同承运人
        carriers = db.session.query(
            Order.carrier_name
        ).filter(
            Order.project_id == project.id,
            Order.is_deleted == 0,
            Order.carrier_name.isnot(None),  # 排除 null 值
            Order.carrier_name != ''  # 排除空字符串
        ).distinct().all()
        
        # 转换为列表，过滤掉 None 值
        carrier_list = [carrier[0] for carrier in carriers if carrier[0] is not None and carrier[0].strip() != '']
        
        print(f"找到承运人列表: {carrier_list}")
        
        return success_response(carrier_list)

    except Exception as e:
        print(f"获取承运人列表失败：{str(e)}")
        return error_response(ErrorCode.INTERNAL_SERVER_ERROR, str(e))

@project.route('/profit/list', methods=['POST'])
def query_project_profit():
    """查询项目利润数据"""
    data = request.get_json()
    
    try:
        # 获取项目信息
        project = ProjectInfo.query.filter_by(
            project_name=data['project_name'],
            is_deleted=0
        ).first()
        
        if not project:
            return error_response(ErrorCode.PROJECT_NOT_FOUND)

        # 获取分组字段
        group_by = data.get('group_by', ['province', 'city', 'carrier'])
        
        # 构建查询字段
        select_fields = []
        group_by_fields = []
        
        # 动态添加分组字段
        if 'province' in group_by:
            select_fields.append(Order.destination_province.label('province'))
            group_by_fields.append(Order.destination_province)
        else:
            select_fields.append(db.literal('全部').label('province'))
            
        if 'city' in group_by:
            select_fields.append(Order.destination_city.label('city'))
            group_by_fields.append(Order.destination_city)
        else:
            select_fields.append(db.literal('全部').label('city'))
            
        if 'carrier' in group_by:
            select_fields.append(Order.carrier_name.label('carrier'))
            group_by_fields.append(Order.carrier_name)
        else:
            select_fields.append(db.literal('全部').label('carrier'))
        
        # 添加聚合字段
        select_fields.extend([
            db.func.sum(Order.amount).label('income'),
            db.func.sum(Order.carrier_fee).label('expense'),
            db.func.sum(Order.amount - Order.carrier_fee).label('profit')
        ])

        # 构建基础查询
        query = db.session.query(*select_fields).filter(
            Order.project_id == project.id,
            Order.carrier_type != None,
            Order.is_deleted == 0
        )

        # 添加筛选条件
        if data.get('destination_province'):
            query = query.filter(Order.destination_province == data['destination_province'])
        if data.get('destination_city'):
            query = query.filter(Order.destination_city == data['destination_city'])
        if data.get('carriers'):
            query = query.filter(Order.carrier_name.in_(data['carriers']))

        # 添加分组
        if group_by_fields:
            query = query.group_by(*group_by_fields)

        # 分页
        page = data.get('page', 1)
        per_page = data.get('per_page', 10)
        
        # 计算总数
        total_query = query.from_self().count()
        
        # 获取分页数据
        items = query.offset((page - 1) * per_page).limit(per_page).all()
        
        # 转换为字典列表
        result = [{
            'id': '-'.join(str(getattr(item, field)) for field in ['province', 'city', 'carrier']),
            'province': item.province,
            'city': item.city,
            'carrier': item.carrier or '-',
            'income': float(item.income or 0),
            'expense': float(item.expense or 0),
            'profit': float(item.profit or 0)
        } for item in items]

        return success_response({
            'items': result,
            'total': total_query,
            'pages': (total_query + per_page - 1) // per_page,
            'current_page': page
        })

    except Exception as e:
        print(f"查询项目利润数据失败：{str(e)}")
        return error_response(ErrorCode.INTERNAL_SERVER_ERROR, str(e))

@project.route('/price_config/delete', methods=['POST'])
@transactional
def delete_price_config():
    """删除价格配置"""
    data = request.json
    id = data.get('id')
    
    try:
        # 查找价格配置
        price_config = ProjectPriceConfig.query.filter_by(
            id=id,
            is_deleted=0
        ).with_for_update().first()
        
        if not price_config:
            return error_response(ErrorCode.BAD_REQUEST, "价格配置不存在")
        
        # 逻辑删除
        price_config.is_deleted = price_config.id
        db.session.add(price_config)
        
        return success_response()
    except Exception as e:
        print(f"[事务回滚] 删除价格配置失败：{str(e)}")
        raise 