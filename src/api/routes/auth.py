from flask import request, Blueprint, session
from api.models import db, User
from api.enum.error_code import ErrorCode
from api.utils import success_response, error_response
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps

auth = Blueprint('auth', __name__)

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('user_id'):
            return error_response(ErrorCode.UNAUTHORIZED, "请先登录")
        return f(*args, **kwargs)
    return decorated_function

@auth.route('/login', methods=['POST'])
def login():
    """用户登录"""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return error_response(ErrorCode.BAD_REQUEST, "用户名和密码不能为空")
    
    user = User.query.filter_by(username=username, is_deleted=0).first()
    if not user or not check_password_hash(user.password, password):
        return error_response(ErrorCode.BAD_REQUEST, "用户名或密码错误")
    
    # 设置 session
    session.permanent = True  # 使用永久 session
    session['user_id'] = user.id
    session['username'] = user.username
    session['name'] = user.name
    
    # 打印 session 信息用于调试
    print(f"Session after login: {dict(session)}")
    
    response = success_response(user.to_dict())
    return response

@auth.route('/logout', methods=['POST'])
def logout():
    """用户登出"""
    session.clear()
    return success_response()

@auth.route('/register', methods=['POST'])
def register():
    """用户注册"""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    name = data.get('name')
    
    if not username or not password or not name:
        return error_response(ErrorCode.BAD_REQUEST, "用户名、密码和姓名不能为空")
    
    if User.query.filter_by(username=username, is_deleted=0).first():
        return error_response(ErrorCode.BAD_REQUEST, "用户名已存在")
    
    hashed_password = generate_password_hash(password)
    new_user = User(
        username=username,
        password=hashed_password,
        name=name
    )
    
    try:
        db.session.add(new_user)
        db.session.commit()
        return success_response(new_user.to_dict())
    except Exception as e:
        db.session.rollback()
        print(f"用户注册失败：{str(e)}")
        return error_response(ErrorCode.INTERNAL_SERVER_ERROR, "注册失败")

@auth.route('/current_user', methods=['GET'])
@login_required
def get_current_user():
    """获取当前登录用户信息"""
    # 打印 session 信息用于调试
    print(f"Session in current_user: {dict(session)}")
    
    user_id = session.get('user_id')
    if not user_id:
        print("No user_id in session")
        session.clear()
        return error_response(ErrorCode.UNAUTHORIZED, "请先登录")
        
    user = User.query.get(user_id)
    if not user:
        print(f"User not found for id: {user_id}")
        session.clear()
        return error_response(ErrorCode.UNAUTHORIZED, "请先登录")
        
    return success_response(user.to_dict()) 