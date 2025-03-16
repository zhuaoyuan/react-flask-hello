import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Space, message, Modal, DatePicker, Card, Typography, Row, Col, Pagination, Table, Upload, Tabs, Cascader, InputNumber, Select } from 'antd';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Context } from "../store/appContext";
import { responseHandler } from '../component/responseHandler';
import { SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined, PlusOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { provinces_and_cities } from '../data/provinces_and_cities';

const { TextArea } = Input;
const { Meta } = Card;

const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

const TRANSPORT_TYPES = ['整车运输', '零担运输'];

// 校验价格配置数据
const validatePriceData = (data) => {
	const errors = [];
	const uniqueKeys = new Set();

	data.forEach((item, index) => {
		// 校验省市是否存在
		if (!provinces_and_cities[item.departure_province]) {
			errors.push(`第 ${index + 1} 行：出发省 "${item.departure_province}" 不存在`);
		} else if (!provinces_and_cities[item.departure_province].includes(item.departure_city)) {
			errors.push(`第 ${index + 1} 行：出发市 "${item.departure_city}" 不是 ${item.departure_province} 的城市`);
		}

		if (!provinces_and_cities[item.destination_province]) {
			errors.push(`第 ${index + 1} 行：到达省 "${item.destination_province}" 不存在`);
		} else if (!provinces_and_cities[item.destination_province].includes(item.destination_city)) {
			errors.push(`第 ${index + 1} 行：到达市 "${item.destination_city}" 不是 ${item.destination_province} 的城市`);
		}

		// 校验承运类型
		if (!TRANSPORT_TYPES.includes(item.transport_type)) {
			errors.push(`第 ${index + 1} 行：承运类型必须是 "整车运输" 或 "零担运输"`);
		}

		// 校验唯一性
		const key = `${item.departure_province}-${item.departure_city}-${item.destination_province}-${item.destination_city}`;
		if (uniqueKeys.has(key)) {
			errors.push(`第 ${index + 1} 行：出发地-到达地组合重复`);
		}
		uniqueKeys.add(key);

		// 校验价格
		if (typeof item.price !== 'number' || item.price <= 0) {
			errors.push(`第 ${index + 1} 行：价格必须是大于0的数字`);
		}
	});

	return errors;
};

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
	const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
	const [currentProject, setCurrentProject] = useState(null);
	const [priceLoading, setPriceLoading] = useState(false);
	const [pricePagination, setPricePagination] = useState({ current: 1, pageSize: 10, total: 0 });
	const [priceList, setPriceList] = useState([]);
	const [profitList, setProfitList] = useState([]);
	const [profitLoading, setProfitLoading] = useState(false);
	const [profitPagination, setProfitPagination] = useState({ current: 1, pageSize: 10, total: 0 });
	const [priceFilterForm] = Form.useForm();
	const [priceFilters, setPriceFilters] = useState({});

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
		let isSubscribed = true;

		const fetchDataSafely = async () => {
			setLoading(true);
			try {
				const response = await axios.post(`${backendUrl}/api/project/list`, {
					search_query: searchQuery,
					page: pagination.current || 1,
					per_page: pagination.pageSize || 9,
				});
				if (isSubscribed) {
					setData(response.data.data);
					setPagination(prev => ({
						...prev,
						total: response.data.total,
					}));
				}
			} catch (error) {
				if (isSubscribed) {
					console.log(error);
					message.error('获取数据失败');
				}
			} finally {
				if (isSubscribed) {
					setLoading(false);
				}
			}
		};

		fetchDataSafely();

		return () => {
			isSubscribed = false;
		};
	}, [searchQuery, pagination.current, pagination.pageSize]);

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

	const handleExcelImport = (file) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const data = e.target.result;
				const workbook = XLSX.read(data, { type: 'binary' });
				const sheetName = workbook.SheetNames[0];
				const worksheet = workbook.Sheets[sheetName];
				const jsonData = XLSX.utils.sheet_to_json(worksheet);

				// 转换数据格式
				const priceData = jsonData.map(row => ({
					departure_province: row['出发省'],
					departure_city: row['出发市'],
					destination_province: row['到达省'],
					destination_city: row['到达市'],
					transport_type: row['承运类型'],
					price: Number(row['价格（元/吨）'])
				}));

				// 校验数据
				const errors = validatePriceData(priceData);
				if (errors.length > 0) {
					Modal.error({
						title: '数据验证失败',
						content: (
							<div style={{ maxHeight: '300px', overflow: 'auto' }}>
								{errors.map((error, index) => (
									<p key={index}>{error}</p>
								))}
							</div>
						),
					});
					return;
				}

				// 设置价格表数据
				setPriceTableData(priceData);
				message.success('价格配置导入成功');
			} catch (error) {
				console.error('Excel 解析错误:', error);
				message.error('Excel 文件解析失败');
			}
		};
		reader.readAsBinaryString(file);
		return false; // 阻止自动上传
	};

	const handleCreateSubmit = async (values) => {
		// 校验日期
		if (values.start_date.isAfter(values.end_date)) {
			message.error('合作起始时间不能晚于结束时间');
			return;
		}

		// 校验价格配置
		if (priceTableData.length === 0) {
			message.error('请导入价格配置');
			return;
		}

		const errors = validatePriceData(priceTableData);
		if (errors.length > 0) {
			Modal.error({
				title: '价格配置验证失败',
				content: (
					<div style={{ maxHeight: '300px', overflow: 'auto' }}>
						{errors.map((error, index) => (
							<p key={index}>{error}</p>
						))}
					</div>
				),
			});
			return;
		}

		try {
			const response = await axios.post(`${backendUrl}/api/project/create`, {
				...values,
				start_date: values.start_date.format('YYYY-MM-DD'),
				end_date: values.end_date.format('YYYY-MM-DD'),
				price_config: priceTableData
			});

			responseHandler(response.data, () => {
				message.success('创建成功');
				setIsCreateModalOpen(false);
				createForm.resetFields();
				setPriceTableData([]);
				fetchData(pagination);
			});
		} catch (error) {
			if (error.response?.data?.error === 'PROJECT_NAME_EXISTS') {
				message.error('项目名称已存在');
			} else {
				message.error('创建失败');
				console.error(error);
			}
		}
	};

	// 添加下载模板函数
	const handleDownloadTemplate = () => {
		// 创建工作簿
		const wb = XLSX.utils.book_new();
		
		// 创建示例数据
		const exampleData = [
			{
				'出发省': '浙江省',
				'出发市': '杭州市',
				'到达省': '江苏省',
				'到达市': '南京市',
				'承运类型': '整车运输',
				'价格（元/吨）': 1000
			}
		];
		
		// 创建工作表
		const ws = XLSX.utils.json_to_sheet(exampleData);
		
		// 设置列宽
		const wscols = [
			{wch: 15}, // 出发省
			{wch: 15}, // 出发市
			{wch: 15}, // 到达省
			{wch: 15}, // 到达市
			{wch: 15}, // 承运类型
			{wch: 15}  // 价格
		];
		ws['!cols'] = wscols;
		
		// 将工作表添加到工作簿
		XLSX.utils.book_append_sheet(wb, ws, '价格配置模板');
		
		// 下载文件
		XLSX.writeFile(wb, '价格配置导入模板.xlsx');
	};

	// 将省市数据转换为级联选择器需要的格式
	const getCascaderOptions = () => {
		return Object.entries(provinces_and_cities).map(([province, cities]) => ({
			value: province,
			label: province,
			children: cities.map(city => ({
				value: city,
				label: city,
			}))
		}));
	};

	// 处理价格筛选
	const handlePriceFilter = async (values) => {
		const filters = {};
		
		// 处理出发地
		if (values.departure?.length) {
			filters.departure_province = values.departure[0];
			if (values.departure.length > 1) {
				filters.departure_city = values.departure[1];
			}
		}
		
		// 处理到达地
		if (values.destination?.length) {
			filters.destination_province = values.destination[0];
			if (values.destination.length > 1) {
				filters.destination_city = values.destination[1];
			}
		}
		
		// 处理价格范围
		if (values.price_min !== undefined) {
			filters.price_min = values.price_min;
		}
		if (values.price_max !== undefined) {
			filters.price_max = values.price_max;
		}
		
		// 先更新筛选条件状态
		await setPriceFilters(filters);
		
		// 重置到第一页
		await setPricePagination(prev => ({ ...prev, current: 1 }));
		
		// 使用最新的筛选条件获取数据
		if (currentProject) {
			await fetchPriceList(currentProject, { 
				current: 1, 
				pageSize: pricePagination.pageSize,
				...filters  // 直接使用当前的筛选条件，而不是依赖状态
			});
		}
	};

	// 重置价格筛选
	const handleResetPriceFilter = async () => {
		// 重置表单
		priceFilterForm.resetFields();
		
		// 清空筛选条件
		await setPriceFilters({});
		
		// 重置到第一页
		await setPricePagination(prev => ({ ...prev, current: 1 }));
		
		// 重新获取数据
		if (currentProject) {
			await fetchPriceList(currentProject, { 
				current: 1, 
				pageSize: pricePagination.pageSize 
			});
		}
	};

	// 获取价格列表
	const fetchPriceList = async (project, params = {}) => {
		setPriceLoading(true);
		try {
			const response = await axios.post(`${backendUrl}/api/project/price_config/list`, {
				project_name: project.project_name,
				page: params.current || 1,
				per_page: params.pageSize || 10,
				departure_province: params.departure_province,
				departure_city: params.departure_city,
				destination_province: params.destination_province,
				destination_city: params.destination_city,
				price_min: params.price_min,
				price_max: params.price_max
			});
			
			if (response.data.success) {
				const result = response.data.result;
				setPriceList(result.items);
				setPricePagination({
					...params,
					total: result.total,
				});
			} else {
				message.error('获取价格配置失败');
			}
		} catch (error) {
			console.error(error);
			message.error('获取价格配置失败');
		} finally {
			setPriceLoading(false);
		}
	};

	// 获取利润列表
	const fetchProfitList = async (project, params = {}) => {
		setProfitLoading(true);
		try {
			const response = await axios.post(`${backendUrl}/api/project/profit/list`, {
				project_name: project.project_name,
				page: params.current || 1,
				per_page: params.pageSize || 10,
			});
			
			if (response.data.success) {
				const result = response.data.result;
				setProfitList(result.items);
				setProfitPagination({
					...params,
					total: result.total,
				});
			} else {
				message.error('获取利润数据失败');
			}
		} catch (error) {
			console.error(error);
			message.error('获取利润数据失败');
		} finally {
			setProfitLoading(false);
		}
	};

	// 处理价格表分页变化
	const handlePricePageChange = (page, pageSize) => {
		setPricePagination({
			...pricePagination,
			current: page,
			pageSize: pageSize,
		});
		fetchPriceList(currentProject, {
			current: page,
			pageSize: pageSize,
		});
	};

	// 处理利润表分页变化
	const handleProfitPageChange = (page, pageSize) => {
		setProfitPagination({
			...profitPagination,
			current: page,
			pageSize: pageSize,
		});
		fetchProfitList(currentProject, {
			current: page,
			pageSize: pageSize,
		});
	};

	// 查看项目详情
	const handleViewPrice = async (project) => {
		setCurrentProject(project);
		setIsPriceModalOpen(true);
		await Promise.all([
			fetchPriceList(project, { current: 1, pageSize: 10 }),
			fetchProfitList(project, { current: 1, pageSize: 10 })
		]);
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
										onClick={() => handleViewPrice(project)}
										key="view"
									>
										查看详情
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

					<Form.Item 
						label="客户名称" 
						name="customer_name"
						rules={[{ required: true, message: '请输入客户名称' }]}
					>
						<Input placeholder="请输入客户名称" />
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
									title: '出发省',
									dataIndex: 'departure_province',
									key: 'departure_province',
								},
								{
									title: '出发市',
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
						<Form.Item label="价格配置">
							<Space>
								<Upload
									accept=".xlsx,.xls"
									beforeUpload={handleExcelImport}
									showUploadList={false}
								>
									<Button icon={<UploadOutlined />}>Excel 导入</Button>
								</Upload>
								<Button
									icon={<DownloadOutlined />}
									onClick={handleDownloadTemplate}
								>
									下载导入模板
								</Button>
							</Space>
						</Form.Item>
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

			<Modal
				title={`项目详情 - ${currentProject?.project_name}`}
				open={isPriceModalOpen}
				onCancel={() => setIsPriceModalOpen(false)}
				width={1000}
				footer={null}
			>
				<Tabs defaultActiveKey="1">
					<Tabs.TabPane tab="报价表" key="1">
						<Form
							form={priceFilterForm}
							layout="horizontal"
							onFinish={handlePriceFilter}
							style={{ marginBottom: '16px' }}
						>
							<Row gutter={[16, 16]} align="middle" justify="space-between">
								<Col span={5}>
									<Form.Item name="departure" label="出发地" style={{ marginBottom: 0 }}>
										<Cascader
											options={getCascaderOptions()}
											placeholder="请选择出发地"
											showSearch
											changeOnSelect
											style={{ width: '100%' }}
										/>
									</Form.Item>
								</Col>
								<Col span={5}>
									<Form.Item name="destination" label="到达地" style={{ marginBottom: 0 }}>
										<Cascader
											options={getCascaderOptions()}
											placeholder="请选择到达地"
											showSearch
											changeOnSelect
											style={{ width: '100%' }}
										/>
									</Form.Item>
								</Col>
								<Col span={8}>
									<Form.Item label="价格范围" style={{ marginBottom: 0 }}>
										<Input.Group compact>
											<Form.Item name="price_min" noStyle>
												<InputNumber
													placeholder="最小值"
													style={{ width: 90 }}
													min={0}
												/>
											</Form.Item>
											<span style={{ padding: '0 8px' }}>-</span>
											<Form.Item name="price_max" noStyle>
												<InputNumber
													placeholder="最大值"
													style={{ width: 90 }}
													min={0}
												/>
											</Form.Item>
										</Input.Group>
									</Form.Item>
								</Col>
								<Col span={6} style={{ textAlign: 'right', paddingRight: '8px' }}>
									<Form.Item style={{ marginBottom: 0 }}>
										<Space>
											<Button type="primary" htmlType="submit">
												筛选
											</Button>
											<Button onClick={handleResetPriceFilter}>
												重置
											</Button>
										</Space>
									</Form.Item>
								</Col>
							</Row>
						</Form>
						<Table
							dataSource={priceList}
							columns={[
								{
									title: '出发省',
									dataIndex: 'departure_province',
									key: 'departure_province',
								},
								{
									title: '出发市',
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
									dataIndex: 'carrier_type',
									key: 'carrier_type',
									render: (type) => type === 1 ? '整车运输' : '零担运输',
								},
								{
									title: '价格（元/吨）',
									dataIndex: 'unit_price',
									key: 'unit_price',
								},
							]}
							loading={priceLoading}
							pagination={{
								...pricePagination,
								onChange: handlePricePageChange,
								showSizeChanger: true,
								showQuickJumper: true,
								showTotal: (total) => `共 ${total} 条记录`,
							}}
							rowKey="id"
						/>
					</Tabs.TabPane>
					<Tabs.TabPane tab="利润表" key="2">
						<Table
							dataSource={profitList}
							columns={[
								{
									title: '省份',
									dataIndex: 'province',
									key: 'province',
								},
								{
									title: '城市',
									dataIndex: 'city',
									key: 'city',
								},
								{
									title: '承运人',
									dataIndex: 'carrier',
									key: 'carrier',
								},
								{
									title: '收入',
									dataIndex: 'income',
									key: 'income',
									render: (text) => `¥${text.toFixed(2)}`
								},
								{
									title: '支出',
									dataIndex: 'expense',
									key: 'expense',
									render: (text) => `¥${text.toFixed(2)}`
								},
								{
									title: '利润',
									dataIndex: 'profit',
									key: 'profit',
									render: (text) => `¥${text.toFixed(2)}`
								}
							]}
							loading={profitLoading}
							pagination={{
								...profitPagination,
								onChange: handleProfitPageChange,
								showSizeChanger: true,
								showQuickJumper: true,
								showTotal: (total) => `共 ${total} 条记录`,
							}}
							rowKey="id"
						/>
					</Tabs.TabPane>
				</Tabs>
			</Modal>
		</div>
	);
};