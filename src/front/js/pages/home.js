import React from "react";
import { Link } from "react-router-dom";
import "../../styles/home.css";

export const Home = () => {
	return (
		<div className="home-container">
			{/* 顶部横幅 */}
			<div className="hero-section">
				<div className="hero-content">
					<h1>物流运输管理系统</h1>
					<p>高效、便捷的一站式物流运输解决方案</p>
				</div>
			</div>

			{/* 功能区块 */}
			<div className="features-section">
				<div className="feature-grid">
					<Link to="/project" className="feature-card">
						<div className="feature-icon">
							<i className="fas fa-project-diagram"></i>
						</div>
						<h3>项目管理</h3>
						<p>创建和管理物流项目，设置运输价格配置</p>
					</Link>

					<Link to="/order" className="feature-card">
						<div className="feature-icon">
							<i className="fas fa-truck"></i>
						</div>
						<h3>订单管理</h3>
						<p>处理运输订单，跟踪订单状态</p>
					</Link>

					<Link to="/price" className="feature-card">
						<div className="feature-icon">
							<i className="fas fa-calculator"></i>
						</div>
						<h3>价格配置</h3>
						<p>灵活设置不同路线的运输价格</p>
					</Link>

					<div className="feature-card">
						<div className="feature-icon">
							<i className="fas fa-chart-line"></i>
						</div>
						<h3>数据统计</h3>
						<p>查看运输数据分析和统计报表</p>
					</div>
				</div>
			</div>

			{/* 系统优势 */}
			<div className="advantages-section">
				<h2>系统优势</h2>
				<div className="advantages-grid">
					<div className="advantage-item">
						<i className="fas fa-tachometer-alt"></i>
						<h4>高效管理</h4>
						<p>简化流程，提高工作效率</p>
					</div>
					<div className="advantage-item">
						<i className="fas fa-shield-alt"></i>
						<h4>数据安全</h4>
						<p>严格的数据保护机制</p>
					</div>
					<div className="advantage-item">
						<i className="fas fa-sync"></i>
						<h4>实时同步</h4>
						<p>数据实时更新，状态及时同步</p>
					</div>
					<div className="advantage-item">
						<i className="fas fa-chart-pie"></i>
						<h4>数据分析</h4>
						<p>智能分析，辅助决策</p>
					</div>
				</div>
			</div>

		</div>
	);
};
