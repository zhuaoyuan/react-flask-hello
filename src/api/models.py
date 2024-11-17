from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(80), unique=False, nullable=False)
    # is_active = db.Column(db.Boolean(), unique=False, nullable=False)

    def __repr__(self):
        return f'<User {self.email}>'

    def serialize(self):
        return {
            "id": self.id,
            "email": self.email,
            # do not serialize the password, its a security breach
        }
    
class ProjectInfo(db.Model):
    __tablename__ = 'project_info'
    
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True, comment='自增ID')
    project_name = db.Column(db.String(255), nullable=False, unique=True, comment='项目名称')
    customer_name = db.Column(db.String(255), nullable=False, comment='客户名称')
    start_date = db.Column(db.Date, nullable=False, comment='合作起始日期')
    end_date = db.Column(db.Date, nullable=False, comment='合作结束日期')
    project_description = db.Column(db.String(1000), nullable=True, default=None, comment='项目介绍')

    def __repr__(self):
        return f'<ProjectInfo {self.project_name}>'