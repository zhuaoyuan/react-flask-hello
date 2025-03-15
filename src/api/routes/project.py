from flask import request, jsonify, Blueprint
from api.models import db, ProjectInfo, ProjectPriceConfig
from api.enum.error_code import ErrorCode
from api.enum.provinces_and_cities import provinces_and_cities
from api.utils import success_response, error_response, register_error_handlers
from datetime import datetime
from sqlalchemy import or_

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

@project.route('/list', methods=['POST'])
def get_projects():
    """获取项目列表，支持分页和搜索"""
    data = request.get_json()
    page = data.get('page', 1)
    per_page = data.get('per_page', 10)
    search_query = data.get('search_query', '')

    query = ProjectInfo.query
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
def bulk_add_projects():
    """批量添加项目"""
    projects_data = request.get_json()
    if (not projects_data) or (not projects_data.get('upload_list')):
        return error_response(ErrorCode.BAD_REQUEST)

    new_projects = []
    for project in projects_data.get('upload_list'):
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

    if new_projects:
        db.session.add_all(new_projects)
        db.session.commit()
        return success_response()
    else:
        return error_response(ErrorCode.PROJECTS_ALL_EXISTED)

@project.route('/edit', methods=['POST'])
def edit_project():
    """编辑项目信息"""
    data = request.json
    id = data.get('id')
    project = ProjectInfo.query.get(id)
    if not project:
        return error_response(ErrorCode.PROJECT_NOT_FOUND)

    project.project_name = data.get('project_name', project.project_name)
    project.customer_name = data.get('customer_name', project.customer_name)
    project.start_date = datetime.strptime(data.get('start_date'), '%Y-%m-%d').date()
    project.end_date = datetime.strptime(data.get('end_date'), '%Y-%m-%d').date()
    project.project_description = data.get('project_description', project.project_description)

    try:
        db.session.commit()
        return success_response(project.to_dict())
    except Exception as e:
        db.session.rollback()
        return error_response(ErrorCode.INTERNAL_SERVER_ERROR)

@project.route('/delete', methods=['POST'])
def delete_project():
    """删除项目"""
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

@project.route('/create', methods=['POST'])
def create_project():
    """创建新项目及其价格配置"""
    try:
        data = request.get_json()
        
        required_fields = ['project_name', 'customer_name', 'start_date', 'end_date', 'price_config']
        for field in required_fields:
            if field not in data:
                return error_response(ErrorCode.BAD_REQUEST, f"缺少必要字段: {field}")

        if ProjectInfo.query.filter_by(project_name=data['project_name']).first():
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
                carrier_type=1 if config['transport_type'] == '整车运输' else 2,
                tonnage_upper_limit=999999,
                tonnage_lower_limit=0,
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

@project.route('/price_config/list', methods=['POST'])
def query_project_price_config():
    """查询项目价格配置"""
    data = request.get_json()
    
    try:
        query = ProjectPriceConfig.query.join(
            ProjectInfo,
            ProjectPriceConfig.project_id == ProjectInfo.id
        )
        
        if 'project_name' in data and data['project_name']:
            query = query.filter(ProjectInfo.project_name == data['project_name'])
        
        if 'departure_province' in data and data['departure_province']:
            query = query.filter(ProjectPriceConfig.departure_province == data['departure_province'])
            if 'departure_city' in data and data['departure_city']:
                query = query.filter(ProjectPriceConfig.departure_city == data['departure_city'])

        page = data.get('page', 1)
        per_page = data.get('per_page', 10)
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

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

@project.route('/price_config/upload', methods=['POST'])
def upload_project_price_config():
    """批量上传项目价格配置"""
    price_data = request.get_json()
    if (not price_data) or (not price_data.get('upload_list')):
        return error_response(ErrorCode.BAD_REQUEST)

    new_prices = []
    error_messages = []

    for index, price in enumerate(price_data.get('upload_list')):
        project = ProjectInfo.query.filter_by(
            id=price['project_id'],
            project_name=price['project_name']
        ).first()
        
        sheet_index = index + 2

        if not project:
            error_messages.append(f"第{sheet_index}行：项目不存在")
            continue

        departure_province = price['departure_province']
        departure_city = price['departure_city']
        destination_province = price['destination_province']
        destination_city = price['destination_city']

        if departure_province not in provinces_and_cities:
            error_messages.append(f"第{sheet_index}行：出发省份 '{departure_province}' 不存在")
            continue

        if departure_city not in provinces_and_cities[departure_province]:
            error_messages.append(f"第{sheet_index}行：出发城市 '{departure_city}' 不属于省份 '{departure_province}'")
            continue

        if destination_province not in provinces_and_cities:
            error_messages.append(f"第{sheet_index}行：目的省份 '{destination_province}' 不存在")
            continue

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
            carrier_type=1,
            tonnage_upper_limit=999999,
            tonnage_lower_limit=0,
            unit_price=price['unit_price']
        )
        new_prices.append(new_price)

    try:
        if error_messages:
            error_message = "\n".join(error_messages)
            return error_response(ErrorCode.BAD_REQUEST, error_message)
        if new_prices:
            db.session.add_all(new_prices)
            db.session.commit()
            return success_response()
        else:
            return error_response(ErrorCode.BAD_REQUEST)
    except Exception as e:
        db.session.rollback()
        return error_response(ErrorCode.INTERNAL_SERVER_ERROR) 