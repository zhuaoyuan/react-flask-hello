import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Space, message, Modal, DatePicker, Card, Typography, Row, Col, Pagination, Table, Upload, Tabs, InputNumber, Select, Checkbox } from 'antd';
import { Link } from 'react-router-dom';
import { Context } from "../store/appContext";
import { responseHandler } from '../component/responseHandler';
import { SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined, PlusOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import axios from '../utils/axios';  // 使用自定义的 axios 实例

const { TextArea } = Input;
const { Meta } = Card;

const TRANSPORT_TYPES = ['整车运输', '零担运输'];

// 校验价格配置数据
const validatePriceData = (data) => {
	const errors = [];
	const uniqueKeys = new Set();

	data.forEach((item, index) => {
		// 校验必填字段
		if (!item.departure_province || !item.departure_city || !item.destination_province || !item.destination_city) {
			errors.push(`第 ${index + 1} 行：出发地和到达地的省市信息不能为空`);
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
	const [confirmPriceDelete, setConfirmPriceDelete] = useState({ open: false, id: null });
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
	const [profitFilterForm] = Form.useForm();
	const [profitFilters, setProfitFilters] = useState({});
	const [groupByFields, setGroupByFields] = useState(['province', 'city', 'carrier']);
	const [carrierOptions, setCarrierOptions] = useState([]);

	// 处理价格配置删除
	const handlePriceDelete = (id) => {
		setConfirmPriceDelete({ open: true, id });
	};

	const handlePriceDeleteConfirm = async () => {
		try {
			const response = await axios.post('/api/project/price_config/delete', { 
				id: confirmPriceDelete.id 
			});
			
			if (response.data.success) {
				message.success('删除成功');
				// 重新获取价格列表
				fetchPriceList(currentProject, {
					current: 1,
					pageSize: pricePagination.pageSize
				});
			} else {
				message.error(response.data.error_message || '删除失败');
			}
		} catch (error) {
			console.error('删除价格配置失败:', error);
			message.error('删除失败');
		} finally {
			setConfirmPriceDelete({ open: false, id: null });
		}
	};

	const fetchData = async (params = {}) => {
		setLoading(true);
		try {
			const response = await axios.post('/api/project/list', {
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
		const abortController = new AbortController();
		let isSubscribed = true;

		const fetchDataSafely = async () => {
			setLoading(true);
			try {
				const response = await axios.post('/api/project/list', {
					search_query: searchQuery,
					page: pagination.current || 1,
					per_page: pagination.pageSize || 9,
				}, {
					signal: abortController.signal
				});
				if (isSubscribed) {
					setData(response.data.data);
					setPagination(prev => ({
						...prev,
						total: response.data.total,
					}));
				}
			} catch (error) {
				if (error.name === 'AbortError') {
					return;
				}
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
			abortController.abort();
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
		axios.post('/api/project/delete', { id: confirmDelete.id })
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
			const response = await axios.post('/api/project/edit', {
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
			const response = await axios.post('/api/project/create', {
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
			{wch: 15}  // 价格
		];
		ws['!cols'] = wscols;
		
		// 将工作表添加到工作簿
		XLSX.utils.book_append_sheet(wb, ws, '价格配置模板');
		
		// 下载文件
		XLSX.writeFile(wb, '价格配置导入模板.xlsx');
	};

	// 处理价格筛选
	const handlePriceFilter = async (values) => {
		const abortController = new AbortController();
		let isSubscribed = true;
		
		const filters = {
			departure_province: values.departure_province || undefined,
			departure_city: values.departure_city || undefined,
			destination_province: values.destination_province || undefined,
			destination_city: values.destination_city || undefined,
			price_min: values.price_min,
			price_max: values.price_max
		};
		
		try {
			// 先更新筛选条件状态
			if (isSubscribed) {
				await setPriceFilters(filters);
				
				// 重置到第一页
				await setPricePagination(prev => ({ ...prev, current: 1 }));
				
				// 使用最新的筛选条件获取数据
				if (currentProject) {
					await fetchPriceList(currentProject, { 
						current: 1, 
						pageSize: pricePagination.pageSize,
						...filters
					}, abortController.signal);
				}
			}
		} catch (error) {
			if (error.name !== 'AbortError' && isSubscribed) {
				console.error('筛选失败:', error);
				message.error('筛选失败');
			}
		}

		return () => {
			isSubscribed = false;
			abortController.abort();
		};
	};

	// 重置价格筛选
	const handleResetPriceFilter = async () => {
		const abortController = new AbortController();
		let isSubscribed = true;

		try {
			// 重置表单
			priceFilterForm.resetFields();
			
			if (isSubscribed) {
				// 清空筛选条件
				await setPriceFilters({});
				
				// 重置到第一页
				await setPricePagination(prev => ({ ...prev, current: 1 }));
				
				// 重新获取数据
				if (currentProject) {
					await fetchPriceList(currentProject, { 
						current: 1, 
						pageSize: pricePagination.pageSize 
					}, abortController.signal);
				}
			}
		} catch (error) {
			if (error.name !== 'AbortError' && isSubscribed) {
				console.error('重置筛选失败:', error);
				message.error('重置筛选失败');
			}
		}

		return () => {
			isSubscribed = false;
			abortController.abort();
		};
	};

	// 获取价格列表
	const fetchPriceList = async (project, params = {}, abortSignal) => {
		setPriceLoading(true);
		try {
			const response = await axios.post('/api/project/price_config/list', {
				project_name: project.project_name,
				page: params.current || 1,
				per_page: params.pageSize || 10,
				departure_province: params.departure_province,
				departure_city: params.departure_city,
				destination_province: params.destination_province,
				destination_city: params.destination_city,
				price_min: params.price_min,
				price_max: params.price_max
			}, {
				signal: abortSignal
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
			if (error.name === 'AbortError') {
				return;
			}
			console.error(error);
			message.error('获取价格配置失败');
		} finally {
			setPriceLoading(false);
		}
	};

	// 获取利润列表
	const fetchProfitList = async (project, params = {}, abortSignal) => {
		setProfitLoading(true);
		try {
			const response = await axios.post('/api/project/profit/list', {
				project_name: project.project_name,
				page: params.current || 1,
				per_page: params.pageSize || 10,
				destination_province: params.destination_province,
				destination_city: params.destination_city,
				carriers: params.carriers,
				group_by: params.group_by || groupByFields
			}, {
				signal: abortSignal
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
			if (error.name === 'AbortError') {
				return;
			}
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

	// 获取承运人列表
	const fetchCarrierList = async (abortSignal) => {
		if (!currentProject?.project_name) {
			console.warn('没有选择项目，无法获取承运人列表');
			setCarrierOptions([]);
			return;
		}

		try {
			console.log('开始获取承运人列表:', currentProject.project_name);
			
			const response = await axios.post('/api/project/carrier/list', {
				project_name: currentProject.project_name
			}, {
				signal: abortSignal
			});

			console.log('承运人列表响应:', response.data);

			if (response.data.success && Array.isArray(response.data.result)) {
				// 过滤掉空值并去重
				const carriers = [...new Set(response.data.result.filter(carrier => 
					carrier != null && carrier.trim() !== ''
				))];
				
				console.log('处理后的承运人列表:', carriers);
				
				if (carriers.length > 0) {
					setCarrierOptions(carriers.map(carrier => ({
						label: carrier,
						value: carrier
					})));
				} else {
					console.warn('未找到任何承运人');
					setCarrierOptions([]);
				}
				
				// 更新表单中的承运人选项，移除不存在的选项
				const currentCarriers = profitFilterForm.getFieldValue('carriers');
				if (currentCarriers?.length > 0) {
					profitFilterForm.setFieldsValue({
						carriers: currentCarriers.filter(carrier => carriers.includes(carrier))
					});
				}
			} else {
				console.warn('无效的承运人列表响应:', response.data);
				setCarrierOptions([]);
			}
		} catch (error) {
			if (error.name !== 'AbortError') {
				console.error('获取承运人列表失败:', error);
				message.error('获取承运人列表失败');
				setCarrierOptions([]);
			}
		}
	};

	// 处理利润表筛选
	const handleProfitFilter = async (values) => {
		const abortController = new AbortController();
		let isSubscribed = true;
		
		const filters = {
			destination_province: values.destination_province || undefined,
			destination_city: values.destination_city || undefined,
			carriers: values.carriers?.length ? values.carriers : undefined
		};
		
		try {
			// 更新筛选条件状态
			if (isSubscribed) {
				await setProfitFilters(filters);
				
				// 重置到第一页
				await setProfitPagination(prev => ({ ...prev, current: 1 }));
				
				// 使用最新的筛选条件获取数据
				if (currentProject) {
					await fetchProfitList(currentProject, { 
						current: 1, 
						pageSize: profitPagination.pageSize,
						...filters
					}, abortController.signal);
				}
			}
		} catch (error) {
			if (error.name !== 'AbortError' && isSubscribed) {
				console.error('筛选失败:', error);
				message.error('筛选失败');
			}
		}

		return () => {
			isSubscribed = false;
			abortController.abort();
		};
	};

	// 重置利润表筛选
	const handleResetProfitFilter = async () => {
		const abortController = new AbortController();
		let isSubscribed = true;

		try {
			profitFilterForm.resetFields();
			
			if (isSubscribed) {
				await setProfitFilters({});
				await setProfitPagination(prev => ({ ...prev, current: 1 }));
				
				if (currentProject) {
					await fetchProfitList(currentProject, { 
						current: 1, 
						pageSize: profitPagination.pageSize 
					}, abortController.signal);
				}
			}
		} catch (error) {
			if (error.name !== 'AbortError' && isSubscribed) {
				console.error('重置筛选失败:', error);
				message.error('重置筛选失败');
			}
		}

		return () => {
			isSubscribed = false;
			abortController.abort();
		};
	};

	// 处理汇总字段变化
	const handleGroupByChange = (checkedValues) => {
		setGroupByFields(checkedValues);
	};

	// 监听 groupByFields 变化
	useEffect(() => {
		const abortController = new AbortController();
		let isSubscribed = true;

		const updateProfitList = async () => {
			if (currentProject) {
				try {
					await fetchProfitList(currentProject, {
						current: 1,
						pageSize: profitPagination.pageSize,
						...profitFilters,
						group_by: groupByFields
					}, abortController.signal);
				} catch (error) {
					if (error.name !== 'AbortError' && isSubscribed) {
						console.error('更新汇总数据失败:', error);
						message.error('更新汇总数据失败');
					}
				}
			}
		};

		updateProfitList();

		return () => {
			isSubscribed = false;
			abortController.abort();
		};
	}, [groupByFields, currentProject]);

	// 查看项目详情
	const handleViewPrice = async (project) => {
		const abortController = new AbortController();
		let isSubscribed = true;
		
		try {
			setCurrentProject(project);
			setIsPriceModalOpen(true);
			
			// 先获取承运人列表
			await fetchCarrierList(abortController.signal);
			
			// 然后获取价格列表和利润列表
			await Promise.all([
				fetchPriceList(project, { current: 1, pageSize: 10 }, abortController.signal),
				fetchProfitList(project, { current: 1, pageSize: 10 }, abortController.signal)
			]);
		} catch (error) {
			if (error.name !== 'AbortError' && isSubscribed) {
				console.error('加载数据失败:', error);
				message.error('加载数据失败');
			}
		}

		return () => {
			isSubscribed = false;
			abortController.abort();
		};
	};

	// 处理价格表导入
	const handlePriceImport = (file) => {
		const reader = new FileReader();
		const abortController = new AbortController();
		let isSubscribed = true;

		reader.onload = async (e) => {
			try {
				const data = e.target.result;
				const workbook = XLSX.read(data, { type: 'binary' });
				const sheetName = workbook.SheetNames[0];
				const worksheet = workbook.Sheets[sheetName];
				const jsonData = XLSX.utils.sheet_to_json(worksheet);

				// 转换数据格式
				const priceData = jsonData.map(row => ({
					project_id: currentProject.id,
					project_name: currentProject.project_name,
					departure_province: row['出发省'],
					departure_city: row['出发市'],
					destination_province: row['到达省'],
					destination_city: row['到达市'],
					unit_price: Number(row['价格（元/吨）'])
				}));

				// 校验数据
				const errors = validatePriceData(priceData.map(item => ({
					departure_province: item.departure_province,
					departure_city: item.departure_city,
					destination_province: item.destination_province,
					destination_city: item.destination_city,
					price: item.unit_price
				})));

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

				// 提交数据到后端
				const response = await axios.post('/api/project/price_config/upload', {
					upload_list: priceData
				}, {
					signal: abortController.signal
				});

				if (response.data.success && isSubscribed) {
					message.success(response.data.result.message);
					// 重新获取价格列表
					fetchPriceList(currentProject, {
						current: 1,
						pageSize: pricePagination.pageSize
					}, abortController.signal);
				} else if (isSubscribed) {
					Modal.error({
						title: '导入失败',
						content: response.data.error_message
					});
				}
			} catch (error) {
				if (error.name !== 'AbortError' && isSubscribed) {
					console.error('Excel 解析错误:', error);
					message.error('Excel 文件解析失败');
				}
			}
		};
		reader.readAsBinaryString(file);

		return () => {
			isSubscribed = false;
			abortController.abort();
		};
	};

	return (
		<div>
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
					{loading ? (
						<div style={{ width: '100%', textAlign: 'center', padding: '20px' }}>
							加载中...
						</div>
					) : data && data.length > 0 ? (
						data.map(project => (
							<Col span={8} key={project.id}>
								<Card
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
						))
					) : (
						<div style={{ width: '100%', textAlign: 'center', padding: '20px' }}>
							暂无数据
						</div>
					)}
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
				<Tabs defaultActiveKey="1" onChange={(activeKey) => {
					if (activeKey === "2") {
						// 当切换到利润表标签时，重新获取承运人列表
						const abortController = new AbortController();
						fetchCarrierList(abortController.signal);
					}
				}}>
					<Tabs.TabPane tab="报价表" key="1">
						<Form
							form={priceFilterForm}
							layout="horizontal"
							onFinish={handlePriceFilter}
							style={{ marginBottom: '16px' }}
						>
							<Row gutter={[16, 16]} align="middle" justify="space-between">
								<Col span={5}>
									<Form.Item name="departure_province" label="出发省" style={{ marginBottom: 0 }}>
										<Input placeholder="请输入出发省" />
									</Form.Item>
									<Form.Item name="departure_city" label="出发市" style={{ marginBottom: 0 }}>
										<Input placeholder="请输入出发市" />
									</Form.Item>
								</Col>
								<Col span={5}>
									<Form.Item name="destination_province" label="到达省" style={{ marginBottom: 0 }}>
										<Input placeholder="请输入到达省" />
									</Form.Item>
									<Form.Item name="destination_city" label="到达市" style={{ marginBottom: 0 }}>
										<Input placeholder="请输入到达市" />
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
									title: '价格（元/吨）',
									dataIndex: 'unit_price',
									key: 'unit_price',
								},
								{
									title: '操作',
									key: 'action',
									render: (_, record) => (
										<Button 
											type="link" 
											danger
											onClick={() => handlePriceDelete(record.id)}
										>
											删除
										</Button>
									),
								}
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
						<div style={{ marginTop: '16px' }}>
							<Space>
								<Upload
									accept=".xlsx,.xls"
									beforeUpload={handlePriceImport}
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
						</div>
					</Tabs.TabPane>
					<Tabs.TabPane tab="利润表" key="2">
						<div style={{ marginBottom: '16px' }}>
							<Form.Item label="汇总条件" style={{ marginBottom: '8px' }}>
								<Checkbox.Group
									options={[
										{ label: '到达省', value: 'province' },
										{ label: '到达市', value: 'city' },
										{ label: '承运人', value: 'carrier' }
									]}
									value={groupByFields}
									onChange={handleGroupByChange}
								/>
							</Form.Item>
							<Form
								form={profitFilterForm}
								layout="horizontal"
								onFinish={handleProfitFilter}
							>
								<Row gutter={[16, 16]} align="middle" justify="space-between">
									<Col span={8}>
										<Form.Item name="destination_province" label="到达省" style={{ marginBottom: 0 }}>
											<Input placeholder="请输入到达省" />
										</Form.Item>
										<Form.Item name="destination_city" label="到达市" style={{ marginBottom: 0 }}>
											<Input placeholder="请输入到达市" />
										</Form.Item>
									</Col>
									<Col span={8}>
										<Form.Item name="carriers" label="承运人" style={{ marginBottom: 0 }}>
											<Select
												mode="multiple"
												placeholder="请选择承运人"
												maxTagCount={2}
												allowClear
												style={{ width: '100%' }}
												options={carrierOptions}
											/>
										</Form.Item>
									</Col>
									<Col span={8} style={{ textAlign: 'right', paddingRight: '8px' }}>
										<Form.Item style={{ marginBottom: 0 }}>
											<Space>
												<Button type="primary" htmlType="submit">
													筛选
												</Button>
												<Button onClick={handleResetProfitFilter}>
													重置
												</Button>
												<Button 
													icon={<DownloadOutlined />}
													onClick={async () => {
														try {
															const response = await axios.post('/api/project/profit/export', {
																project_name: currentProject.project_name,
																destination_province: profitFilterForm.getFieldValue('destination_province'),
																destination_city: profitFilterForm.getFieldValue('destination_city'),
																carriers: profitFilterForm.getFieldValue('carriers'),
																group_by: groupByFields
															});

															if (response.data.success) {
																const profitData = response.data.result.items;
																const wb = XLSX.utils.book_new();
																const exportData = profitData.map(item => ({
																	'到达省': item.province,
																	'到达市': item.city,
																	'承运人': item.carrier,
																	'重量（吨）': item.weight,
																	'收入（元）': item.income,
																	'支出（元）': item.expense,
																	'利润（元）': item.profit
																}));
																const ws = XLSX.utils.json_to_sheet(exportData);
																

																
																// 将工作表添加到工作簿
																XLSX.utils.book_append_sheet(wb, ws, '利润表');
																
																// 下载文件
																XLSX.writeFile(wb, `${currentProject.project_name}_利润表.xlsx`);
																message.success('导出成功');
															} else {
																message.error(response.data.error_message || '导出失败');
															}
														} catch (error) {
															console.error('导出失败:', error);
															message.error('导出失败');
														}
													}}
												>
													导出
												</Button>
											</Space>
										</Form.Item>
									</Col>
								</Row>
							</Form>
						</div>
						<Table
							dataSource={profitList}
							columns={[
								{
									title: '到达省',
									dataIndex: 'province',
									key: 'province',
								},
								{
									title: '到达市',
									dataIndex: 'city',
									key: 'city',
								},
								{
									title: '承运人',
									dataIndex: 'carrier',
									key: 'carrier',
								},
								{
									title: '重量（吨）',
									dataIndex: 'weight',
									key: 'weight',
									render: (text) => text.toFixed(2)
								},
								{
									title: '收入',
									dataIndex: 'income',
									key: 'income',
									render: (text, record) => `¥${text.toFixed(2)} (¥${(text / record.weight).toFixed(2)}/吨)`
								},
								{
									title: '支出',
									dataIndex: 'expense',
									key: 'expense',
									render: (text, record) => `¥${text.toFixed(2)} (¥${(text / record.weight).toFixed(2)}/吨)`
								},
								{
									title: '利润',
									dataIndex: 'profit',
									key: 'profit',
									render: (text, record) => `¥${text.toFixed(2)} (¥${(text / record.weight).toFixed(2)}/吨)`
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

			<Modal
				title="确认删除"
				open={confirmPriceDelete.open}
				onOk={handlePriceDeleteConfirm}
				onCancel={() => setConfirmPriceDelete({ open: false, id: null })}
				okText="确认"
				cancelText="取消"
				okButtonProps={{ danger: true }}
			>
				<p>确定要删除这条价格配置吗？此操作不可恢复。</p>
			</Modal>
		</div>
	);
};