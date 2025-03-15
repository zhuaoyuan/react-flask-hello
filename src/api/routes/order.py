from flask import request, jsonify, Blueprint
from api.models import db, Order, ProjectInfo, ProjectPriceConfig, DeliveryImportRecord
from api.enum.error_code import ErrorCode
from api.utils import success_response, error_response, register_error_handlers
from datetime import datetime
from functools import wraps
from sqlalchemy import text

def transactional(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # 设置事务隔离级别为REPEATABLE READ
            db.session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ"))
            db.session.begin_nested()
            result = f(*args, **kwargs)
            db.session.commit()
            return result
        except Exception as e:
            db.session.rollback()
            raise e
    return decorated_function

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
@transactional
def import_orders():
    """导入订单"""
    data = request.get_json()
    if not data or 'orders' not in data or 'project_id' not in data or 'project_name' not in data:
        return error_response(ErrorCode.BAD_REQUEST, '无效的请求数据')
    
    try:
        print(f"[事务开始] 导入订单，数据量：{len(data['orders'])}")
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

        # 预处理：获取所有涉及的订单号的最大序号
        order_numbers = {order_data['order_number'] for order_data in data['orders']}
        max_seq_dict = {}
        for order_number in order_numbers:
            # 查询数据库中该订单号下最大的序号，添加行锁防止并发导入
            max_seq = 0
            existing_orders = Order.query.filter(
                Order.sub_order_number.like(f"{order_number}-%")
            ).with_for_update().all()
            for order in existing_orders:
                try:
                    seq = int(order.sub_order_number.split('-')[-1])
                    max_seq = max(max_seq, seq)
                except ValueError:
                    continue
            max_seq_dict[order_number] = max_seq

        new_orders = []
        errors = []
        for index, order_data in enumerate(data['orders']):
            route_key = f"{order_data['departure_province']}-{order_data['departure_city']}-{order_data['destination_province']}-{order_data['destination_city']}"
            
            if route_key not in price_config_dict:
                errors.append(f"第{index + 1}行：出发地（{order_data['departure_province']}{order_data['departure_city']}）到达地（{order_data['destination_province']}{order_data['destination_city']}）的价格配置不存在")
                continue

            unit_price = price_config_dict[route_key]
            amount = float(order_data['weight']) * unit_price

            # 生成子订单号，使用内存中维护的序号
            order_number = order_data['order_number']
            max_seq_dict[order_number] += 1
            sub_order_number = f"{order_number}-{max_seq_dict[order_number]}"

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
            print(f"[事务处理] 准备保存{len(new_orders)}个新订单")
            db.session.add_all(new_orders)
            print("[事务完成] 订单导入成功")
            return success_response({'imported_count': len(new_orders)})
        else:
            return error_response(ErrorCode.BAD_REQUEST, '没有新的订单需要导入')
            
    except Exception as e:
        print(f"[事务回滚] 订单导入失败：{str(e)}")
        raise  # 让装饰器处理回滚

@order.route('/delete', methods=['POST'])
@transactional
def delete_order():
    """删除订单"""
    data = request.json
    id = data.get('id')
    order = Order.query.get(id)
    if not order:
        return error_response(ErrorCode.BAD_REQUEST, '订单不存在')

    try:
        print(f"[事务开始] 删除订单，ID：{id}，子订单号：{order.sub_order_number}")
        
        # 查找该子订单所在的status=0的批次记录，添加行锁
        existing_record = DeliveryImportRecord.query.filter_by(
            sub_order_number=order.sub_order_number,
            status=0
        ).with_for_update().first()
        
        if existing_record:
            print(f"[事务处理] 发现关联的送货记录，批次号：{existing_record.batch_number}")
            # 获取同一批次下的所有子订单记录，添加行锁
            all_suborders_of_batch = DeliveryImportRecord.query.filter_by(
                batch_number=existing_record.batch_number,
                status=0
            ).with_for_update().all()
            
            # 收集需要重置送货信息的子订单号（不包括要删除的子订单）
            sub_order_numbers_to_reset = {
                suborder.sub_order_number for suborder in all_suborders_of_batch 
                if suborder.sub_order_number != order.sub_order_number
            }
            
            # 更新该批次所有记录的状态
            DeliveryImportRecord.query.filter_by(
                batch_number=existing_record.batch_number,
                status=0
            ).update({
                'status': existing_record.id  # 使用记录ID而不是类属性
            }, synchronize_session=False)
            
            # 重置其他子订单的送货信息
            if sub_order_numbers_to_reset:
                print(f"[事务处理] 重置{len(sub_order_numbers_to_reset)}个关联订单的送货信息")
                Order.query.filter(
                    Order.sub_order_number.in_(sub_order_numbers_to_reset)
                ).update({
                    'carrier_type': None,
                    'carrier_name': None,
                    'carrier_phone': None,
                    'carrier_plate': None,
                    'carrier_fee': None
                }, synchronize_session=False)

        # 删除订单
        db.session.delete(order)
        print("[事务完成] 订单删除成功")
        return success_response()
    except Exception as e:
        print(f"[事务回滚] 订单删除失败：{str(e)}")
        raise  # 让装饰器处理回滚

@order.route('/edit', methods=['POST'])
@transactional
def edit_order():
    """编辑订单"""
    data = request.json
    if not data or 'id' not in data:
        return error_response(ErrorCode.BAD_REQUEST, '无效的请求数据')

    try:
        # 使用行锁查询订单
        order = Order.query.with_for_update().get(data['id'])
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

        return success_response()
    except Exception as e:
        print(f"[事务回滚] 订单编辑失败：{str(e)}")
        raise  # 让装饰器处理回滚

@order.route('/import_delivery', methods=['POST'])
@transactional
def import_delivery():
    """导入送货信息"""
    data = request.get_json()
    if not data or 'deliveries' not in data:
        return error_response(ErrorCode.BAD_REQUEST, '无效的请求数据')
    
    try:
        print(f"[事务开始] 导入送货信息，数据量：{len(data['deliveries'])}")
        errors = []
        batch_numbers_to_update = set()
        sub_order_numbers_to_reset = set()
        
        # 预处理：检查子订单号是否有重复
        all_sub_order_numbers = []
        for delivery in data['deliveries']:
            if 'sub_order_numbers' not in delivery:
                errors.append('缺少子订单号列表')
                continue
            all_sub_order_numbers.extend(delivery['sub_order_numbers'])
        
        # 检查重复的子订单号
        duplicate_sub_orders = {}
        for sub_order_number in all_sub_order_numbers:
            if all_sub_order_numbers.count(sub_order_number) > 1:
                duplicate_sub_orders[sub_order_number] = all_sub_order_numbers.count(sub_order_number)
        
        if duplicate_sub_orders:
            duplicate_details = [f"子订单号 {sub_order} 重复出现 {count} 次" for sub_order, count in duplicate_sub_orders.items()]
            return error_response(ErrorCode.BAD_REQUEST, f"发现重复的子订单号：\n{chr(10).join(duplicate_details)}")
        
        # 第一步：验证所有数据的合法性并预处理数据
        delivery_data = {}  # 用于存储每组送货信息的处理结果
        for delivery in data['deliveries']:
            # 验证必填字段
            if not delivery.get('carrier_name'):
                errors.append('承运人名称不能为空')
            if not delivery.get('carrier_phone'):
                errors.append('承运人联系方式不能为空')
            if not delivery.get('carrier_type'):
                errors.append('承运类型不能为空')
            if not delivery.get('carrier_fee'):
                errors.append('运费不能为空')
            
            # 验证承运类型
            carrier_type = delivery.get('carrier_type')
            if carrier_type not in [1, 2]:
                errors.append(f'承运类型必须为1（司机直送）或2（承运商），当前值：{carrier_type}')
            
            # 收集订单信息和验证子订单号
            orders_info = []
            total_amount = 0
            for sub_order_number in delivery['sub_order_numbers']:
                # 检查订单是否存在，并添加行锁
                order = Order.query.filter_by(sub_order_number=sub_order_number).with_for_update().first()
                if not order:
                    errors.append(f'子订单号 {sub_order_number} 不存在')
                    continue
                
                # 检查DeliveryImportRecord中是否有status=0的记录，添加行锁
                existing_record = DeliveryImportRecord.query.filter_by(
                    sub_order_number=sub_order_number,
                    status=0
                ).with_for_update().first()
                if existing_record:
                    batch_numbers_to_update.add(existing_record.batch_number)
                    # 获取同一批次下的所有子订单，添加行锁
                    all_suborders_of_batch = DeliveryImportRecord.query.filter_by(
                        batch_number=existing_record.batch_number,
                        status=0
                    ).with_for_update().all()
                    for suborder in all_suborders_of_batch:
                        sub_order_numbers_to_reset.add(suborder.sub_order_number)

                # 收集订单金额信息
                orders_info.append({
                    'order': order,
                    'amount': float(order.amount)
                })
                total_amount += float(order.amount)
            
            if orders_info:  # 只有在有有效订单时才保存处理结果
                # 生成批次号（使用毫秒时间戳）
                timestamp_ms = int(datetime.now().timestamp() * 1000)
                new_batch_number = f'DL{timestamp_ms}'
                
                delivery_data[id(delivery)] = {
                    'carrier_info': delivery,
                    'orders_info': orders_info,
                    'total_amount': total_amount,
                    'batch_number': new_batch_number
                }

        if errors:
            return error_response(ErrorCode.BAD_REQUEST, '\n'.join(errors))

        # 第二步：更新旧记录的状态并重置对应订单的承运信息
        if batch_numbers_to_update:
            print(f"[事务处理] 更新{len(batch_numbers_to_update)}个批次的状态")
            # 更新导入记录状态
            DeliveryImportRecord.query.filter(
                DeliveryImportRecord.batch_number.in_(batch_numbers_to_update),
                DeliveryImportRecord.status == 0
            ).update({
                'status': DeliveryImportRecord.id
            }, synchronize_session=False)
            
            # 重置对应订单的承运信息，但不重置本次要更新的订单
            sub_order_numbers_to_reset = sub_order_numbers_to_reset - set(all_sub_order_numbers)
            if sub_order_numbers_to_reset:
                print(f"[事务处理] 重置{len(sub_order_numbers_to_reset)}个订单的送货信息")
                Order.query.filter(
                    Order.sub_order_number.in_(sub_order_numbers_to_reset)
                ).update({
                    'carrier_type': None,
                    'carrier_name': None,
                    'carrier_phone': None,
                    'carrier_plate': None,
                    'carrier_fee': None
                }, synchronize_session=False)

        # 第三步：更新订单信息并创建新的导入记录
        updated_orders = []
        new_records = []
        batch_numbers = []  # 记录所有新生成的批次号
        
        for delivery_info in delivery_data.values():
            delivery = delivery_info['carrier_info']
            total_amount = delivery_info['total_amount']
            carrier_fee = float(delivery['carrier_fee'])
            new_batch_number = delivery_info['batch_number']
            batch_numbers.append(new_batch_number)

            for order_info in delivery_info['orders_info']:
                order = order_info['order']
                order_amount = order_info['amount']
                
                # 计算该订单应分摊的运费
                order_carrier_fee = round(order_amount / total_amount * carrier_fee, 2)
                
                # 更新订单信息
                order.carrier_type = delivery['carrier_type']
                order.carrier_name = delivery['carrier_name']
                order.carrier_phone = delivery['carrier_phone']
                order.carrier_plate = delivery.get('carrier_plate')
                order.carrier_fee = order_carrier_fee
                db.session.add(order)
                updated_orders.append(order)

                # 创建新的导入记录
                new_record = DeliveryImportRecord(
                    batch_number=new_batch_number,
                    sub_order_number=order.sub_order_number,
                    carrier_type=delivery['carrier_type'],
                    carrier_name=delivery['carrier_name'],
                    carrier_phone=delivery['carrier_phone'],
                    carrier_plate=delivery.get('carrier_plate'),
                    carrier_fee=order_carrier_fee,  # 使用计算后的运费
                    status=0,
                    create_time=datetime.now()
                )
                new_records.append(new_record)

        # 保存所有更改
        if new_records:
            print(f"[事务处理] 创建{len(new_records)}条新的送货记录")
            db.session.add_all(new_records)
        print("[事务完成] 送货信息导入成功")

        return success_response({
            'updated_count': len(updated_orders),
            'batch_numbers': batch_numbers
        })
            
    except Exception as e:
        print(f"[事务回滚] 送货信息导入失败：{str(e)}")
        raise  # 让装饰器处理回滚 