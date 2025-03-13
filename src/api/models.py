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
    # is_active = db.Column(db.Boolean(), unique=False, nullable=False)

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
    order_number = db.Column(db.String(50), nullable=False, unique=True, comment='订单号')
    order_date = db.Column(db.Date, nullable=False, comment='下单日期')
    delivery_date = db.Column(db.Date, nullable=False, comment='发货日期')
    customer_info = db.Column(db.String(255), nullable=False, comment='客户信息')
    cargo_info = db.Column(db.String(500), nullable=False, comment='货物信息')
    departure = db.Column(db.String(255), nullable=False, comment='出发地')
    destination = db.Column(db.String(255), nullable=False, comment='送达地')
    transport_info = db.Column(db.String(500), nullable=True, comment='运输信息')
    amount = db.Column(db.Numeric(10, 2), nullable=False, comment='金额')
    remark = db.Column(db.String(1000), nullable=True, comment='备注')
    status = db.Column(db.String(20), nullable=False, comment='订单状态')

    def __repr__(self):
        return f'<Order {self.order_number}>'

    def to_dict(self):
        return {
            'id': self.id,
            'order_number': self.order_number,
            'order_date': self.order_date.isoformat() if self.order_date else None,
            'delivery_date': self.delivery_date.isoformat() if self.delivery_date else None,
            'customer_info': self.customer_info,
            'cargo_info': self.cargo_info,
            'departure': self.departure,
            'destination': self.destination,
            'transport_info': self.transport_info,
            'amount': float(self.amount) if self.amount else 0,
            'remark': self.remark,
            'status': self.status
        }