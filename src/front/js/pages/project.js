import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Space, message, Modal, DatePicker, Card, Typography, Row, Col, Pagination, Table } from 'antd';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Context } from "../store/appContext";
import { responseHandler } from '../component/responseHandler';
import { SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Meta } = Card;

const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

export const Project = () => {
	const [queryForm] = Form.useForm();
	const [createForm] = Form.useForm();
	const [editForm] = Form.useForm();
	const [searchQuery, setSearchQuery] = useState('');
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(false);
	const [pagination, setPagination] = useState({ current: 1, pageSize: 9, total: 0 });
	const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [editData, setEditData] = useState(null);
	const [priceTableData, setPriceTableData] = useState([]);

	const fetchData = async (params = {}) => {
		setLoading(true);
		try {
			const response = await axios.post(`${backendUrl}/api/project/list`, {
				search_query: searchQuery,
				page: params.current || 1,
				per_page: params.pageSize || 9,
			});
			setData(response.data.data);
			setPagination({
				...params,
				total: response.data.total,
			});
		} catch (error) {
			console.log(error);
			message.error('获取数据失败');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchData(pagination);
	}, []);

	const handlePageChange = (page, pageSize) => {
		setPagination({
			...pagination,
			current: page,
			pageSize: pageSize,
		});
		fetchData({
			current: page,
			pageSize: pageSize,
		});
	};

	const handleDelete = (id) => {
		setConfirmDelete({ open: true, id });
	};

	const handleDeleteConfirm = () => {
		axios.post(`${backendUrl}/api/project/delete`, { id: confirmDelete.id })
			.then(response => {
				responseHandler(response.data, () => {
					message.success('删除成功');
					fetchData(pagination);
				});
			})
			.catch(error => {
				message.error('删除失败');
				console.error(error);
			})
			.finally(() => {
				setConfirmDelete({ open: false, id: null });
			});
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
				setIsModalOpen(false);
				setEditData(null);
				editForm.resetFields();
				fetchData(pagination);
			});
		} catch (error) {
			message.error('编辑失败');
			console.error(error);
		}
	};

	const handleCreate = () => {
		setIsCreateModalOpen(true);
	};

	const handleCreateCancel = () => {
		setIsCreateModalOpen(false);
		createForm.resetFields();
	};

	const handleCreateSubmit = async (values) => {
		try {
			const response = await axios.post(`${backendUrl}/api/project/create`, {
				...values,
				start_date: values.start_date.format('YYYY-MM-DD'),
				end_date: values.end_date.format('YYYY-MM-DD'),
			});
			responseHandler(response.data, () => {
				message.success('创建成功');
				setIsCreateModalOpen(false);
				createForm.resetFields();
				fetchData(pagination);
			});
		} catch (error) {
			message.error('创建失败');
			console.error(error);
		}
	};

	return (
		<div style={{ padding: '24px' }}>
			<Card>
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
										onClick={() => fetchData(pagination)}
									>
										查询
									</Button>
									<Button 
										type="primary"
										icon={<PlusOutlined />}
										onClick={handleCreate}
									>
										新建
									</Button>
								</Space>
							</Form.Item>
						</Col>
					</Row>
				</Form>

				<Row gutter={[16, 16]}>
					{data.map(project => (
						<Col span={8} key={project.id}>
							<Card
								loading={loading}
								actions={[
									<Button 
										type="link" 
										icon={<EditOutlined />}
										onClick={() => handleEdit(project.id)}
										key="edit"
									>
										编辑
									</Button>,
									<Button 
										type="link" 
										icon={<DeleteOutlined />}
										onClick={() => handleDelete(project.id)}
										key="delete"
										danger
									>
										删除
									</Button>,
									<Button 
										type="link" 
										icon={<EyeOutlined />}
										key="view"
									>
										查看价格表
									</Button>
								]}
							>
								<Meta
									title={project.project_name}
									description={
										<div>
											<p><strong>客户名称：</strong>{project.customer_name}</p>
											<p><strong>合作时间：</strong>{project.start_date} 至 {project.end_date}</p>
											<p><strong>项目描述：</strong>{project.project_description}</p>
										</div>
									}
								/>
							</Card>
						</Col>
					))}
				</Row>

				<div style={{ marginTop: '24px', textAlign: 'right' }}>
					<Pagination
						current={pagination.current}
						pageSize={pagination.pageSize}
						total={pagination.total}
						onChange={handlePageChange}
						showSizeChanger
						showQuickJumper
						showTotal={(total) => `共 ${total} 条记录`}
					/>
				</div>
			</Card>

			<Modal
				title="新建项目"
				open={isCreateModalOpen}
				onOk={() => createForm.submit()}
				onCancel={handleCreateCancel}
				width={800}
			>
				<Form
					form={createForm}
					layout="vertical"
					onFinish={handleCreateSubmit}
					initialValues={{
						start_date: dayjs(),
						end_date: dayjs().add(1, 'year')
					}}
				>
					<Form.Item 
						label="项目名称" 
						name="project_name"
						rules={[{ required: true, message: '请输入项目名称' }]}
					>
						<Input placeholder="请输入项目名称" />
					</Form.Item>

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

					<Form.Item label="报价表">
						<Table
							dataSource={priceTableData}
							columns={[
								{
									title: '出发地',
									dataIndex: 'departure_city',
									key: 'departure_city',
								},
								{
									title: '到达省',
									dataIndex: 'destination_province',
									key: 'destination_province',
								},
								{
									title: '到达市',
									dataIndex: 'destination_city',
									key: 'destination_city',
								},
								{
									title: '承运类型',
									dataIndex: 'transport_type',
									key: 'transport_type',
								},
								{
									title: '价格（元/吨）',
									dataIndex: 'price',
									key: 'price',
								},
							]}
							pagination={false}
							size="small"
						/>
						<Button 
							type="primary" 
							icon={<PlusOutlined />} 
							style={{ marginTop: '16px' }}
						>
							Excel 导入
						</Button>
					</Form.Item>

					<Form.Item 
						label="项目介绍" 
						name="project_description"
					>
						<TextArea 
							rows={4} 
							placeholder="请输入项目介绍"
							showCount
							maxLength={1000}
						/>
					</Form.Item>
				</Form>
			</Modal>

			<Modal
				title="确认删除"
				open={confirmDelete.open}
				onOk={handleDeleteConfirm}
				onCancel={() => setConfirmDelete({ open: false, id: null })}
				okText='确认'
				cancelText='取消'
				okButtonProps={{ danger: true }}
			>
				<p>确定要删除这个项目吗？此操作不可恢复。</p>
			</Modal>

			<Modal
				title="编辑项目"
				open={isModalOpen}
				onOk={() => editForm.submit()}
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