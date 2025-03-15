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
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(80), unique=False, nullable=False)

    def __repr__(self):
        """返回用户对象的字符串表示"""
        return f'<User {self.email}>'

    def serialize(self):
        """
        序列化用户数据（不包含敏感信息）
        :return: 用户数据字典
        """
        return {
            "id": self.id,
            "email": self.email,
            # 出于安全考虑，不序列化密码
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
    carrier_type = db.Column(db.Integer, nullable=False, comment='承运类型')
    tonnage_upper_limit = db.Column(db.Integer, nullable=False, comment='吨位上限')
    tonnage_lower_limit = db.Column(db.Integer, nullable=False, comment='吨位下限')
    unit_price = db.Column(db.Integer, nullable=False, comment='单价')
    project_id = db.Column(db.BigInteger, nullable=False, comment='项目ID')
    project_name = db.Column(db.String(255), nullable=False, comment='项目名称')

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
    
    # 新增承运人相关字段
    carrier_type = db.Column(db.Integer, nullable=False, default=1, comment='承运类型：1-司机直送，2-承运商')
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
    """
    送货单导入记录模型
    用于记录送货单导入的批次信息和状态
    """
    __tablename__ = 'delivery_import_record'
    
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, comment='自增ID')
    order_id = db.Column(db.BigInteger, db.ForeignKey('order.id'), nullable=False, comment='订单ID')
    batch_number = db.Column(db.String(50), nullable=False, comment='导入批次号')
    status = db.Column(db.Integer, nullable=False, default=0, comment='状态：0-待处理，1-处理成功，2-处理失败')

    def __repr__(self):
        """返回导入记录的字符串表示"""
        return f'<DeliveryImportRecord {self.batch_number}>'

    def to_dict(self):
        """
        将导入记录转换为字典格式
        :return: 导入记录字典
        """
        return {
            'id': self.id,
            'order_id': self.order_id,
            'batch_number': self.batch_number,
            'status': self.status
        }