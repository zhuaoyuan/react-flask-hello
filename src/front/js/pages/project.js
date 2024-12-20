import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Table, Space, message, Upload, Modal, DatePicker } from 'antd';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Context } from "../store/appContext";
import { responseHandler } from '../component/responseHandler';
import FileSaver from 'file-saver';
import * as XLSX from 'xlsx';
import { UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';


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
			showUploadList={false}
		>
			<Button icon={<UploadOutlined />}>批量导入</Button>
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
		},
		{
			title: '客户名称',
			dataIndex: 'customer_name',
			key: 'customer_name',
		},
		{
			title: '合作起始时间',
			dataIndex: 'start_date',
			key: 'start_date',
		},
		{
			title: '合作结束时间',
			dataIndex: 'end_date',
			key: 'end_date',
		},
		{
			title: '项目描述',
			dataIndex: 'project_description',
			key: 'project_description',
		},
		{
			title: '操作',
			key: 'action',
			render: (_, record) => (
				<Space size="middle">
					<a onClick={() => handleEdit(record.id)}>编辑</a>
					<a onClick={() => handleDelete(record.id)}>删除</a>
					<a>查看价格表</a>
				</Space>
			),
		},
	];

	return (
		<div>
			<Form
				form={queryForm}
				layout="vertical"
				onFinish={fetchData}
				initialValues={{ name: '' }}
			>
				<Form.Item label="搜索" name="search">
					<Input
						placeholder="输入搜索关键词"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</Form.Item>
				<Form.Item>
					<Space>
						<Button type="primary" onClick={() => {
							fetchData({ pagination: pagination });
						}}>
							查询
						</Button>
						<ExcelUploader />
						<Button onClick={downloadExcelTemplate} type="primary">
							下载模板
						</Button>
					</Space>
				</Form.Item>
			</Form>
			<Table
				columns={columns}
				rowKey={record => record.id}
				dataSource={data}
				loading={loading}
				pagination={pagination}
				onChange={handleTableChange}
			/>
			<Modal
				title="确认删除"
				open={confirmDelete.open}
				onOk={handleDeleteConfirm}
				onCancel={handleDeleteCancel}
				okText='确认'
				cancelText='取消'
			>
				<p>确定要删除这个项目吗？</p>
			</Modal>
			<Modal
				title="编辑项目"
				open={isModalOpen}
				onOk={() => {
					editForm.submit();
				}}
				onCancel={handleCancel}
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
					<Form.Item label="项目名称" name="project_name">
						<Input />
					</Form.Item>
					<Form.Item label="客户名称" name="customer_name">
						<Input />
					</Form.Item>
					<Form.Item label="合作起始时间" name="start_date">
						<DatePicker />
					</Form.Item>
					<Form.Item label="合作结束时间" name="end_date">
						<DatePicker />
					</Form.Item>
					<Form.Item label="项目描述" name="project_description">
						<Input.TextArea />
					</Form.Item>
				</Form>
			</Modal>
		</div>
	);
};