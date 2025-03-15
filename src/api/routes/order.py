from flask import request, jsonify, Blueprint
from api.models import db, Order, ProjectInfo, ProjectPriceConfig
from api.enum.error_code import ErrorCode
from api.utils import success_response, error_response, register_error_handlers
from datetime import datetime

order = Blueprint('order', __name__)
# 注册全局错误处理器
register_error_handlers(order)

@order.route('/list', methods=['POST'])
def get_orders():
    """获取订单列表，支持分页和搜索"""
    data = request.get_json()
    page = data.get('page', 1)
    per_page = data.get('per_page', 10)
    
    query = Order.query
    
    if 'project_name' in data and data['project_name']:
        query = query.filter(Order.project_name == data['project_name'])
    
    if 'order_date_start' in data and data['order_date_start']:
        query = query.filter(Order.order_date >= datetime.strptime(data['order_date_start'], '%Y-%m-%d').date())
    if 'order_date_end' in data and data['order_date_end']:
        query = query.filter(Order.order_date <= datetime.strptime(data['order_date_end'], '%Y-%m-%d').date())
    
    if 'delivery_date_start' in data and data['delivery_date_start']:
        query = query.filter(Order.delivery_date >= datetime.strptime(data['delivery_date_start'], '%Y-%m-%d').date())
    if 'delivery_date_end' in data and data['delivery_date_end']:
        query = query.filter(Order.delivery_date <= datetime.strptime(data['delivery_date_end'], '%Y-%m-%d').date())
    
    if 'order_number' in data and data['order_number']:
        query = query.filter(Order.order_number.like(f"%{data['order_number']}%"))
    
    if 'destination_province' in data and data['destination_province']:
        query = query.filter(Order.destination_province.like(f"%{data['destination_province']}%"))
    if 'destination_city' in data and data['destination_city']:
        query = query.filter(Order.destination_city.like(f"%{data['destination_city']}%"))

    query = query.order_by(Order.order_number.desc())
    
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
     
    orders = [{
        'id': order.id,
        'project_id': order.project_id,
        'project_name': order.project_name,
        'order_number': order.order_number,
        'sub_order_number': order.sub_order_number,
        'order_date': order.order_date.strftime('%Y-%m-%d'),
        'delivery_date': order.delivery_date.strftime('%Y-%m-%d'),
        'product_name': order.product_name,
        'quantity': order.quantity,
        'weight': float(order.weight) if order.weight else 0,
        'departure_province': order.departure_province,
        'departure_city': order.departure_city,
        'destination_province': order.destination_province,
        'destination_city': order.destination_city,
        'destination_address': order.destination_address,
        'remark': order.remark,
        'amount': float(order.amount),
        'carrier_type': order.carrier_type,
        'carrier_name': order.carrier_name,
        'carrier_phone': order.carrier_phone,
        'carrier_plate': order.carrier_plate,
        'carrier_fee': float(order.carrier_fee) if order.carrier_fee else None
    } for order in pagination.items]
    
    return success_response({
        'items': orders,
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    })

@order.route('/export', methods=['POST'])
def export_orders():
    """导出订单列表"""
    data = request.get_json()
    
    query = Order.query
    
    if 'project_name' in data and data['project_name']:
        query = query.filter(Order.project_name == data['project_name'])
    
    if 'order_date_start' in data and data['order_date_start']:
        query = query.filter(Order.order_date >= datetime.strptime(data['order_date_start'], '%Y-%m-%d').date())
    if 'order_date_end' in data and data['order_date_end']:
        query = query.filter(Order.order_date <= datetime.strptime(data['order_date_end'], '%Y-%m-%d').date())
    
    if 'delivery_date_start' in data and data['delivery_date_start']:
        query = query.filter(Order.delivery_date >= datetime.strptime(data['delivery_date_start'], '%Y-%m-%d').date())
    if 'delivery_date_end' in data and data['delivery_date_end']:
        query = query.filter(Order.delivery_date <= datetime.strptime(data['delivery_date_end'], '%Y-%m-%d').date())
    
    if 'order_number' in data and data['order_number']:
        query = query.filter(Order.order_number.like(f"%{data['order_number']}%"))
    
    if 'destination_province' in data and data['destination_province']:
        query = query.filter(Order.destination_province.like(f"%{data['destination_province']}%"))
    if 'destination_city' in data and data['destination_city']:
        query = query.filter(Order.destination_city.like(f"%{data['destination_city']}%"))

    query = query.order_by(Order.order_number.desc())
    
    orders = query.all()
    
    orders_data = [{
        'order_number': order.order_number,
        'sub_order_number': order.sub_order_number,
        'order_date': order.order_date.strftime('%Y-%m-%d'),
        'delivery_date': order.delivery_date.strftime('%Y-%m-%d'),
        'product_name': order.product_name,
        'quantity': order.quantity,
        'weight': float(order.weight) if order.weight else 0,
        'departure_province': order.departure_province,
        'departure_city': order.departure_city,
        'destination_province': order.destination_province,
        'destination_city': order.destination_city,
        'destination_address': order.destination_address,
        'remark': order.remark,
        'amount': float(order.amount)
    } for order in orders]
    
    return success_response({
        'items': orders_data
    })

@order.route('/import', methods=['POST'])
def import_orders():
    """导入订单"""
    data = request.get_json()
    if not data or 'orders' not in data or 'project_id' not in data or 'project_name' not in data:
        return error_response(ErrorCode.BAD_REQUEST, '无效的请求数据')
    
    try:
        project = ProjectInfo.query.get(data['project_id'])
        if not project:
            return error_response(ErrorCode.BAD_REQUEST, '项目不存在')
        if project.project_name != data['project_name']:
            return error_response(ErrorCode.BAD_REQUEST, '项目ID与项目名称不匹配')

        price_configs = ProjectPriceConfig.query.filter_by(project_id=project.id).all()
        if not price_configs:
            return error_response(ErrorCode.BAD_REQUEST, '项目未配置价格')

        price_config_dict = {}
        for config in price_configs:
            key = f"{config.departure_province}-{config.departure_city}-{config.destination_province}-{config.destination_city}"
            price_config_dict[key] = config.unit_price

        new_orders = []
        errors = []
        for index, order_data in enumerate(data['orders']):
            route_key = f"{order_data['departure_province']}-{order_data['departure_city']}-{order_data['destination_province']}-{order_data['destination_city']}"
            
            if route_key not in price_config_dict:
                errors.append(f"第{index + 1}行：出发地（{order_data['departure_province']}{order_data['departure_city']}）到达地（{order_data['destination_province']}{order_data['destination_city']}）的价格配置不存在")
                continue

            unit_price = price_config_dict[route_key]
            amount = float(order_data['weight']) * unit_price

            # 生成子订单号
            sub_order_number = f"{order_data['order_number']}-1"
            # 检查子订单号是否已存在，如果存在则递增序号
            seq = 1
            while Order.query.filter_by(sub_order_number=sub_order_number).first():
                seq += 1
                sub_order_number = f"{order_data['order_number']}-{seq}"

            new_order = Order(
                project_id=project.id,
                project_name=project.project_name,
                order_number=order_data['order_number'],
                sub_order_number=sub_order_number,
                order_date=datetime.strptime(order_data['order_date'], '%Y-%m-%d').date(),
                delivery_date=datetime.strptime(order_data['delivery_date'], '%Y-%m-%d').date(),
                product_name=order_data['product_name'],
                quantity=order_data['quantity'],
                weight=order_data['weight'],
                departure_province=order_data['departure_province'],
                departure_city=order_data['departure_city'],
                destination_province=order_data['destination_province'],
                destination_city=order_data['destination_city'],
                destination_address=order_data.get('destination_address'),
                remark=order_data.get('remark'),
                amount=amount
            )
            new_orders.append(new_order)

        if errors:
            return error_response(ErrorCode.BAD_REQUEST, '\n'.join(errors))
        
        if new_orders:
            db.session.add_all(new_orders)
            db.session.commit()
            return success_response({'imported_count': len(new_orders)})
        else:
            return error_response(ErrorCode.BAD_REQUEST, '没有新的订单需要导入')
            
    except Exception as e:
        db.session.rollback()
        return error_response(ErrorCode.INTERNAL_SERVER_ERROR, str(e))

@order.route('/delete', methods=['POST'])
def delete_order():
    """删除订单"""
    data = request.json
    id = data.get('id')
    order = Order.query.get(id)
    if not order:
        return error_response(ErrorCode.BAD_REQUEST, '订单不存在')

    try:
        db.session.delete(order)
        db.session.commit()
        return success_response()
    except Exception as e:
        db.session.rollback()
        return error_response(ErrorCode.INTERNAL_SERVER_ERROR, str(e))

@order.route('/edit', methods=['POST'])
def edit_order():
    """编辑订单"""
    data = request.json
    if not data or 'id' not in data:
        return error_response(ErrorCode.BAD_REQUEST, '无效的请求数据')

    try:
        order = Order.query.get(data['id'])
        if not order:
            return error_response(ErrorCode.BAD_REQUEST, '订单不存在')

        price_configs = ProjectPriceConfig.query.filter_by(project_id=order.project_id).all()
        if not price_configs:
            return error_response(ErrorCode.BAD_REQUEST, '项目未配置价格')

        price_config_dict = {}
        for config in price_configs:
            key = f"{config.departure_province}-{config.departure_city}-{config.destination_province}-{config.destination_city}"
            price_config_dict[key] = config.unit_price

        departure_province = data.get('departure_province', order.departure_province)
        departure_city = data.get('departure_city', order.departure_city)
        destination_province = data.get('destination_province', order.destination_province)
        destination_city = data.get('destination_city', order.destination_city)
        route_key = f"{departure_province}-{departure_city}-{destination_province}-{destination_city}"

        if route_key not in price_config_dict:
            return error_response(ErrorCode.BAD_REQUEST, f"出发地（{departure_province}{departure_city}）到达地（{destination_province}{destination_city}）的价格配置不存在")

        order.order_number = data.get('order_number', order.order_number)
        order.order_date = datetime.strptime(data.get('order_date'), '%Y-%m-%d').date() if data.get('order_date') else order.order_date
        order.product_name = data.get('product_name', order.product_name)
        order.quantity = data.get('quantity', order.quantity)
        order.weight = data.get('weight', order.weight)
        order.departure_province = departure_province
        order.departure_city = departure_city
        order.destination_province = destination_province
        order.destination_city = destination_city
        order.destination_address = data.get('destination_address', order.destination_address)
        order.remark = data.get('remark', order.remark)

        unit_price = price_config_dict[route_key]
        order.amount = float(order.weight) * unit_price

        db.session.commit()
        return success_response()
    except Exception as e:
        db.session.rollback()
        return error_response(ErrorCode.INTERNAL_SERVER_ERROR, str(e))

@order.route('/import_delivery', methods=['POST'])
def import_delivery():
    """导入送货信息"""
    data = request.get_json()
    if not data or 'deliveries' not in data:
        return error_response(ErrorCode.BAD_REQUEST, '无效的请求数据')
    
    try:
        errors = []
        updated_orders = []
        
        for delivery in data['deliveries']:
            # 根据子订单号查找订单
            for sub_order_number in delivery['sub_order_numbers']:
                order = Order.query.filter_by(sub_order_number=sub_order_number).first()
                if not order:
                    errors.append(f"子订单号 {sub_order_number} 不存在")
                    continue
                
                # 更新订单的承运信息
                order.carrier_type = delivery['carrier_type']
                order.carrier_name = delivery['carrier_name']
                order.carrier_phone = delivery.get('carrier_phone')
                order.carrier_plate = delivery.get('carrier_plate')
                order.carrier_fee = delivery.get('carrier_fee')
                
                updated_orders.append(order)

        if errors:
            db.session.rollback()
            return error_response(ErrorCode.BAD_REQUEST, '\n'.join(errors))
        
        if updated_orders:
            db.session.commit()
            return success_response({'updated_count': len(updated_orders)})
        else:
            return error_response(ErrorCode.BAD_REQUEST, '没有订单需要更新')
            
    except Exception as e:
        db.session.rollback()
        return error_response(ErrorCode.INTERNAL_SERVER_ERROR, str(e)) 