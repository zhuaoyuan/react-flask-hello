from flask import request, jsonify, Blueprint
from api.models import db, Order, ProjectInfo
from api.enum.error_code import ErrorCode
from api.utils import success_response, error_response, register_error_handlers
from datetime import datetime
from sqlalchemy import or_

delivery = Blueprint('delivery', __name__)
register_error_handlers(delivery)

@delivery.route('/list', methods=['POST'])
def get_deliveries():
    """获取送货列表，支持分页和搜索"""
    data = request.get_json()
    page = data.get('page', 1)
    per_page = data.get('per_page', 10)
    
    query = Order.query
    
    if 'project_name' in data and data['project_name']:
        query = query.filter(Order.project_name == data['project_name'])
    
    if 'delivery_date_start' in data and data['delivery_date_start']:
        query = query.filter(Order.delivery_date >= datetime.strptime(data['delivery_date_start'], '%Y-%m-%d').date())
    if 'delivery_date_end' in data and data['delivery_date_end']:
        query = query.filter(Order.delivery_date <= datetime.strptime(data['delivery_date_end'], '%Y-%m-%d').date())
    
    if 'order_date_start' in data and data['order_date_start']:
        query = query.filter(Order.order_date >= datetime.strptime(data['order_date_start'], '%Y-%m-%d').date())
    if 'order_date_end' in data and data['order_date_end']:
        query = query.filter(Order.order_date <= datetime.strptime(data['order_date_end'], '%Y-%m-%d').date())
    
    if 'order_number' in data and data['order_number']:
        query = query.filter(Order.order_number.like(f"%{data['order_number']}%"))

    query = query.order_by(Order.delivery_date.desc(), Order.order_number.desc())
    
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
     
    deliveries = [{
        'id': order.id,
        'project_id': order.project_id,
        'project_name': order.project_name,
        'order_number': order.order_number,
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
    } for order in pagination.items]
    
    return success_response({
        'items': deliveries,
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    })

@delivery.route('/export', methods=['POST'])
def export_deliveries():
    """导出送货列表"""
    data = request.get_json()
    
    query = Order.query
    
    if 'project_name' in data and data['project_name']:
        query = query.filter(Order.project_name == data['project_name'])
    
    if 'delivery_date_start' in data and data['delivery_date_start']:
        query = query.filter(Order.delivery_date >= datetime.strptime(data['delivery_date_start'], '%Y-%m-%d').date())
    if 'delivery_date_end' in data and data['delivery_date_end']:
        query = query.filter(Order.delivery_date <= datetime.strptime(data['delivery_date_end'], '%Y-%m-%d').date())
    
    if 'order_date_start' in data and data['order_date_start']:
        query = query.filter(Order.order_date >= datetime.strptime(data['order_date_start'], '%Y-%m-%d').date())
    if 'order_date_end' in data and data['order_date_end']:
        query = query.filter(Order.order_date <= datetime.strptime(data['order_date_end'], '%Y-%m-%d').date())
    
    if 'order_number' in data and data['order_number']:
        query = query.filter(Order.order_number.like(f"%{data['order_number']}%"))

    query = query.order_by(Order.delivery_date.desc(), Order.order_number.desc())
    
    orders = query.all()
    
    deliveries_data = [{
        'order_number': order.order_number,
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
        'items': deliveries_data
    })

@delivery.route('/import', methods=['POST'])
def import_deliveries():
    """导入送货单"""
    data = request.get_json()
    if not data or 'deliveries' not in data or 'project_id' not in data or 'project_name' not in data:
        return error_response(ErrorCode.BAD_REQUEST, '无效的请求数据')
    
    try:
        project = ProjectInfo.query.get(data['project_id'])
        if not project:
            return error_response(ErrorCode.BAD_REQUEST, '项目不存在')
        if project.project_name != data['project_name']:
            return error_response(ErrorCode.BAD_REQUEST, '项目ID与项目名称不匹配')

        new_deliveries = []
        for delivery_data in data['deliveries']:
            new_delivery = Order(
                project_id=project.id,
                project_name=project.project_name,
                order_number=delivery_data['order_number'],
                order_date=datetime.strptime(delivery_data['order_date'], '%Y-%m-%d').date(),
                delivery_date=datetime.strptime(delivery_data['delivery_date'], '%Y-%m-%d').date(),
                cargo_info=delivery_data['cargo_info'],
                quantity=delivery_data['quantity'],
                weight=delivery_data['weight'],
                receiver=delivery_data['receiver'],
                receiver_phone=delivery_data['receiver_phone'],
                transport_fee=delivery_data['transport_fee'],
                transport_type=delivery_data['transport_type'],
                remark=delivery_data.get('remark', '')
            )
            new_deliveries.append(new_delivery)

        if new_deliveries:
            db.session.add_all(new_deliveries)
            db.session.commit()
            return success_response({'imported_count': len(new_deliveries)})
        else:
            return error_response(ErrorCode.BAD_REQUEST, '没有新的送货单需要导入')
            
    except Exception as e:
        db.session.rollback()
        return error_response(ErrorCode.INTERNAL_SERVER_ERROR, str(e))

@delivery.route('/delete', methods=['POST'])
def delete_delivery():
    """删除送货单"""
    data = request.json
    id = data.get('id')
    delivery = Order.query.get(id)
    if not delivery:
        return error_response(ErrorCode.BAD_REQUEST, '送货单不存在')

    try:
        db.session.delete(delivery)
        db.session.commit()
        return success_response()
    except Exception as e:
        db.session.rollback()
        return error_response(ErrorCode.INTERNAL_SERVER_ERROR, str(e))

@delivery.route('/edit', methods=['POST'])
def edit_delivery():
    """编辑送货单"""
    data = request.json
    if not data or 'id' not in data:
        return error_response(ErrorCode.BAD_REQUEST, '无效的请求数据')

    try:
        delivery = Order.query.get(data['id'])
        if not delivery:
            return error_response(ErrorCode.BAD_REQUEST, '送货单不存在')

        delivery.order_number = data.get('order_number', delivery.order_number)
        delivery.order_date = datetime.strptime(data.get('order_date'), '%Y-%m-%d').date() if data.get('order_date') else delivery.order_date
        delivery.delivery_date = datetime.strptime(data.get('delivery_date'), '%Y-%m-%d').date() if data.get('delivery_date') else delivery.delivery_date
        delivery.cargo_info = data.get('cargo_info', delivery.cargo_info)
        delivery.quantity = data.get('quantity', delivery.quantity)
        delivery.weight = data.get('weight', delivery.weight)
        delivery.receiver = data.get('receiver', delivery.receiver)
        delivery.receiver_phone = data.get('receiver_phone', delivery.receiver_phone)
        delivery.transport_fee = data.get('transport_fee', delivery.transport_fee)
        delivery.transport_type = data.get('transport_type', delivery.transport_type)
        delivery.remark = data.get('remark', delivery.remark)

        db.session.commit()
        return success_response()
    except Exception as e:
        db.session.rollback()
        return error_response(ErrorCode.INTERNAL_SERVER_ERROR, str(e)) 