import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Space, message, DatePicker, Table, Upload, Select, Card, Cascader, Modal, Popconfirm, Checkbox } from 'antd';
import { SearchOutlined, DownloadOutlined, UploadOutlined, SettingOutlined } from '@ant-design/icons';
import axios from 'axios';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { provinces_and_cities } from '../data/provinces_and_cities';

const { RangePicker } = DatePicker;

const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

// 将省市数据转换为级联选择器需要的格式
const cascaderOptions = Object.entries(provinces_and_cities).map(([province, cities]) => ({
    value: province,
    label: province,
    children: cities.map(city => ({
        value: city,
        label: city
    }))
}));

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
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editForm] = Form.useForm();
    const [editingOrder, setEditingOrder] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);

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
                const projectList = response.data.data.map(item => ({
                    label: item.project_name,
                    value: item.id,
                    project_name: item.project_name
                }));
                setProjects(projectList);
                
                // 如果有项目，自动选中第一个并触发查询
                if (projectList.length > 0) {
                    const firstProject = projectList[0];
                    // 同时设置表单中的项目名称和项目选择器的值
                    form.setFieldsValue({
                        project_name: firstProject.project_name,
                        project: firstProject.value
                    });
                    // 设置选择器的值
                    setSelectedProject(firstProject.value);
                    fetchOrders({ current: 1 });
                }
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
            const destination = form.getFieldValue('destination');
            
            const response = await axios.post(`${backendUrl}/api/order/list`, {
                page: params.current || pagination.current,
                per_page: params.pageSize || pagination.pageSize,
                project_name: form.getFieldValue('project_name'),
                order_number: form.getFieldValue('order_number'),
                order_date_start: orderDate?.[0]?.format('YYYY-MM-DD'),
                order_date_end: orderDate?.[1]?.format('YYYY-MM-DD'),
                destination_province: destination?.[0],
                destination_city: destination?.[1]
            });

            console.log('订单列表响应:', response.data);

            if (response.data.success && response.data.result) {
                const formattedData = response.data.result.items.map(item => ({
                    ...item,
                    key: item.id,
                    departure: `${item.departure_province}${item.departure_city}`,
                    destination: `${item.destination_province}${item.destination_city}${item.destination_address || ''}`,
                    cargo_info: `产品名称：${item.product_name}\n数量：${item.quantity}\n重量：${item.weight}吨`,
                    remark: item.remark || ''
                }));
                console.log('格式化后的数据:', formattedData);
                setData(formattedData);
                setPagination({
                    ...params,
                    current: response.data.result.current_page || 1,
                    pageSize: response.data.result.per_page || 10,
                    total: response.data.result.total || 0,
                });
            } else {
                setData([]);
                setPagination({
                    ...pagination,
                    total: 0
                });
                message.error('暂无数据');
            }
        } catch (error) {
            console.error('获取订单列表错误:', error);
            setData([]);
            setPagination({
                ...pagination,
                total: 0
            });
            message.error('获取订单列表失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
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
            const destination = form.getFieldValue('destination');
            
            const response = await axios.post(`${backendUrl}/api/order/export`, {
                project_name: form.getFieldValue('project_name'),
                order_number: form.getFieldValue('order_number'),
                order_date_start: orderDate?.[0]?.format('YYYY-MM-DD'),
                order_date_end: orderDate?.[1]?.format('YYYY-MM-DD'),
                destination_province: destination?.[0],
                destination_city: destination?.[1]
            });

            if (response.data.success) {
                const orders = response.data.result.items;
                const wb = XLSX.utils.book_new();
                const exportData = orders.map(order => ({
                    '订单号': order.order_number,
                    '子订单号': order.sub_order_number,
                    '下单日期': order.order_date,
                    '产品名称': order.product_name,
                    '数量': order.quantity,
                    '重量(吨)': order.weight,
                    '出发地': `${order.departure_province}${order.departure_city}`,
                    '送达地': `${order.destination_province}${order.destination_city}${order.destination_address || ''}`,
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

    // 下载送货模板
    const handleDownloadDeliveryTemplate = () => {
        // 创建模板数据
        const templateData = [
            {
                '子订单号': 'JD202401010001-1,JD202401010002-1',
                '承运人名称': '张三',
                '承运人联系方式': '13800138000',
                '承运人车牌': '粤B12345',
                '承运类型': '1',  // 1-司机直送，2-承运商
                '运费': '2000'
            }
        ];

        // 创建工作簿
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(templateData);

        // 设置列宽
        ws['!cols'] = [
            { wch: 50 },  // 子订单号
            { wch: 15 },  // 承运人名称
            { wch: 15 },  // 承运人联系方式
            { wch: 12 },  // 承运人车牌
            { wch: 10 },  // 承运类型
            { wch: 10 }   // 运费
        ];

        // 添加工作表到工作簿
        XLSX.utils.book_append_sheet(wb, ws, '送货信息导入模板');
        
        // 下载文件
        XLSX.writeFile(wb, '送货信息导入模板.xlsx');
    };

    // 下载订单模板
    const handleDownloadOrderTemplate = () => {
        // 创建模板数据
        const templateData = [
            {
                '订单号': 'JD202401010001',
                '下单日期': '2024-01-01',
                '送货日期': '2024-01-02',
                '产品名称': '笔记本电脑',
                '数量': '20',
                '重量(吨)': '0.400',
                '出发省': '广东省',
                '出发市': '深圳市',
                '送达省': '北京市',
                '送达市': '北京市',
                '送达详细地址': '朝阳区三里屯街道xx号',
                '备注': '需要提前预约送货'
            }
        ];

        // 创建工作簿
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(templateData);

        // 设置列宽
        ws['!cols'] = [
            { wch: 15 },  // 订单号
            { wch: 12 },  // 下单日期
            { wch: 12 },  // 送货日期
            { wch: 15 },  // 产品名称
            { wch: 8 },   // 数量
            { wch: 10 },  // 重量
            { wch: 10 },  // 出发省
            { wch: 10 },  // 出发市
            { wch: 10 },  // 送达省
            { wch: 10 },  // 送达市
            { wch: 40 },  // 送达详细地址
            { wch: 20 }   // 备注
        ];

        // 添加工作表到工作簿
        XLSX.utils.book_append_sheet(wb, ws, '订单导入模板');
        
        // 下载文件
        XLSX.writeFile(wb, '订单导入模板.xlsx');
    };

    // 导入订单
    const handleImportOrder = (file) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                // 数据验证
                const errors = [];
                const orders = jsonData.map((row, index) => {
                    const rowNum = index + 2; // Excel行号从2开始（1是表头）

                    // 检查必填字段
                    if (!row['订单号']) errors.push(`第${rowNum}行：订单号不能为空`);
                    if (!row['下单日期']) errors.push(`第${rowNum}行：下单日期不能为空`);
                    if (!row['送货日期']) errors.push(`第${rowNum}行：送货日期不能为空`);
                    if (!row['产品名称']) errors.push(`第${rowNum}行：产品名称不能为空`);
                    if (!row['数量']) errors.push(`第${rowNum}行：数量不能为空`);
                    if (!row['重量(吨)']) errors.push(`第${rowNum}行：重量不能为空`);
                    if (!row['出发省']) errors.push(`第${rowNum}行：出发省不能为空`);
                    if (!row['出发市']) errors.push(`第${rowNum}行：出发市不能为空`);
                    if (!row['送达省']) errors.push(`第${rowNum}行：送达省不能为空`);
                    if (!row['送达市']) errors.push(`第${rowNum}行：送达市不能为空`);
                    if (!row['送达详细地址']) errors.push(`第${rowNum}行：送达详细地址不能为空`);

                    return {
                        order_number: row['订单号'],
                        order_date: row['下单日期'],
                        delivery_date: row['送货日期'],
                        product_name: row['产品名称'],
                        quantity: parseInt(row['数量']),
                        weight: parseFloat(row['重量(吨)']),
                        departure_province: row['出发省'],
                        departure_city: row['出发市'],
                        destination_province: row['送达省'],
                        destination_city: row['送达市'],
                        destination_address: row['送达详细地址'],
                        remark: row['备注']
                    };
                });

                // 如果有错误，显示错误信息并终止导入
                if (errors.length > 0) {
                    Modal.error({
                        title: '数据验证失败',
                        content: (
                            <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                                {errors.map((err, index) => (
                                    <p key={index}>{err}</p>
                                ))}
                            </div>
                        ),
                    });
                    return;
                }

                // 提交数据到后端
                const selectedProject = projects.find(p => p.project_name === form.getFieldValue('project_name'));
                if (!selectedProject) {
                    message.error('请先选择项目');
                    return;
                }

                const response = await axios.post(`${backendUrl}/api/order/import`, {
                    orders: orders,
                    project_id: selectedProject.value,
                    project_name: selectedProject.project_name
                });

                if (response.data.success) {
                    message.success('导入成功');
                    fetchOrders();
                } else {
                    message.error(response.data.error_message || '导入失败');
                }
            } catch (error) {
                console.error('导入错误:', error);
                message.error('导入失败：' + (error.response?.data?.error_message || error.message || '未知错误'));
            }
        };
        reader.readAsBinaryString(file);
        return false;
    };

    // 导入送货信息
    const handleImportDelivery = (file) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                // 数据验证
                const errors = [];
                const deliveries = jsonData.map((row, index) => {
                    const rowNum = index + 2; // Excel行号从2开始（1是表头）

                    // 检查必填字段
                    if (!row['子订单号']) errors.push(`第${rowNum}行：子订单号不能为空`);
                    if (!row['承运人名称']) errors.push(`第${rowNum}行：承运人名称不能为空`);
                    if (!row['承运类型']) errors.push(`第${rowNum}行：承运类型不能为空`);

                    // 验证承运类型
                    const carrierType = parseInt(row['承运类型']);
                    if (![1, 2].includes(carrierType)) {
                        errors.push(`第${rowNum}行：承运类型必须为1（司机直送）或2（承运商）`);
                    }

                    // 验证运费格式
                    if (row['运费'] && isNaN(parseFloat(row['运费']))) {
                        errors.push(`第${rowNum}行：运费必须为数字`);
                    }

                    return {
                        sub_order_numbers: row['子订单号'].split(',').map(n => n.trim()),
                        carrier_name: row['承运人名称'],
                        carrier_phone: row['承运人联系方式'],
                        carrier_plate: row['承运人车牌'],
                        carrier_type: carrierType,
                        carrier_fee: row['运费'] ? parseFloat(row['运费']) : null
                    };
                });

                // 如果有错误，显示错误信息并终止导入
                if (errors.length > 0) {
                    message.error(
                        <div>
                            <div>导入数据有误：</div>
                            {errors.map((err, index) => (
                                <div key={index}>{err}</div>
                            ))}
                        </div>
                    );
                    return;
                }

                // 提交数据到后端
                const response = await axios.post(`${backendUrl}/api/order/import_delivery`, {
                    deliveries: deliveries
                });

                if (response.data.success) {
                    message.success('导入成功');
                    fetchOrders();
                } else {
                    message.error(response.data.error_message || '导入失败');
                }
            } catch (error) {
                console.error('导入错误:', error);
                message.error('导入失败：' + (error.response?.data?.error_message || error.message || '未知错误'));
            }
        };
        reader.readAsBinaryString(file);
        return false;
    };

    // 处理编辑按钮点击
    const handleEdit = (record) => {
        setEditingOrder(record);
        editForm.setFieldsValue({
            order_number: record.order_number,
            order_date: dayjs(record.order_date),
            product_name: record.product_name,
            quantity: record.quantity,
            weight: record.weight,
            departure: [record.departure_province, record.departure_city],
            destination: [record.destination_province, record.destination_city],
            destination_address: record.destination_address,
            remark: record.remark
        });
        setEditModalVisible(true);
    };

    // 处理编辑提交
    const handleEditSubmit = async () => {
        try {
            const values = await editForm.validateFields();
            const [departure_province, departure_city] = values.departure;
            const [destination_province, destination_city] = values.destination;

            const response = await axios.post(`${backendUrl}/api/order/edit`, {
                id: editingOrder.id,
                order_number: values.order_number,
                order_date: values.order_date.format('YYYY-MM-DD'),
                product_name: values.product_name,
                quantity: parseInt(values.quantity),
                weight: parseFloat(values.weight),
                departure_province,
                departure_city,
                destination_province,
                destination_city,
                destination_address: values.destination_address,
                remark: values.remark
            });

            if (response.data.success) {
                message.success('编辑成功');
                setEditModalVisible(false);
                fetchOrders();
            } else {
                message.error(response.data.error_message || '编辑失败');
            }
        } catch (error) {
            console.error('编辑错误:', error);
            message.error('编辑失败：' + (error.response?.data?.error_message || error.message || '未知错误'));
        }
    };

    // 处理删除
    const handleDelete = async (id) => {
        try {
            const response = await axios.post(`${backendUrl}/api/order/delete`, { id });
            if (response.data.success) {
                message.success('删除成功');
                fetchOrders();
            } else {
                message.error(response.data.error_message || '删除失败');
            }
        } catch (error) {
            console.error('删除错误:', error);
            message.error('删除失败：' + (error.response?.data?.error_message || error.message || '未知错误'));
        }
    };

    // 表格列定义
    const allColumns = [
        {
            key: 'order_number',
            title: '订单号',
            dataIndex: 'order_number',
            width: 140,
        },
        {
            key: 'sub_order_number',
            title: '子订单号',
            dataIndex: 'sub_order_number',
            width: 140,
        },
        {
            key: 'order_date',
            title: '下单日期',
            dataIndex: 'order_date',
            width: 120,
        },
        {
            key: 'cargo_info',
            title: '货物信息',
            dataIndex: 'cargo_info',
            width: 150,
            render: (text) => (
                <div style={{ whiteSpace: 'pre-line' }}>
                    {text?.split('\n').map((line, index) => (
                        <div key={index}>{line}</div>
                    ))}
                </div>
            )
        },
        {
            key: 'departure',
            title: '出发地',
            dataIndex: 'departure',
            width: 120,
        },
        {
            key: 'destination',
            title: '送达地址',
            dataIndex: 'destination',
            width: 200,
        },
        {
            key: 'amount',
            title: '客户报价',
            dataIndex: 'amount',
            width: 80,
            render: (text) => `¥${text.toFixed(2)}`
        },
        {
            key: 'carrier_type',
            title: '承运类型',
            dataIndex: 'carrier_type',
            width: 80,
            render: (text) => {
                if (text === null || text === undefined) return '-';
                return text === 1 ? '司机直送' : '承运商';
            }
        },
        {
            key: 'carrier_info',
            title: '承运人信息',
            dataIndex: 'carrier_info',
            width: 150,
            render: (_, record) => {
                const info = [];
                if (record.carrier_name) info.push(`姓名：${record.carrier_name}`);
                if (record.carrier_phone) info.push(`电话：${record.carrier_phone}`);
                if (record.carrier_plate) info.push(`车牌：${record.carrier_plate}`);
                return info.length > 0 ? (
                    <div style={{ whiteSpace: 'pre-line' }}>
                        {info.join('\n')}
                    </div>
                ) : '-';
            }
        },
        {
            key: 'carrier_fee',
            title: '运费',
            dataIndex: 'carrier_fee',
            width: 80,
            render: (text) => text ? `¥${Number(text).toFixed(2)}` : '-'
        },
        {
            key: 'remark',
            title: '备注',
            dataIndex: 'remark',
            width: 150,
        },
        {
            key: 'action',
            title: '操作',
            width: 120,
            fixed: 'right',
            render: (_, record) => (
                <Space>
                    <Button type="link" size="small" onClick={() => handleEdit(record)}>编辑</Button>
                    <Popconfirm
                        title="确定要删除这条订单吗？"
                        onConfirm={() => handleDelete(record.id)}
                        okText="确定"
                        cancelText="取消"
                    >
                        <Button type="link" size="small" danger>删除</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    // 列设置状态
    const [columnSettings, setColumnSettings] = useState(() => {
        const savedSettings = localStorage.getItem('orderColumnSettings');
        return savedSettings ? JSON.parse(savedSettings) : allColumns.reduce((acc, col) => {
            acc[col.key] = true;
            return acc;
        }, {});
    });
    const [settingsVisible, setSettingsVisible] = useState(false);

    // 处理列设置变更
    const handleColumnSettingChange = (checkedValues) => {
        const newSettings = {};
        allColumns.forEach(col => {
            newSettings[col.key] = checkedValues.includes(col.key);
        });
        setColumnSettings(newSettings);
        localStorage.setItem('orderColumnSettings', JSON.stringify(newSettings));
    };

    // 获取当前显示的列
    const columns = [
        ...allColumns.filter(col => col.key !== 'action' && columnSettings[col.key]),
        allColumns.find(col => col.key === 'action') // 操作列始终显示
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
                            value={selectedProject}
                            filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            onChange={(value) => {
                                setSelectedProject(value);
                                const selectedProject = projects.find(p => p.value === value);
                                form.setFieldValue('project_name', selectedProject?.project_name);
                                fetchOrders({ current: 1 });
                            }}
                        />
                    </Form.Item>
                    <Space>
                        <Button icon={<DownloadOutlined />} onClick={handleDownloadOrderTemplate}>
                            下载订单模板
                        </Button>
                        <Button icon={<DownloadOutlined />} onClick={handleDownloadDeliveryTemplate}>
                            下载送货模板
                        </Button>
                        <Upload
                            accept=".xlsx,.xls"
                            beforeUpload={handleImportOrder}
                            showUploadList={false}
                        >
                            <Button type="primary" icon={<UploadOutlined />}>导入订单</Button>
                        </Upload>
                        <Upload
                            accept=".xlsx,.xls"
                            beforeUpload={handleImportDelivery}
                            showUploadList={false}
                        >
                            <Button type="primary" icon={<UploadOutlined />}>导入送货信息</Button>
                        </Upload>
                    </Space>
                </div>
            </Card>

            <Card>
                <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '14px' }}>订单列表</div>
                    <Space>
                        <Button
                            icon={<SettingOutlined />}
                            onClick={() => setSettingsVisible(true)}
                        >
                            列设置
                        </Button>
                        <Button type="primary" onClick={handleExport}>
                            导出订单
                        </Button>
                    </Space>
                </div>

                <Form form={form} layout="inline" style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ flex: 1, display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <Form.Item label="下单日期" name="order_date">
                                <RangePicker style={{ width: '360px' }} />
                            </Form.Item>
                            <Form.Item label="订单号" name="order_number">
                                <Input placeholder="请输入订单号" style={{ width: '240px' }} />
                            </Form.Item>
                            <Form.Item label="送达城市" name="destination">
                                <Cascader
                                    options={cascaderOptions}
                                    placeholder="请选择送达城市"
                                    style={{ width: '240px' }}
                                    showSearch={{
                                        filter: (inputValue, path) => {
                                            return path.some(option => {
                                                const label = option.label.toLowerCase();
                                                const input = inputValue.toLowerCase();
                                                return label.indexOf(input) > -1;
                                            });
                                        }
                                    }}
                                />
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
                    scroll={{
                        x: 1900,
                        y: 'calc(100vh - 380px)',
                    }}
                />
            </Card>

            {/* 编辑对话框 */}
            <Modal
                title="编辑订单"
                open={editModalVisible}
                onOk={handleEditSubmit}
                onCancel={() => setEditModalVisible(false)}
                width={800}
            >
                <Form
                    form={editForm}
                    layout="vertical"
                >
                    <Form.Item
                        name="order_number"
                        label="订单号"
                        rules={[{ required: true, message: '请输入订单号' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="order_date"
                        label="下单日期"
                        rules={[{ required: true, message: '请选择下单日期' }]}
                    >
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                        name="product_name"
                        label="产品名称"
                        rules={[{ required: true, message: '请输入产品名称' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="quantity"
                        label="数量"
                        rules={[
                            { required: true, message: '请输入数量' },
                            { type: 'number', min: 1, transform: (value) => Number(value) }
                        ]}
                    >
                        <Input type="number" />
                    </Form.Item>

                    <Form.Item
                        name="weight"
                        label="重量(吨)"
                        rules={[
                            { required: true, message: '请输入重量' },
                            { type: 'number', min: 0.001, transform: (value) => Number(value) }
                        ]}
                    >
                        <Input type="number" step="0.001" />
                    </Form.Item>

                    <Form.Item
                        name="departure"
                        label="出发地"
                        rules={[{ required: true, message: '请选择出发地' }]}
                    >
                        <Cascader options={cascaderOptions} />
                    </Form.Item>

                    <Form.Item
                        name="destination"
                        label="送达地"
                        rules={[{ required: true, message: '请选择送达地' }]}
                    >
                        <Cascader options={cascaderOptions} />
                    </Form.Item>

                    <Form.Item
                        name="destination_address"
                        label="送达详细地址"
                        rules={[{ required: true, message: '请输入送达详细地址' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="remark"
                        label="备注"
                    >
                        <Input.TextArea />
                    </Form.Item>
                </Form>
            </Modal>

            {/* 列设置弹窗 */}
            <Modal
                title="列设置"
                open={settingsVisible}
                onOk={() => setSettingsVisible(false)}
                onCancel={() => setSettingsVisible(false)}
                width={400}
            >
                <Checkbox.Group
                    value={Object.entries(columnSettings)
                        .filter(([key, value]) => value && key !== 'action')
                        .map(([key]) => key)}
                    onChange={handleColumnSettingChange}
                    style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                >
                    {allColumns
                        .filter(col => col.key !== 'action')
                        .map(col => (
                            <Checkbox key={col.key} value={col.key}>
                                {col.title}
                            </Checkbox>
                        ))}
                </Checkbox.Group>
            </Modal>
        </div>
    );
}; 