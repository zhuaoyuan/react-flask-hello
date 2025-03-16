import React, { useState } from "react";
import { BrowserRouter, Route, Routes, Link, useLocation } from "react-router-dom";
import ScrollToTop from "./component/scrollToTop";
import { BackendURL } from "./component/backendURL";
import { Layout, Menu, Typography, Button } from 'antd';
import {
  ProjectOutlined,
  ShoppingCartOutlined,
  TruckOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';

import { Home } from "./pages/home";
import { Demo } from "./pages/demo";
import { Project } from "./pages/project";
import { Price } from "./pages/price";
import { Single } from "./pages/single";
import { Order } from "./pages/order";
import injectContext from "./store/appContext";

import { Footer } from "./component/footer";

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const MainLayout = () => {
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);

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
            label: <Link to="/project" style={{ textDecoration: 'none' }}>项目管理</Link>,
        },
        {
            key: '/order',
            icon: <ShoppingCartOutlined />,
            label: <Link to="/order" style={{ textDecoration: 'none' }}>订单管理</Link>,
        }
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider 
                width={200} 
                theme="light"
                collapsed={collapsed}
                trigger={null}
                style={{
                    overflow: 'hidden',
                    height: '100vh',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    bottom: 0
                }}
            >
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    position: 'relative'
                }}>
                    <div style={{ 
                        height: 32, 
                        margin: 16, 
                        display: 'flex',
                        color: '#000',
                        fontSize: collapsed ? '16px' : '20px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                    }}>
                        <Link to="/" style={{ 
                            textDecoration: 'none', 
                            color: 'inherit',
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            {collapsed ? '物流' : '物流项目管理'}
                        </Link>
                    </div>
                    <div style={{
                        flex: 1,
                        overflow: 'auto'
                    }}>
                        <Menu
                            mode="inline"
                            selectedKeys={[location.pathname]}
                            style={{ 
                                borderRight: 0
                            }}
                            items={menuItems}
                        />
                    </div>
                    <div style={{
                        padding: '12px 8px',
                        textAlign: 'center',
                        borderTop: '1px solid #f0f0f0',
                        backgroundColor: '#fff',
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0
                    }}>
                        <Button
                            type="text"
                            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                            onClick={() => setCollapsed(!collapsed)}
                            style={{
                                width: '100%',
                                color: '#595959'
                            }}
                        />
                    </div>
                </div>
            </Sider>
            <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s' }}>
                <Header style={{ 
                    padding: '0 24px', 
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom: '1px solid #f0f0f0',
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    width: `calc(100% - ${collapsed ? 80 : 200}px)`,
                    zIndex: 1000,
                    transition: 'width 0.2s'
                }}>
                    <Title level={4} style={{ margin: 0 }}>{getPageTitle()}</Title>
                </Header>
                <Content style={{ 
                    background: '#fff',
                    minHeight: 'calc(100vh - 64px - 70px)', // 减去header和footer的高度
                    padding: '24px',
                    marginTop: 64 // Header的高度
                }}>
                    <Routes>
                        <Route element={<Home />} path="/" />
                        <Route element={<Demo />} path="/demo" />
                        <Route element={<Project />} path="/project" />
                        <Route element={<Price />} path="/price" />
                        <Route element={<Order />} path="/order" />
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