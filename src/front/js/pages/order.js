import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Space, message, DatePicker, Table, Upload, Select, Card } from 'antd';
import { SearchOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import axios from 'axios';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

export const Order = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [projects, setProjects] = useState([]);
    const [projectLoading, setProjectLoading] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0
    });

    // 获取项目列表
    const fetchProjects = async () => {
        setProjectLoading(true);
        try {
            const response = await axios.post(`${backendUrl}/api/project/list`, {
                search_query: '',
                page: 1,
                per_page: 100
            });
            if (response.data.data) {
                setProjects(response.data.data.map(item => ({
                    label: item.project_name,
                    value: item.project_name
                })));
            } else {
                message.error('获取项目列表失败');
            }
        } catch (error) {
            message.error('获取项目列表失败');
        } finally {
            setProjectLoading(false);
        }
    };

    // 获取订单列表
    const fetchOrders = async (params = {}) => {
        setLoading(true);
        try {
            const orderDate = form.getFieldValue('order_date');
            const deliveryDate = form.getFieldValue('delivery_date');
            
            const response = await axios.post(`${backendUrl}/api/order/list`, {
                page: params.current || pagination.current,
                per_page: params.pageSize || pagination.pageSize,
                project_name: form.getFieldValue('project_name'),
                order_number: form.getFieldValue('order_number'),
                order_date_start: orderDate?.[0]?.format('YYYY-MM-DD'),
                order_date_end: orderDate?.[1]?.format('YYYY-MM-DD'),
                delivery_date_start: deliveryDate?.[0]?.format('YYYY-MM-DD'),
                delivery_date_end: deliveryDate?.[1]?.format('YYYY-MM-DD'),
                destination: form.getFieldValue('destination')
            });

            if (response.data.success) {
                const result = response.data.result;
                setData(result.items);
                setPagination({
                    ...params,
                    total: result.total,
                });
            } else {
                message.error('获取订单列表失败');
            }
        } catch (error) {
            console.error('获取订单列表错误:', error);
            message.error('获取订单列表失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
        fetchOrders();
    }, []);

    // 处理表格变化
    const handleTableChange = (newPagination, filters, sorter) => {
        fetchOrders({
            current: newPagination.current,
            pageSize: newPagination.pageSize,
        });
    };

    // 处理搜索
    const handleSearch = () => {
        fetchOrders({ current: 1 });
    };

    // 处理重置
    const handleReset = () => {
        form.resetFields();
        fetchOrders({ current: 1 });
    };

    // 导出订单
    const handleExport = async () => {
        try {
            const orderDate = form.getFieldValue('order_date');
            const deliveryDate = form.getFieldValue('delivery_date');
            
            const response = await axios.post(`${backendUrl}/api/order/export`, {
                order_number: form.getFieldValue('order_number'),
                order_date_start: orderDate?.[0]?.format('YYYY-MM-DD'),
                order_date_end: orderDate?.[1]?.format('YYYY-MM-DD'),
                delivery_date_start: deliveryDate?.[0]?.format('YYYY-MM-DD'),
                delivery_date_end: deliveryDate?.[1]?.format('YYYY-MM-DD'),
                destination: form.getFieldValue('destination')
            });

            if (response.data.success) {
                const orders = response.data.result.items;
                const wb = XLSX.utils.book_new();
                const exportData = orders.map(order => ({
                    '订单号': order.order_number,
                    '下单日期': order.order_date,
                    '客户信息': order.customer_info,
                    '货物信息': order.cargo_info,
                    '出发地': order.departure,
                    '送达地': order.destination,
                    '备注': order.remark || ''
                }));
                const ws = XLSX.utils.json_to_sheet(exportData);
                XLSX.utils.book_append_sheet(wb, ws, '订单列表');
                XLSX.writeFile(wb, `订单列表_${dayjs().format('YYYY-MM-DD')}.xlsx`);
                message.success('导出成功');
            }
        } catch (error) {
            message.error('导出失败');
        }
    };

    // 导入订单
    const handleImport = (file) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                
                const orders = jsonData.map(row => ({
                    order_number: row['订单号'],
                    order_date: row['下单日期'],
                    customer_info: row['客户信息'],
                    cargo_info: row['货物信息'],
                    departure: row['出发地'],
                    destination: row['送达地'],
                    remark: row['备注']
                }));

                const response = await axios.post(`${backendUrl}/api/order/import`, {
                    orders: orders
                });

                if (response.data.success) {
                    message.success('导入成功');
                    fetchOrders();
                }
            } catch (error) {
                message.error('导入失败');
            }
        };
        reader.readAsBinaryString(file);
        return false;
    };

    // 表格列定义
    const columns = [
        {
            title: '订单号',
            dataIndex: 'order_number',
            width: 140,
        },
        {
            title: '下单日期',
            dataIndex: 'order_date',
            width: 100,
        },
        {
            title: '客户信息',
            dataIndex: 'customer_info',
            width: 120,
        },
        {
            title: '货物信息',
            dataIndex: 'cargo_info',
            width: 200,
            render: (text) => (
                <div style={{ whiteSpace: 'pre-line' }}>
                    {text?.split('\n').map((line, index) => (
                        <div key={index}>{line}</div>
                    ))}
                </div>
            )
        },
        {
            title: '出发地',
            dataIndex: 'departure',
            width: 120,
        },
        {
            title: '送达地址',
            dataIndex: 'destination',
            width: 200,
        },
        {
            title: '备注',
            dataIndex: 'remark',
            width: 120,
        },
        {
            title: '操作',
            key: 'action',
            width: 120,
            render: (_, record) => (
                <Space>
                    <Button type="link" size="small">编辑</Button>
                    <Button type="link" size="small" danger>删除</Button>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '24px' }}>
            <Card style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Form.Item label="选择项目" style={{ marginBottom: 0 }}>
                        <Select
                            placeholder="请选择项目"
                            style={{ width: '240px' }}
                            options={projects}
                            loading={projectLoading}
                            allowClear
                            showSearch
                            filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            onChange={(value) => {
                                form.setFieldValue('project_name', value);
                                fetchOrders({ current: 1 });
                            }}
                        />
                    </Form.Item>
                    <Space>
                        <Button icon={<DownloadOutlined />}>
                            下载模板
                        </Button>
                        <Upload
                            accept=".xlsx,.xls"
                            beforeUpload={handleImport}
                            showUploadList={false}
                        >
                            <Button type="primary" icon={<UploadOutlined />}>导入订单</Button>
                        </Upload>
                    </Space>
                </div>
            </Card>

            <Card>
                <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '14px' }}>订单列表</div>
                    <Button type="primary" onClick={handleExport}>
                        导出订单
                    </Button>
                </div>

                <Form form={form} layout="inline" style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ flex: 1, display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <Form.Item label="下单日期" name="order_date">
                                <RangePicker style={{ width: '360px' }} />
                            </Form.Item>
                            <Form.Item label="发货日期" name="delivery_date">
                                <RangePicker style={{ width: '360px' }} />
                            </Form.Item>
                            <Form.Item label="订单号" name="order_number">
                                <Input placeholder="请输入订单号" style={{ width: '240px' }} />
                            </Form.Item>
                            <Form.Item label="送达城市" name="destination">
                                <Input placeholder="请输入送达城市" style={{ width: '240px' }} />
                            </Form.Item>
                            <Form.Item style={{ marginLeft: 'auto', marginRight: 0 }}>
                            <Space>
                                <Button type="primary" onClick={handleSearch}>
                                    查询
                                </Button>
                                <Button onClick={handleReset}>
                                    重置
                                </Button>
                            </Space>
                        </Form.Item>
                        </div>
                        
                    </div>
                </Form>

                <Table
                    columns={columns}
                    dataSource={data}
                    pagination={{
                        ...pagination,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total) => `共 ${total} 条记录`
                    }}
                    onChange={handleTableChange}
                    loading={loading}
                    rowKey="id"
                    size="middle"
                />
            </Card>
        </div>
    );
}; 