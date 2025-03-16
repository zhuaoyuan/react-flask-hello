import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Table, Space, message, Upload, Modal, Card, Typography, Row, Col } from 'antd';
import axios from 'axios';
import { responseHandler } from '../component/responseHandler';
import FileSaver from 'file-saver';
import * as XLSX from 'xlsx';
import { UploadOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons';

const { Title } = Typography;
const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

const ExcelUploader = () => {
    const [file, setFile] = React.useState(null);

    const handleFileChange = info => {
        const headerMap = {
            '项目ID': 'project_id',
            '项目名称': 'project_name',
            '出发省': 'departure_province',
            '出发市': 'departure_city',
            '到达省': 'destination_province',
            '到达市': 'destination_city',
            '每吨价格': 'unit_price'
        };

        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            // 提取表头
            const headers = jsonData[0];
            const records = jsonData.slice(1).map(row => {
                return headers.reduce((obj, header, index) => {
                    const key = headerMap[header];
                    if (key) {
                        if (key === 'unit_price') {
                            obj[key] = parseInt(row[index]);
                        } else {
                            obj[key] = row[index];
                        }
                    }
                    return obj;
                }, {});
            });

            // 发送数据到后端
            axios.post(`${backendUrl}/api/project_price_config/upload`, { upload_list: records })
                .then(response => {
                    if (response.data.success) {
                        message.success('数据上传成功');
                    } else {
                        // 显示详细的错误信息
                        Modal.error({
                            title: '导入失败',
                            content: response.data.error_message,
                            width: 800,
                        });
                    }
                })
                .catch(error => {
                    message.error('数据上传失败');
                    console.error('Error uploading data:', error);
                });
        };
        reader.readAsBinaryString(info.file);
    };

    const beforeUpload = file => {
        setFile(file);
        return false; // 禁止默认上传行为
    };

    return (
        <Upload
            name="file"
            accept=".xlsx,.xls"
            beforeUpload={beforeUpload}
            onChange={handleFileChange}
            showUploadList={false}
        >
            <Button icon={<UploadOutlined />} type="primary">批量导入</Button>
        </Upload>
    );
};

export const Price = () => {
    const [queryForm] = Form.useForm();
    const [searchQuery, setSearchQuery] = useState('');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
    const [departureProvince, setDepartureProvince] = useState('');
    const [departureCity, setDepartureCity] = useState('');

    const fetchData = async (params = {}) => {
        setLoading(true);
        try {
            const response = await axios.post(`${backendUrl}/api/project_price_config/list`, {
                project_name: searchQuery,
                departure_province: departureProvince,
                departure_city: departureCity,
                page: params.pagination?.current || 1,
                per_page: params.pagination?.pageSize || 10,
            });
            
            setData(response.data.result.items);
            setPagination({
                ...params.pagination,
                total: response.data.result.total,
            });
        } catch (error) {
            console.log(error);
            message.error('获取数据失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData({ pagination });
    }, [departureProvince, departureCity]);

    const handleTableChange = (newPagination) => {
        setPagination(newPagination);
        fetchData({ pagination: newPagination });
    };

    const downloadExcelTemplate = () => {
        // 创建工作簿
        const wb = XLSX.utils.book_new();
        // 创建工作表
        const ws = XLSX.utils.aoa_to_sheet([['项目ID', '项目名称', '出发省', '出发市', '到达省', '到达市', '每吨价格']]);
        // 将工作表添加到工作簿
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        // 生成文件
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
        // 使用FileSaver保存文件
        FileSaver.saveAs(
            new Blob([s2ab(wbout)], { type: 'application/octet-stream' }), 
            '价格配置模板.xlsx'
        );
    };

    const s2ab = (s) => {
        const buf = new ArrayBuffer(s.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i < s.length; i++) {
            view[i] = s.charCodeAt(i) & 0xFF;
        }
        return buf;
    };

    const columns = [
        {
            title: '项目ID',
            dataIndex: 'project_id',
            key: 'project_id',
            width: 100,
        },
        {
            title: '项目名称',
            dataIndex: 'project_name',
            key: 'project_name',
            width: 200,
            ellipsis: true,
        },
        {
            title: '出发省',
            dataIndex: 'departure_province',
            key: 'departure_province',
            width: 120,
        },
        {
            title: '出发市',
            dataIndex: 'departure_city',
            key: 'departure_city',
            width: 120,
        },
        {
            title: '到达省',
            dataIndex: 'destination_province',
            key: 'destination_province',
            width: 120,
        },
        {
            title: '到达市',
            dataIndex: 'destination_city',
            key: 'destination_city',
            width: 120,
        },
        {
            title: '每吨价格(元)',
            dataIndex: 'unit_price',
            key: 'unit_price',
            width: 120,
        }
    ];

    return (
        <div style={{ padding: '24px' }}>
            <Card>
                <Title level={2} style={{ marginBottom: '24px' }}>价格管理</Title>
                
                <Form
                    form={queryForm}
                    layout="vertical"
                    onFinish={fetchData}
                    initialValues={{ name: '' }}
                    style={{ marginBottom: '24px' }}
                >
                    <Row gutter={16}>
                        <Col span={6}>
                            <Form.Item label="搜索" name="search">
                                <Input
                                    placeholder="输入项目名称"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    prefix={<SearchOutlined />}
                                    allowClear
                                />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item label="出发省份" name="departure_province">
                                <Input
                                    placeholder="请输入出发省份"
                                    value={departureProvince}
                                    onChange={(e) => setDepartureProvince(e.target.value)}
                                    allowClear
                                />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item label="出发城市" name="departure_city">
                                <Input
                                    placeholder="请输入出发城市"
                                    value={departureCity}
                                    onChange={(e) => setDepartureCity(e.target.value)}
                                    allowClear
                                />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item label="操作" style={{ marginBottom: 0 }}>
                                <Space>
                                    <Button 
                                        type="primary" 
                                        icon={<SearchOutlined />}
                                        onClick={() => fetchData({ pagination })}
                                    >
                                        查询
                                    </Button>
                                    <ExcelUploader />
                                    <Button 
                                        icon={<DownloadOutlined />}
                                        onClick={downloadExcelTemplate}
                                    >
                                        下载模板
                                    </Button>
                                </Space>
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>

                <Table
                    columns={columns}
                    rowKey={record => record.id}
                    dataSource={data}
                    loading={loading}
                    pagination={{
                        ...pagination,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total) => `共 ${total} 条记录`,
                    }}
                    onChange={handleTableChange}
                    scroll={{ x: 1300 }}
                />
            </Card>
        </div>
    );
};