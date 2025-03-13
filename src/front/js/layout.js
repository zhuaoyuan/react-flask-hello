import React from "react";
import { BrowserRouter, Route, Routes, Link, useLocation } from "react-router-dom";
import ScrollToTop from "./component/scrollToTop";
import { BackendURL } from "./component/backendURL";
import { Layout, Menu, Typography } from 'antd';
import {
  ProjectOutlined,
  ShoppingCartOutlined,
  TruckOutlined,
} from '@ant-design/icons';

import { Home } from "./pages/home";
import { Demo } from "./pages/demo";
import { Project } from "./pages/project";
import { Price } from "./pages/price";
import { Single } from "./pages/single";
import injectContext from "./store/appContext";

import { Footer } from "./component/footer";

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const MainLayout = () => {
    const location = useLocation();

    if(!process.env.BACKEND_URL || process.env.BACKEND_URL == "") return <BackendURL />;

    const getPageTitle = () => {
        switch(location.pathname) {
            case '/project':
                return '项目管理';
            case '/order':
                return '订单管理';
            case '/delivery':
                return '送货管理';
            default:
                return '首页';
        }
    };

    const menuItems = [
        {
            key: '/project',
            icon: <ProjectOutlined />,
            label: <Link to="/project">项目管理</Link>,
        },
        {
            key: '/order',
            icon: <ShoppingCartOutlined />,
            label: <Link to="/order">订单管理</Link>,
        },
        {
            key: '/delivery',
            icon: <TruckOutlined />,
            label: <Link to="/delivery">送货管理</Link>,
        },
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider width={200} theme="light">
                <div style={{ 
                    height: 32, 
                    margin: 16, 
                    display: 'flex',
                    color: '#000',
                    fontSize: '20px',
                    fontWeight: 'bold'
                }}>
                    物流项目管理
                </div>
                <Menu
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    style={{ height: '100%', borderRight: 0 }}
                    items={menuItems}
                />
            </Sider>
            <Layout>
                <Header style={{ 
                    padding: '0 24px', 
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom: '1px solid #f0f0f0'
                }}>
                    <Title level={4} style={{ margin: 0 }}>{getPageTitle()}</Title>
                </Header>
                <Content style={{ background: '#fff' }}>
                    <Routes>
                        <Route element={<Home />} path="/" />
                        <Route element={<Demo />} path="/demo" />
                        <Route element={<Project />} path="/project" />
                        <Route element={<Price />} path="/price" />
                        <Route element={<Single />} path="/single/:theid" />
                        <Route element={<h1>Not found!</h1>} />
                    </Routes>
                </Content>
                <Footer />
            </Layout>
        </Layout>
    );
};

const App = () => {
    const basename = process.env.BASENAME || "";
    
    return (
        <BrowserRouter basename={basename}>
            <ScrollToTop>
                <MainLayout />
            </ScrollToTop>
        </BrowserRouter>
    );
};

export default injectContext(App);