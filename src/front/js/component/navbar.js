import React from "react";
import { Link } from "react-router-dom";

export const Navbar = () => {
	return (
		<nav className="navbar navbar-light bg-light">
			<div className="container">
				<Link to="/">
					<span className="navbar-brand mb-0 h1">物流信息管理</span>
				</Link>
				<div className="ml-auto">
					<Link to="/project">
						<button className="btn btn-primary">项目管理</button>
					</Link>
				</div>
				<div className="ml-auto">
					<Link to="/price">
						<button className="btn btn-primary">价格管理</button>
					</Link>
				</div>
				<div className="ml-auto">
					<Link to="/demo">
						<button className="btn btn-primary">订单管理</button>
					</Link>
				</div>
				<div className="ml-auto">
					<Link to="/demo">
						<button className="btn btn-primary">供应商管理</button>
					</Link>
				</div>
			</div>
		</nav>
	);
};
