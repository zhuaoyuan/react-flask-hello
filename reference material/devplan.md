# 功能性问题

# 用例和接口

创建项目
- 基本信息
- 价格表
编辑项目（增量生效）
记录项目变更流水

供应商配置
- 基本信息
- 价格表
编辑供应商

订单导入
- 可能插入新供应商或司机信息

订单编辑

订单查询

报表计算

# 数据模型

## 枚举数据
行政区划数据
- 省名称、市名称

客户规则
- 承运类型
- 吨位区间单价


## 持久化数据

项目信息

客户价格表

项目信息变更流水表


供应商价格表


供应商基本信息

订单表

报表（？）

# 可优化项



0313 
价格表-校验
订单


同类方法收口
变成软删除
增加流水记录


在后端实现/api/order/import_delivery 接口，逻辑为：校验所有订单号存在、其他字段非空、承运类型正确；遍历导入的订单号，


子订单号生成逻辑优化