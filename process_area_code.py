import csv
from collections import defaultdict

def process_area_codes(file_path):
    # 使用defaultdict来存储省份和对应的城市列表
    provinces_cities = defaultdict(list)
    # 存储区域ID到名称的映射
    area_names = {}
    # 存储省份ID到名称的映射
    province_ids = {}

    # 第一次遍历：存储所有区域的名称
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        for row in reader:
            area_id, name, level, parent_id, area_type = row
            level = int(level)
            
            # 存储区域ID和名称的映射
            if level in (1, 2):  # 只处理省级和市级
                area_names[area_id] = name
                if level == 1:  # 省级
                    province_ids[area_id] = name

    # 第二次遍历：构建省份-城市映射
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        for row in reader:
            area_id, name, level, parent_id, area_type = row
            level = int(level)
            
            if level == 2:  # 市级
                province_name = province_ids.get(parent_id)
                if province_name:
                    # 去掉"市辖区"等特殊名称
                    if name not in ['市辖区', '县']:
                        provinces_cities[province_name].append(name)

    # 生成Python字典代码
    code = "provinces_and_cities = {\n"
    for province, cities in provinces_cities.items():
        # 对城市列表进行排序
        cities.sort()
        # 格式化城市列表
        cities_str = '", "'.join(cities)
        code += f'    "{province}": ["{cities_str}"],\n'
    code += "}"

    # 将代码写入文件
    with open('provinces_and_cities.py', 'w', encoding='utf-8') as f:
        f.write(code)

    print("处理完成！结果已写入 provinces_and_cities.py 文件")

if __name__ == "__main__":
    process_area_codes('area_code_2024.csv') 