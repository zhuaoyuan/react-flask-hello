import React, { useState, useEffect } from 'react';
import { Table, Space, Button, Form, DatePicker, Input, Select, message } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';

const { RangePicker } = DatePicker;
const { Option } = Select;

export const Delivery = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0
    });
    const [projectList, setProjectList] = useState([]);

    // 获取项目列表
    const fetchProjects = async () => {
        try {
            const response = await axios.post('/api/project/list', {
                page: 1,
                per_page: 1000
            });
            if (response.data.success) {
                const projects = response.data.result.data.map(item => ({
                    value: item.id,
                    label: item.project_name,
                    project_name: item.project_name
                }));
                setProjectList(projects);
                if (projects.length > 0) {
                    form.setFieldValue('project_name', projects[0].project_name);
                }
            }
        } catch (error) {
            console.error('获取项目列表失败:', error);
            message.error('获取项目列表失败');
        }
    };

    // 获取送货列表
    const fetchDeliveries = async (params = {}) => {
        setLoading(true);
        try {
            const values = await form.validateFields();
            const response = await axios.post('/api/delivery/list', {
                page: params.current || pagination.current,
                per_page: params.pageSize || pagination.pageSize,
                project_name: values.project_name,
                order_number: values.order_number,
                order_date_start: values.order_date?.[0]?.format('YYYY-MM-DD'),
                order_date_end: values.order_date?.[1]?.format('YYYY-MM-DD'),
                delivery_date_start: values.delivery_date?.[0]?.format('YYYY-MM-DD'),
                delivery_date_end: values.delivery_date?.[1]?.format('YYYY-MM-DD')
            });

            if (response.data.success) {
                setData(response.data.result.items);
                setPagination({
                    ...pagination,
                    current: response.data.result.current_page,
                    total: response.data.result.total
                });
            }
        } catch (error) {
            console.error('获取送货列表失败:', error);
            message.error('获取送货列表失败');
        }
        setLoading(false);
    };

    // 导出送货列表
    const handleExport = async () => {
        try {
            const values = await form.validateFields();
            const response = await axios.post('/api/delivery/export', {
                project_name: values.project_name,
                order_number: values.order_number,
                order_date_start: values.order_date?.[0]?.format('YYYY-MM-DD'),
                order_date_end: values.order_date?.[1]?.format('YYYY-MM-DD'),
                delivery_date_start: values.delivery_date?.[0]?.format('YYYY-MM-DD'),
                delivery_date_end: values.delivery_date?.[1]?.format('YYYY-MM-DD')
            });

            if (response.data.success) {
                // 处理导出数据，这里需要根据实际需求实现
                console.log('导出数据:', response.data.result.items);
                message.success('导出成功');
            }
        } catch (error) {
            console.error('导出失败:', error);
            message.error('导出失败');
        }
    };

    // 表格列定义
    const columns = [
        {
            title: '下单日期',
            dataIndex: 'order_date',
            key: 'order_date',
            width: 100
        },
        {
            title: '送货日期',
            dataIndex: 'delivery_date',
            key: 'delivery_date',
            width: 100
        },
        {
            title: '订单号',
            dataIndex: 'order_number',
            key: 'order_number',
            width: 120
        },
        {
            title: '货物信息',
            dataIndex: 'product_name',
            key: 'product_name',
            width: 150
        },
        {
            title: '承运人',
            dataIndex: 'receiver',
            key: 'receiver',
            width: 100
        },
        {
            title: '运费',
            dataIndex: 'amount',
            key: 'amount',
            width: 100,
            render: (text) => `¥ ${text.toFixed(2)}`
        },
        {
            title: '承运类型',
            dataIndex: 'transport_type',
            key: 'transport_type',
            width: 100
        },
        {
            title: '操作',
            key: 'action',
            width: 100,
            render: (_, record) => (
                <Space size="middle">
                    <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
                        编辑
                    </Button>
                    <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>
                        删除
                    </Button>
                </Space>
            )
        }
    ];

    // 编辑送货单
    const handleEdit = (record) => {
        // 实现编辑功能
        console.log('编辑:', record);
    };

    // 删除送货单
    const handleDelete = async (record) => {
        try {
            const response = await axios.post('/api/delivery/delete', {
                id: record.id
            });
            if (response.data.success) {
                message.success('删除成功');
                fetchDeliveries();
            }
        } catch (error) {
            console.error('删除失败:', error);
            message.error('删除失败');
        }
    };

    // 表格变化处理
    const handleTableChange = (pagination, filters, sorter) => {
        fetchDeliveries({
            current: pagination.current,
            pageSize: pagination.pageSize
        });
    };

    // 搜索表单提交
    const handleSearch = () => {
        setPagination({ ...pagination, current: 1 });
        fetchDeliveries({ current: 1 });
    };

    // 重置表单
    const handleReset = () => {
        form.resetFields();
        setPagination({ ...pagination, current: 1 });
        fetchDeliveries({ current: 1 });
    };

    useEffect(() => {
        fetchProjects();
        fetchDeliveries();
    }, []);

    return (
        <div className="delivery-management">
            <Form
                form={form}
                layout="inline"
                onFinish={handleSearch}
                style={{ marginBottom: 16 }}
            >
                <Form.Item name="project_name" label="选择项目">
                    <Select
                        style={{ width: 200 }}
                        placeholder="请选择项目"
                        options={projectList}
                    />
                </Form.Item>

                <Form.Item name="order_date" label="下单日期">
                    <RangePicker />
                </Form.Item>

                <Form.Item name="delivery_date" label="送货日期">
                    <RangePicker />
                </Form.Item>

                <Form.Item name="order_number" label="订单号">
                    <Input placeholder="请输入订单号" />
                </Form.Item>

                <Form.Item>
                    <Space>
                        <Button type="primary" htmlType="submit">
                            查询
                        </Button>
                        <Button onClick={handleReset}>重置</Button>
                        <Button onClick={handleExport}>导出Excel</Button>
                    </Space>
                </Form.Item>
            </Form>

            <Table
                columns={columns}
                dataSource={data}
                pagination={pagination}
                loading={loading}
                onChange={handleTableChange}
                scroll={{ x: 1300 }}
                rowKey="id"
            />
        </div>
    );
};
