import React from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/axios';

export const Login = () => {
    const navigate = useNavigate();
    const [form] = Form.useForm();

    const handleSubmit = async (values) => {
        try {
            const response = await axios.post('/api/auth/login', values);
            if (response.data.success) {
                message.success('登录成功');
                // 将用户信息存储在 localStorage 中
                localStorage.setItem('user', JSON.stringify(response.data.result));
                // 跳转到项目列表页
                navigate('/project');
            } else {
                message.error(response.data.error_message || '登录失败');
            }
        } catch (error) {
            console.error('登录失败:', error);
            message.error(error.response?.data?.error_message || '登录失败');
        }
    };

    return (
        <div style={{ 
            height: '100vh', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            background: '#f0f2f5'
        }}>
            <Card style={{ width: 400 }}>
                <h2 style={{ textAlign: 'center', marginBottom: 24 }}>用户登录</h2>
                <Form
                    form={form}
                    name="login"
                    onFinish={handleSubmit}
                    autoComplete="off"
                >
                    <Form.Item
                        name="username"
                        rules={[{ required: true, message: '请输入用户名' }]}
                    >
                        <Input 
                            prefix={<UserOutlined />} 
                            placeholder="用户名" 
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: '请输入密码' }]}
                    >
                        <Input.Password
                            prefix={<LockOutlined />}
                            placeholder="密码"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" block size="large">
                            登录
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}; 