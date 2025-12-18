import sys
import os
from pathlib import Path
import re

# 设置编码，确保中文输出正常
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# ===============================================
# 配置
# ===============================================
NOTION_IMAGES_FOLDER = "notion_images"  # notion_images 文件夹路径
VERBOSE = True  # 是否显示详细输出

# 支持的图片扩展名
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'}

# ===============================================

def is_image_file(filename):
    """检查文件是否是图片文件"""
    ext = os.path.splitext(filename)[1].lower()
    return ext in IMAGE_EXTENSIONS


def get_image_files(folder_path):
    """获取文件夹中的所有图片文件，按文件名排序"""
    if not os.path.exists(folder_path):
        return []
    
    image_files = []
    for entry in os.scandir(folder_path):
        if entry.is_file() and is_image_file(entry.name):
            image_files.append(entry.name)
    
    # 按文件名排序
    image_files.sort()
    return image_files


def is_already_renamed(filename):
    """检查文件是否已经是 image_XXX 格式"""
    pattern = r'^image_\d{3}\.(jpg|jpeg|png|gif|webp|bmp|svg)$'
    return bool(re.match(pattern, filename, re.IGNORECASE))


def rename_images_in_folder(folder_path, folder_name):
    """重命名文件夹中的所有图片文件"""
    image_files = get_image_files(folder_path)
    
    if not image_files:
        if VERBOSE:
            print(f"    ℹ️  文件夹《{folder_name}》：没有图片文件")
        return 0, 0
    
    # 过滤掉已经是 image_XXX 格式的文件
    files_to_rename = [f for f in image_files if not is_already_renamed(f)]
    
    if not files_to_rename:
        if VERBOSE:
            print(f"    ✅ 文件夹《{folder_name}》：所有文件已重命名，跳过")
        return 0, len(image_files)
    
    if VERBOSE:
        print(f"    📝 文件夹《{folder_name}》：找到 {len(image_files)} 个图片文件，需要重命名 {len(files_to_rename)} 个")
    
    # 获取已存在的 image_XXX 文件的最大编号
    existing_numbers = set()
    for filename in image_files:
        if is_already_renamed(filename):
            match = re.match(r'^image_(\d{3})\.', filename, re.IGNORECASE)
            if match:
                existing_numbers.add(int(match.group(1)))
    
    # 确定起始编号
    start_number = 1
    if existing_numbers:
        start_number = max(existing_numbers) + 1
    
    renamed_count = 0
    failed_count = 0
    
    for index, old_filename in enumerate(files_to_rename, start=start_number):
        old_path = os.path.join(folder_path, old_filename)
        
        # 获取文件扩展名
        _, ext = os.path.splitext(old_filename)
        ext = ext.lower()
        if ext not in IMAGE_EXTENSIONS:
            ext = '.png'  # 默认扩展名
        
        # 生成新文件名
        new_filename = f"image_{index:03d}{ext}"
        new_path = os.path.join(folder_path, new_filename)
        
        # 检查新文件名是否已存在（理论上不应该，但以防万一）
        if os.path.exists(new_path) and new_path != old_path:
            if VERBOSE:
                print(f"        ⚠️  跳过：{old_filename} -> {new_filename}（目标文件已存在）")
            failed_count += 1
            continue
        
        try:
            os.rename(old_path, new_path)
            renamed_count += 1
            if VERBOSE:
                print(f"        ✅ {old_filename} -> {new_filename}")
        except Exception as e:
            failed_count += 1
            if VERBOSE:
                print(f"        ❌ 重命名失败：{old_filename} -> {new_filename} ({e})")
    
    if VERBOSE:
        print(f"    ✅ 文件夹《{folder_name}》：重命名完成，成功 {renamed_count} 个，失败 {failed_count} 个")
    
    return renamed_count, len(image_files) - len(files_to_rename)


def main():
    """主函数：批量重命名 notion_images 文件夹下的所有图片"""
    print("=" * 60)
    print("📝 Notion 图片重命名工具")
    print(f"目标文件夹: {NOTION_IMAGES_FOLDER}")
    print("=" * 60)

    # 使用脚本所在目录作为基准路径，而不是当前工作目录
    script_dir = Path(__file__).resolve().parent
    notion_images_path = script_dir / NOTION_IMAGES_FOLDER
    
    if not notion_images_path.exists():
        print(f"❌ 文件夹不存在: {notion_images_path}")
        return
    
    # 获取所有子文件夹
    subfolders = []
    try:
        for entry in os.scandir(notion_images_path):
            if entry.is_dir():
                subfolders.append(entry.name)
    except Exception as e:
        print(f"❌ 无法读取文件夹: {e}")
        return
    
    if not subfolders:
        print(f"ℹ️  {NOTION_IMAGES_FOLDER} 文件夹下没有子文件夹")
        return
    
    subfolders.sort()
    
    print(f"\n找到 {len(subfolders)} 个子文件夹")
    if VERBOSE:
        for i, folder_name in enumerate(subfolders, start=1):
            print(f"  [{i}] {folder_name}")
    
    print("\n--- 开始重命名图片 ---")
    total_renamed = 0
    total_skipped = 0
    processed_folders = 0
    
    for i, folder_name in enumerate(subfolders, start=1):
        folder_path = os.path.join(notion_images_path, folder_name)
        print(f"\n[{i}/{len(subfolders)}] 处理文件夹：《{folder_name}》...")
        
        renamed, skipped = rename_images_in_folder(folder_path, folder_name)
        total_renamed += renamed
        total_skipped += skipped
        processed_folders += 1
    
    print("\n" + "=" * 60)
    print(f"🎉 批量重命名完成！")
    print(f"处理文件夹数: {processed_folders}")
    print(f"重命名文件数: {total_renamed}")
    print(f"已跳过文件数: {total_skipped}")
    print("=" * 60)


if __name__ == "__main__":
    main()

