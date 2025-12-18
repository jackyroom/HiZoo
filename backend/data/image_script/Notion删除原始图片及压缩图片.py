import sys
import os
from pathlib import Path

# 设置编码，确保中文输出正常
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# ===============================================
# 配置
# ===============================================
NOTION_IMAGES_FOLDER = "notion_images"  # 原始图片文件夹
NOTION_IMAGES_COMPRESSED_FOLDER = "notion_images_compressed"  # 压缩图片文件夹
VERBOSE = True  # 是否显示详细输出

# ===============================================

def delete_all_contents(folder_path, folder_name):
    """删除文件夹下的所有子文件夹和文件（保留主文件夹本身）"""
    if not os.path.exists(folder_path):
        if VERBOSE:
            print(f"    ℹ️  文件夹《{folder_name}》：不存在，跳过")
        return 0, 0, 0, 0, 0
    
    deleted_files = 0
    failed_files = 0
    deleted_dirs = 0
    failed_dirs = 0
    total_size = 0
    
    # 第一步：删除所有文件
    if VERBOSE:
        print(f"        正在删除文件...")
    
    for root, dirs, files in os.walk(folder_path):
        for filename in files:
            file_path = os.path.join(root, filename)
            try:
                # 获取文件大小
                file_size = os.path.getsize(file_path)
                total_size += file_size
                
                # 删除文件
                os.remove(file_path)
                deleted_files += 1
                
                if VERBOSE:
                    # 计算相对路径用于显示
                    rel_path = os.path.relpath(file_path, folder_path)
                    print(f"        ✅ 已删除文件: {rel_path}")
            except Exception as e:
                failed_files += 1
                if VERBOSE:
                    rel_path = os.path.relpath(file_path, folder_path)
                    print(f"        ❌ 删除文件失败: {rel_path} ({e})")
    
    # 第二步：删除所有子文件夹（包括空文件夹，从最深层的开始）
    if VERBOSE:
        print(f"        正在删除子文件夹...")
    
    # 使用 os.walk 的 topdown=False 参数，从最深层的文件夹开始删除
    # 这样可以确保先删除子文件夹，再删除父文件夹
    # 收集所有需要删除的文件夹路径（不包括主文件夹本身）
    dirs_to_delete = []
    for root, dirs, files in os.walk(folder_path, topdown=False):
        # 只删除子文件夹，不删除主文件夹本身
        if root != folder_path:
            dirs_to_delete.append(root)
    
    # 删除收集到的子文件夹（从最深层的开始）
    for dir_path in dirs_to_delete:
        try:
            os.rmdir(dir_path)
            deleted_dirs += 1
            if VERBOSE:
                rel_path = os.path.relpath(dir_path, folder_path)
                print(f"        ✅ 已删除文件夹: {rel_path}")
        except Exception as e:
            failed_dirs += 1
            if VERBOSE:
                rel_path = os.path.relpath(dir_path, folder_path)
                print(f"        ❌ 删除文件夹失败: {rel_path} ({e})")
    
    # 第三步：删除主文件夹下的直接子文件夹（包括空文件夹）
    # 需要再次扫描，因为上面的遍历可能已经改变了目录结构
    try:
        # 持续删除直到没有更多子文件夹
        while True:
            subdirs = []
            for entry in os.scandir(folder_path):
                if entry.is_dir():
                    subdirs.append(entry.path)
            
            if not subdirs:
                break
            
            for dir_path in subdirs:
                try:
                    os.rmdir(dir_path)
                    deleted_dirs += 1
                    if VERBOSE:
                        rel_path = os.path.relpath(dir_path, folder_path)
                        print(f"        ✅ 已删除文件夹: {rel_path}")
                except Exception as e:
                    failed_dirs += 1
                    if VERBOSE:
                        rel_path = os.path.relpath(dir_path, folder_path)
                        print(f"        ❌ 删除文件夹失败: {rel_path} ({e})")
    except Exception as e:
        if VERBOSE:
            print(f"        ⚠️  扫描主文件夹失败: {e}")
    
    if VERBOSE:
        print(f"    ✅ 文件夹《{folder_name}》：清空完成")
        print(f"        删除文件: {deleted_files} 个，失败 {failed_files} 个")
        print(f"        删除文件夹: {deleted_dirs} 个，失败 {failed_dirs} 个")
        if total_size > 0:
            size_mb = total_size / (1024 * 1024)
            print(f"        释放空间: {size_mb:.2f} MB")
    
    return deleted_files, failed_files, deleted_dirs, failed_dirs, total_size


def format_size(size_bytes):
    """格式化文件大小"""
    if size_bytes < 1024:
        return f"{size_bytes}B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.2f}KB"
    else:
        return f"{size_bytes / (1024 * 1024):.2f}MB"


def count_files_in_folder(folder_path):
    """统计文件夹中的文件数量和总大小"""
    if not os.path.exists(folder_path):
        return 0, 0
    
    file_count = 0
    total_size = 0
    
    for root, dirs, files in os.walk(folder_path):
        for filename in files:
            file_path = os.path.join(root, filename)
            try:
                file_count += 1
                total_size += os.path.getsize(file_path)
            except Exception:
                pass
    
    return file_count, total_size


def main():
    """主函数：删除 notion_images 和 notion_images_compressed 文件夹中的所有文件"""
    print("=" * 60)
    print("🗑️  Notion 图片删除工具")
    print("=" * 60)
    
    # 获取文件夹路径（以脚本所在目录为基准，避免受当前工作目录影响）
    script_dir = Path(__file__).resolve().parent
    notion_images_path = script_dir / NOTION_IMAGES_FOLDER
    notion_images_compressed_path = script_dir / NOTION_IMAGES_COMPRESSED_FOLDER
    
    # 统计文件信息
    print("\n--- 扫描文件夹 ---")
    
    images_count, images_size = count_files_in_folder(notion_images_path)
    compressed_count, compressed_size = count_files_in_folder(notion_images_compressed_path)
    
    total_files = images_count + compressed_count
    total_size = images_size + compressed_size
    
    print(f"📁 {NOTION_IMAGES_FOLDER}:")
    if images_count > 0:
        print(f"   文件数: {images_count}")
        print(f"   总大小: {format_size(images_size)}")
    else:
        print(f"   ℹ️  文件夹不存在或为空")
    
    print(f"\n📁 {NOTION_IMAGES_COMPRESSED_FOLDER}:")
    if compressed_count > 0:
        print(f"   文件数: {compressed_count}")
        print(f"   总大小: {format_size(compressed_size)}")
    else:
        print(f"   ℹ️  文件夹不存在或为空")
    
    if total_files == 0:
        print("\n✅ 没有找到需要删除的文件，操作结束。")
        return
    
    print(f"\n总计: {total_files} 个文件，{format_size(total_size)}")
    
    # 确认删除
    print("\n" + "=" * 60)
    print("⚠️  警告：此操作将删除以下文件夹下的所有子文件夹和文件（主文件夹保留）：")
    print(f"   - {NOTION_IMAGES_FOLDER}/")
    print(f"   - {NOTION_IMAGES_COMPRESSED_FOLDER}/")
    print("   包括所有子文件夹（包括空文件夹）和文件")
    print("=" * 60)
    
    confirm = input("\n确认删除？(输入 'yes' 或 'y' 确认): ").strip().lower()
    
    if confirm not in ['yes', 'y']:
        print("❌ 操作已取消")
        return
    
    # 开始删除
    print("\n--- 开始删除文件夹 ---")
    
    total_deleted_files = 0
    total_failed_files = 0
    total_deleted_dirs = 0
    total_failed_dirs = 0
    total_freed_size = 0
    
    # 清空 notion_images 文件夹下的所有内容
    print(f"\n[1/2] 处理文件夹：《{NOTION_IMAGES_FOLDER}》...")
    deleted_files, failed_files, deleted_dirs, failed_dirs, freed_size = delete_all_contents(
        notion_images_path, NOTION_IMAGES_FOLDER
    )
    total_deleted_files += deleted_files
    total_failed_files += failed_files
    total_deleted_dirs += deleted_dirs
    total_failed_dirs += failed_dirs
    total_freed_size += freed_size
    
    # 清空 notion_images_compressed 文件夹下的所有内容
    print(f"\n[2/2] 处理文件夹：《{NOTION_IMAGES_COMPRESSED_FOLDER}》...")
    deleted_files, failed_files, deleted_dirs, failed_dirs, freed_size = delete_all_contents(
        notion_images_compressed_path, NOTION_IMAGES_COMPRESSED_FOLDER
    )
    total_deleted_files += deleted_files
    total_failed_files += failed_files
    total_deleted_dirs += deleted_dirs
    total_failed_dirs += failed_dirs
    total_freed_size += freed_size
    
    # 显示结果
    print("\n" + "=" * 60)
    print(f"🎉 删除操作完成！")
    print(f"成功删除文件: {total_deleted_files} 个")
    print(f"删除文件失败: {total_failed_files} 个")
    print(f"成功删除文件夹: {total_deleted_dirs} 个")
    print(f"删除文件夹失败: {total_failed_dirs} 个")
    print(f"释放空间: {format_size(total_freed_size)}")
    print("=" * 60)


if __name__ == "__main__":
    main()

