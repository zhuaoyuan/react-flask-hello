"""
数据库模型定义模块
包含所有数据库表的模型类定义
"""
from flask_sqlalchemy import SQLAlchemy

# 创建数据库实例
db = SQLAlchemy()

class User(db.Model):
    """
    用户模型
    用于存储用户账号信息
    """
    __tablename__ = 'user'
    
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, comment='自增主键')
    username = db.Column(db.String(50), nullable=False, unique=True, comment='用户名')
    password = db.Column(db.String(100), nullable=False, comment='密码')
    name = db.Column(db.String(50), nullable=False, comment='姓名')
    is_deleted = db.Column(db.BigInteger, nullable=False, default=0, comment='删除标记，0-未删除，>0-已删除(记录ID)')

    def __repr__(self):
        return f'<User {self.username}>'

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'name': self.name
        }

class ProjectInfo(db.Model):
    """
    项目信息模型
    用于存储项目基本信息
    """
    __tablename__ = 'project_info'
    
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, comment='自增ID')
    project_name = db.Column(db.String(255), nullable=False, unique=True, comment='项目名称')
    customer_name = db.Column(db.String(255), nullable=False, comment='客户名称')
    start_date = db.Column(db.Date, nullable=False, comment='合作起始日期')
    end_date = db.Column(db.Date, nullable=False, comment='合作结束日期')
    project_description = db.Column(db.String(1000), nullable=True, default=None, comment='项目介绍')
    is_deleted = db.Column(db.BigInteger, nullable=False, default=0, comment='删除标记，0-未删除，>0-已删除(记录ID)')

    def __repr__(self):
        """返回项目信息的字符串表示"""
        return f'<ProjectInfo {self.project_name}>'
    
    def to_dict(self):
        """
        将项目信息转换为字典格式
        :return: 项目信息字典
        """
        return {
            'id': self.id,
            'project_name': self.project_name,
            'customer_name': self.customer_name,
            'start_date': self.start_date,
            'end_date': self.end_date,
            'project_description': self.project_description
        }
    
class ProjectPriceConfig(db.Model):
    """
    项目价格配置模型
    用于存储项目的价格配置信息
    """
    __tablename__ = 'project_price_config'
    
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, comment='自增主键')
    departure_province = db.Column(db.String(20), nullable=False, comment='出发省')
    departure_city = db.Column(db.String(20), nullable=False, comment='出发市')
    destination_province = db.Column(db.String(20), nullable=False, comment='到达省')
    destination_city = db.Column(db.String(20), nullable=False, comment='到达市')
    tonnage_upper_limit = db.Column(db.Integer, nullable=False, comment='吨位上限')
    tonnage_lower_limit = db.Column(db.Integer, nullable=False, comment='吨位下限')
    unit_price = db.Column(db.Integer, nullable=False, comment='单价')
    project_id = db.Column(db.BigInteger, nullable=False, comment='项目ID')
    project_name = db.Column(db.String(255), nullable=False, comment='项目名称')
    is_deleted = db.Column(db.BigInteger, nullable=False, default=0, comment='删除标记，0-未删除，>0-已删除(记录ID)')

    # 添加联合唯一约束
    __table_args__ = (
        db.UniqueConstraint('project_id', 'departure_province', 'departure_city', 
                          'destination_province', 'destination_city', 
                          name='idx_unique'),
    )

    def __repr__(self):
        """返回价格配置的字符串表示"""
        return f'<ProjectPriceConfig {self.project_name}>'

class Order(db.Model):
    """
    订单模型
    用于存储订单信息
    """
    __tablename__ = 'order'
    
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, comment='自增ID')
    project_id = db.Column(db.BigInteger, nullable=False, comment='项目ID')
    project_name = db.Column(db.String(255), nullable=False, comment='项目名称')
    order_number = db.Column(db.String(50), nullable=False, unique=True, comment='订单号')
    sub_order_number = db.Column(db.String(60), nullable=False, unique=True, comment='子订单号')
    seq = db.Column(db.Integer, nullable=False, default=0, comment='子订单序号')
    order_date = db.Column(db.Date, nullable=False, comment='下单日期')
    delivery_date = db.Column(db.Date, nullable=False, comment='发货日期')
    product_name = db.Column(db.String(255), nullable=False, comment='产品名称')
    quantity = db.Column(db.Integer, nullable=False, comment='数量')
    weight = db.Column(db.DECIMAL(10,3), nullable=False, comment='重量(吨)')
    departure_province = db.Column(db.String(20), nullable=False, comment='出发省')
    departure_city = db.Column(db.String(20), nullable=False, comment='出发市')
    destination_province = db.Column(db.String(20), nullable=False, comment='送达省')
    destination_city = db.Column(db.String(20), nullable=False, comment='送达市')
    destination_address = db.Column(db.String(500), nullable=True, comment='送达详细地址')
    remark = db.Column(db.String(500), nullable=True, comment='备注')
    amount = db.Column(db.Numeric(10, 2), nullable=False, comment='金额')
    is_deleted = db.Column(db.BigInteger, nullable=False, default=0, comment='删除标记，0-未删除，>0-已删除(记录ID)')
    
    # 新增承运人相关字段
    carrier_type = db.Column(db.Integer, nullable=True, comment='承运类型：1-司机直送，2-承运商')
    carrier_name = db.Column(db.String(50), nullable=True, comment='承运人名称')
    carrier_plate = db.Column(db.String(20), nullable=True, comment='承运人车牌')
    carrier_phone = db.Column(db.String(20), nullable=True, comment='承运人联系方式')
    carrier_fee = db.Column(db.Numeric(10, 2), nullable=True, comment='运费')

    def __repr__(self):
        return f'<Order {self.order_number}>'

    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'project_name': self.project_name,
            'order_number': self.order_number,
            'sub_order_number': self.sub_order_number,
            'seq': self.seq,
            'order_date': self.order_date.isoformat() if self.order_date else None,
            'delivery_date': self.delivery_date.isoformat() if self.delivery_date else None,
            'product_name': self.product_name,
            'quantity': self.quantity,
            'weight': float(self.weight) if self.weight else 0,
            'departure_province': self.departure_province,
            'departure_city': self.departure_city,
            'destination_province': self.destination_province,
            'destination_city': self.destination_city,
            'destination_address': self.destination_address,
            'remark': self.remark,
            'amount': float(self.amount) if self.amount else 0,
            'carrier_type': self.carrier_type,
            'carrier_name': self.carrier_name,
            'carrier_plate': self.carrier_plate,
            'carrier_phone': self.carrier_phone,
            'carrier_fee': float(self.carrier_fee) if self.carrier_fee else 0
        }
    
class DeliveryImportRecord(db.Model):
    """送货导入记录表"""
    __tablename__ = 'delivery_import_record'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    batch_number = db.Column(db.String(20), nullable=False, comment='批次号')
    sub_order_number = db.Column(db.String(60), nullable=False, comment='子订单号')
    carrier_type = db.Column(db.Integer, nullable=False, comment='承运类型：1-司机直送，2-承运商')
    carrier_name = db.Column(db.String(50), nullable=False, comment='承运人名称')
    carrier_phone = db.Column(db.String(20), nullable=False, comment='承运人联系方式')
    carrier_plate = db.Column(db.String(20), comment='承运人车牌')
    carrier_fee = db.Column(db.Numeric(10, 2), comment='运费')
    status = db.Column(db.Integer, nullable=False, default=0, comment='状态：0-最新，>0-历史记录(记录被更新时的ID)')
    create_time = db.Column(db.DateTime, nullable=False, default=db.func.current_timestamp(), comment='创建时间')

    def __repr__(self):
        return f'<DeliveryImportRecord {self.batch_number}-{self.sub_order_number}>'