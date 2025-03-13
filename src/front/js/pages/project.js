import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Table, Space, message, Upload, Modal, DatePicker, Card, Typography, Row, Col } from 'antd';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Context } from "../store/appContext";
import { responseHandler } from '../component/responseHandler';
import FileSaver from 'file-saver';
import * as XLSX from 'xlsx';
import { UploadOutlined, SearchOutlined, DownloadOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;

const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

const ExcelUploader = () => {
	const [file, setFile] = React.useState(null);

	function convertExcelDate(serial) {
		const baseDate = new Date(1899, 11, 31); // 注意：月份是从0开始的，所以11代表12月
		const date = new Date(baseDate);
		date.setUTCDate(date.getUTCDate() + serial);
		return date.toISOString().split('T')[0]; // 返回格式如 '2024-01-01'
	}

	const handleFileChange = info => {
		console.log('File change info.file:', JSON.stringify(info.file)); // 调试信息
		console.log('File change info:', JSON.stringify(info)); // 调试信息

		console.log('file.status'); // 调试信息

		const headerMap = {
			'项目名称': 'project_name',
			'客户名称': 'customer_name',
			'合作起始时间': 'start_date',
			'合作结束时间': 'end_date',
			'项目描述': 'project_description'
		}
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
					header = headerMap[header];
					if (header === 'start_date' || header === 'end_date') {
						obj[header] = convertExcelDate(row[index]);
					} else {
						obj[header] = row[index];
					}
					return obj;
				}, {});
			});

			console.log(`handleFileChange records=${JSON.stringify(records)}`)

			// 发送数据到后端
			axios.post(`${backendUrl}/api/project/upload`, { upload_list: records })
				.then(response => {
					responseHandler(response.data, () => {
						message.success('数据上传成功');
					});
				})
				.catch(error => {
					message.error('数据上传失败');
					console.error('Error uploading data:', error);
				});
		};
		reader.readAsBinaryString(info.file);
	};

	const beforeUpload = info => {
		setFile(info.file);
		return false; // 禁止默认上传行为
	};

	return (
		<Upload
			name="file"
			accept=".xlsx,.xls"
			beforeUpload={beforeUpload}
			onChange={handleFileChange}
			showUploadList={false}/*  */
		>
			<Button icon={<UploadOutlined />} type="primary">批量导入</Button>
		</Upload>
	);
};


export const Project = () => {
	const [queryForm] = Form.useForm();
	const [editForm] = Form.useForm();
	const [searchQuery, setSearchQuery] = useState('');

	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(false);
	const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
	const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editData, setEditData] = useState(null);

	const fetchData = async (params = {}) => {
		setLoading(true);
		try {

			const response = await axios.post(`${backendUrl}/api/project/list`, {
				search_query: searchQuery,
				page: params.pagination.current || 1,
				per_page: params.pagination.pageSize || 10,
			});
			setData(response.data.data);
			setPagination({
				...params.pagination,
				total: response.data.total,
			});

		} catch (error) {
			console.log(error)
			message.error('获取数据失败');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchData({ pagination: pagination });
	}, []);

	const handleTableChange = (newPagination) => {
		setPagination({
			...pagination,
			current: newPagination.current,
			pageSize: newPagination.pageSize,
		});

		fetchData({
			pagination: { ...newPagination },
		});
	};

	const downloadExcelTemplate = () => {
		// 创建工作簿
		const wb = XLSX.utils.book_new();
		// 创建工作表
		const ws = XLSX.utils.aoa_to_sheet([['项目名称', '客户名称', '合作起始时间', '合作结束时间', '项目描述']]);
		// 将工作表添加到工作簿
		XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
		// 生成文件
		const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
		// 使用FileSaver保存文件
		FileSaver.saveAs(new Blob([s2ab(wbout)], { type: 'application/octet-stream' }), '项目模板.xlsx');
	};

	const handleDelete = (id) => {
		setConfirmDelete({ open: true, id });
	};

	const handleDeleteConfirm = () => {
		axios.post(`${backendUrl}/api/project/delete`, { id: confirmDelete.id })
			.then(response => {
				responseHandler(response.data, () => {
					message.success('删除成功');
				});
				fetchData({
					pagination: { ...pagination },
				}); // 重新获取数据以更新表格
			})
			.catch(error => {
				message.error('删除失败');
				console.error(error);
			})
			.finally(() => {
				setConfirmDelete({ open: false, id: null });
			});
	};

	const handleDeleteCancel = () => {
		setConfirmDelete({ open: false, id: null });
	};

	const handleEdit = (id) => {
		const project = data.find(item => item.id === id);

		if (project) {
			editForm.setFieldsValue({
				...project,
				start_date: dayjs(project.start_date),
				end_date: dayjs(project.end_date)
			});
			setEditData(project);

			setIsModalOpen(true);
		}
	};

	const handleCancel = () => {
		setIsModalOpen(false);
		setEditData(null);
		editForm.resetFields();
	};

	const handleEditSubmit = async (values) => {
		try {
			const response = await axios.post(`${backendUrl}/api/project/edit`, {
				...editData,
				...values,
				start_date: values.start_date.format('YYYY-MM-DD'),
				end_date: values.end_date.format('YYYY-MM-DD'),
			});
			responseHandler(response.data, () => {
				message.success('编辑成功');
			});
			setIsModalOpen(false);
			setEditData(null);
			editForm.resetFields();
			fetchData({
				pagination: { ...pagination },
			}); // 重新获取数据以更新表格
		} catch (error) {
			message.error('编辑失败');
			console.error(error);
		}
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
			title: '项目名称',
			dataIndex: 'project_name',
			key: 'project_name',
			ellipsis: true,
			width: 200,
		},
		{
			title: '客户名称',
			dataIndex: 'customer_name',
			key: 'customer_name',
			ellipsis: true,
			width: 150,
		},
		{
			title: '合作起始时间',
			dataIndex: 'start_date',
			key: 'start_date',
			width: 120,
		},
		{
			title: '合作结束时间',
			dataIndex: 'end_date',
			key: 'end_date',
			width: 120,
		},
		{
			title: '项目描述',
			dataIndex: 'project_description',
			key: 'project_description',
			ellipsis: true,
			width: 200,
		},
		{
			title: '操作',
			key: 'action',
			fixed: 'right',
			width: 200,
			render: (_, record) => (
				<Space size="middle">
					<Button 
						type="link" 
						icon={<EditOutlined />}
						onClick={() => handleEdit(record.id)}
						style={{ padding: '0 4px' }}
					>
						编辑
					</Button>
					<Button 
						type="link" 
						icon={<DeleteOutlined />}
						onClick={() => handleDelete(record.id)}
						style={{ padding: '0 4px', color: '#ff4d4f' }}
					>
						删除
					</Button>
					<Button 
						type="link" 
						icon={<EyeOutlined />}
						style={{ padding: '0 4px' }}
					>
						查看价格表
					</Button>
				</Space>
			),
		},
	];

	return (
		<div style={{ padding: '24px' }}>
			<Card>
				<Title level={2} style={{ marginBottom: '24px' }}>项目管理</Title>
				
				<Form
					form={queryForm}
					layout="vertical"
					onFinish={fetchData}
					initialValues={{ name: '' }}
					style={{ marginBottom: '24px' }}
				>
					<Row gutter={16}>
						<Col span={8}>
							<Form.Item label="搜索" name="search">
								<Input
									placeholder="输入项目名称或客户名称"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									prefix={<SearchOutlined />}
									allowClear
								/>
							</Form.Item>
						</Col>
						<Col span={16}>
							<Form.Item label="操作" style={{ marginBottom: 0 }}>
								<Space>
									<Button 
										type="primary" 
										icon={<SearchOutlined />}
										onClick={() => {
											fetchData({ pagination: pagination });
										}}
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

			<Modal
				title="确认删除"
				open={confirmDelete.open}
				onOk={handleDeleteConfirm}
				onCancel={handleDeleteCancel}
				okText='确认'
				cancelText='取消'
				okButtonProps={{ danger: true }}
			>
				<p>确定要删除这个项目吗？此操作不可恢复。</p>
			</Modal>

			<Modal
				title="编辑项目"
				open={isModalOpen}
				onOk={() => {
					editForm.submit();
				}}
				onCancel={handleCancel}
				width={600}
			>
				<Form
					form={editForm}
					layout="vertical"
					initialValues={{
						...editData,
						start_date: editData ? dayjs(editData.start_date) : dayjs('2024-01-01'),
						end_date: editData ? dayjs(editData.end_date) : dayjs('2024-01-01')
					}}
					onFinish={handleEditSubmit}
				>
					<Row gutter={16}>
						<Col span={12}>
							<Form.Item 
								label="项目名称" 
								name="project_name"
								rules={[{ required: true, message: '请输入项目名称' }]}
							>
								<Input placeholder="请输入项目名称" />
							</Form.Item>
						</Col>
						<Col span={12}>
							<Form.Item 
								label="客户名称" 
								name="customer_name"
								rules={[{ required: true, message: '请输入客户名称' }]}
							>
								<Input placeholder="请输入客户名称" />
							</Form.Item>
						</Col>
					</Row>
					<Row gutter={16}>
						<Col span={12}>
							<Form.Item 
								label="合作起始时间" 
								name="start_date"
								rules={[{ required: true, message: '请选择合作起始时间' }]}
							>
								<DatePicker style={{ width: '100%' }} />
							</Form.Item>
						</Col>
						<Col span={12}>
							<Form.Item 
								label="合作结束时间" 
								name="end_date"
								rules={[{ required: true, message: '请选择合作结束时间' }]}
							>
								<DatePicker style={{ width: '100%' }} />
							</Form.Item>
						</Col>
					</Row>
					<Form.Item 
						label="项目描述" 
						name="project_description"
					>
						<TextArea 
							rows={4} 
							placeholder="请输入项目描述"
							showCount
							maxLength={1000}
						/>
					</Form.Item>
				</Form>
			</Modal>
		</div>
	);
};