import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Space, message, DatePicker, Table, Upload } from 'antd';
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
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0
    });

    // 获取订单列表
    const fetchOrders = async (params = {}) => {
        setLoading(true);
        try {
            const response = await axios.post(`${backendUrl}/api/order/list`, {
                page: params.current || pagination.current,
                per_page: params.pageSize || pagination.pageSize,
                order_number: form.getFieldValue('order_number'),
                order_date: form.getFieldValue('order_date')?.format('YYYY-MM-DD'),
                delivery_date: form.getFieldValue('delivery_date')?.format('YYYY-MM-DD'),
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
        fetchOrders({
            current: 1,
            pageSize: pagination.pageSize,
        });
    };

    // 处理重置
    const handleReset = () => {
        form.resetFields();
        fetchOrders({
            current: 1,
            pageSize: pagination.pageSize,
        });
    };

    // 导出订单
    const handleExport = async () => {
        try {
            const response = await axios.post(`${backendUrl}/api/order/export`, {
                order_number: form.getFieldValue('order_number'),
                order_date: form.getFieldValue('order_date')?.format('YYYY-MM-DD'),
                delivery_date: form.getFieldValue('delivery_date')?.format('YYYY-MM-DD'),
                destination: form.getFieldValue('destination')
            });

            if (response.data.success) {
                const orders = response.data.result.items;
                
                // 创建工作簿
                const wb = XLSX.utils.book_new();
                
                // 转换数据格式
                const exportData = orders.map(order => ({
                    '订单号': order.order_number,
                    '下单日期': order.order_date,
                    '发货日期': order.delivery_date,
                    '客户信息': order.customer_info,
                    '货物信息': order.cargo_info,
                    '出发地': order.departure,
                    '送达地': order.destination,
                    '运输信息': order.transport_info || '',
                    '金额': order.amount,
                    '备注': order.remark || '',
                    '状态': order.status
                }));
                
                // 创建工作表
                const ws = XLSX.utils.json_to_sheet(exportData);
                
                // 设置列宽
                const wscols = [
                    {wch: 15}, // 订单号
                    {wch: 12}, // 下单日期
                    {wch: 12}, // 发货日期
                    {wch: 20}, // 客户信息
                    {wch: 30}, // 货物信息
                    {wch: 20}, // 出发地
                    {wch: 20}, // 送达地
                    {wch: 30}, // 运输信息
                    {wch: 10}, // 金额
                    {wch: 20}, // 备注
                    {wch: 10}  // 状态
                ];
                ws['!cols'] = wscols;
                
                // 将工作表添加到工作簿
                XLSX.utils.book_append_sheet(wb, ws, '订单列表');
                
                // 下载文件
                XLSX.writeFile(wb, `订单列表_${dayjs().format('YYYY-MM-DD')}.xlsx`);
                message.success('导出成功');
            } else {
                message.error('导出失败');
            }
        } catch (error) {
            console.error('导出订单错误:', error);
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

                // 转换数据格式
                const orders = jsonData.map(row => ({
                    order_number: row['订单号'],
                    order_date: row['下单日期'],
                    delivery_date: row['发货日期'],
                    customer_info: row['客户信息'],
                    cargo_info: row['货物信息'],
                    departure: row['出发地'],
                    destination: row['送达地'],
                    transport_info: row['运输信息'],
                    amount: Number(row['金额']),
                    remark: row['备注'],
                    status: row['状态']
                }));

                // 发送导入请求
                const response = await axios.post(`${backendUrl}/api/order/import`, {
                    orders: orders
                });

                if (response.data.success) {
                    message.success(`成功导入 ${response.data.result.imported_count} 条订单`);
                    fetchOrders();
                } else {
                    message.error(response.data.error_message || '导入失败');
                }
            } catch (error) {
                console.error('导入订单错误:', error);
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
            key: 'order_number',
            width: 120,
        },
        {
            title: '下单日期',
            dataIndex: 'order_date',
            key: 'order_date',
            width: 100,
        },
        {
            title: '客户信息',
            dataIndex: 'customer_info',
            key: 'customer_info',
            width: 150,
        },
        {
            title: '货物信息',
            dataIndex: 'cargo_info',
            key: 'cargo_info',
            width: 200,
            ellipsis: true,
        },
        {
            title: '出发地',
            dataIndex: 'departure',
            key: 'departure',
            width: 120,
        },
        {
            title: '送达地',
            dataIndex: 'destination',
            key: 'destination',
            width: 120,
        },
        {
            title: '运输信息',
            dataIndex: 'transport_info',
            key: 'transport_info',
            width: 150,
            ellipsis: true,
        },
        {
            title: '备注',
            dataIndex: 'remark',
            key: 'remark',
            width: 150,
            ellipsis: true,
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
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSearch}
            >
                <div style={{ marginBottom: '24px' }}>
                    <Space>
                        <Form.Item label="选择客户" style={{ marginBottom: 0 }}>
                            <Input placeholder="请选择客户" style={{ width: '200px' }} />
                        </Form.Item>
                        <Space>
                            <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
                                下载模板
                            </Button>
                            <Upload
                                accept=".xlsx,.xls"
                                beforeUpload={handleImport}
                                showUploadList={false}
                            >
                                <Button icon={<UploadOutlined />}>导入订单</Button>
                            </Upload>
                        </Space>
                    </Space>
                </div>

                <div style={{ marginBottom: '24px' }}>
                    <Space>
                        <Form.Item label="下单日期" name="order_date">
                            <DatePicker style={{ width: '200px' }} />
                        </Form.Item>
                        <Form.Item label="发货日期" name="delivery_date">
                            <DatePicker style={{ width: '200px' }} />
                        </Form.Item>
                        <Form.Item label="订单号" name="order_number">
                            <Input placeholder="请输入订单号" style={{ width: '200px' }} />
                        </Form.Item>
                        <Form.Item label="送达城市" name="destination">
                            <Input placeholder="请输入送达城市" style={{ width: '200px' }} />
                        </Form.Item>
                        <Form.Item>
                            <Space>
                                <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                                    查询
                                </Button>
                                <Button onClick={handleReset}>重置</Button>
                            </Space>
                        </Form.Item>
                    </Space>
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
                scroll={{ x: 1500 }}
                rowKey="id"
            />
        </div>
    );
}; 