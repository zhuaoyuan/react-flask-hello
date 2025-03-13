import React from "react";
import { Layout, Row, Col, Typography, Space } from 'antd';
import { GithubOutlined, CopyrightOutlined } from '@ant-design/icons';

const { Footer: AntFooter } = Layout;
const { Text } = Typography;

export const Footer = () => (
	<AntFooter style={{ 
		background: '#fff',
		padding: '24px 48px',
		borderTop: '1px solid #f0f0f0',
		textAlign: 'center'
	}}>
		<Row justify="center" align="middle">
			<Col>
				<Space direction="vertical" size="small">
					<Space>
						<Text type="secondary">物流项目管理系统</Text>
						<Text type="secondary">|</Text>
						<Text type="secondary">版本 1.0.0</Text>
					</Space>
					<Space>
						<CopyrightOutlined />
						<Text type="secondary">2024 物流项目管理系统</Text>
						<Text type="secondary">|</Text>
						<Text type="secondary">技术支持</Text>
					</Space>
				</Space>
			</Col>
		</Row>
	</AntFooter>
);
