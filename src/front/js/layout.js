import React from "react";
import { BrowserRouter, Route, Routes, Link, useLocation } from "react-router-dom";
import ScrollToTop from "./component/scrollToTop";
import { BackendURL } from "./component/backendURL";
import { Layout, Menu } from 'antd';
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

const MainLayout = () => {
    const location = useLocation();

    if(!process.env.BACKEND_URL || process.env.BACKEND_URL == "") return <BackendURL />;

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
                <div style={{ height: 32, margin: 16, background: 'rgba(0, 0, 0, 0.2)' }} />
                <Menu
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    style={{ height: '100%', borderRight: 0 }}
                    items={menuItems}
                />
            </Sider>
            <Layout>
                <Header style={{ padding: 0, background: '#fff' }} />
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