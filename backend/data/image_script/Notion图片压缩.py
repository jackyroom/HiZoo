import sys
import os
from pathlib import Path
from io import BytesIO
from PIL import Image

# 设置编码，确保中文输出正常
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# ===============================================
# 压缩配置
# ===============================================
TARGET_SIZE_KB = 400  # 目标文件大小（KB）
TARGET_SIZE_BYTES = TARGET_SIZE_KB * 1024  # 转换为字节
MAX_DIMENSION = 2560  # 最大尺寸（像素），超过此尺寸会先缩放
MIN_QUALITY = 40  # 最低质量（避免质量过低）
MAX_QUALITY = 95  # 最高质量（起始质量）
# 以脚本所在目录为基准，避免受当前工作目录影响
SCRIPT_DIR = Path(__file__).resolve().parent
IMAGE_FOLDER = SCRIPT_DIR / "notion_images"              # 原始图片文件夹路径
OUTPUT_FOLDER = SCRIPT_DIR / "notion_images_compressed"  # 压缩后图片输出文件夹
VERBOSE = False  # 是否显示详细输出（False时只显示进度）
# ===============================================


def format_size(size_bytes):
    """格式化文件大小显示"""
    if size_bytes < 1024:
        return f"{size_bytes}B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.2f}KB"
    else:
        return f"{size_bytes / (1024 * 1024):.2f}MB"


def compress_image_to_jpg(image_path, output_path):
    """
    将图片压缩并转换为 JPG 格式，确保文件大小小于目标大小。
    使用二分法找到最佳质量参数。
    
    参数:
        image_path: 原始图片路径
        output_path: 输出图片路径（必须指定）
    
    返回: (成功标志, 原始大小, 压缩后大小, 使用的质量)
    """
    # 确保输出目录存在
    output_dir = os.path.dirname(output_path)
    os.makedirs(output_dir, exist_ok=True)
    
    try:
        # 打开图片
        with Image.open(image_path) as img:
            # 转换为 RGB 模式（JPG 不支持透明通道）
            if img.mode in ('RGBA', 'LA', 'P'):
                # 创建白色背景
                rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                rgb_img.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                img = rgb_img
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            
            # 如果图片尺寸过大，先进行缩放
            width, height = img.size
            if width > MAX_DIMENSION or height > MAX_DIMENSION:
                ratio = min(MAX_DIMENSION / width, MAX_DIMENSION / height)
                new_size = (int(width * ratio), int(height * ratio))
                img = img.resize(new_size, Image.Resampling.LANCZOS)
                print(f"        📐 图片尺寸过大，已缩放至 {new_size[0]}x{new_size[1]}")
            
            # 获取原始文件大小（如果输出路径与原路径不同）
            original_size = os.path.getsize(image_path) if os.path.exists(image_path) else 0
            
            # 如果已经是 JPG 且小于目标大小，检查是否需要压缩
            if image_path.lower().endswith(('.jpg', '.jpeg')):
                if original_size <= TARGET_SIZE_BYTES:
                    # 文件已经符合要求，但可能需要优化
                    img.save(output_path, 'JPEG', quality=85, optimize=True, progressive=True)
                    compressed_size = os.path.getsize(output_path)
                    if compressed_size <= TARGET_SIZE_BYTES:
                        return (True, original_size, compressed_size, 85)
            
            # 使用二分法找到最佳质量
            best_quality = None
            best_size = None
            low_quality = MIN_QUALITY
            high_quality = MAX_QUALITY
            
            while low_quality <= high_quality:
                quality = (low_quality + high_quality) // 2
                
                # 将图片保存到内存缓冲区以测试文件大小
                buffer = BytesIO()
                img.save(buffer, format='JPEG', quality=quality, optimize=True, progressive=True)
                buffer_size = buffer.tell()
                
                if buffer_size <= TARGET_SIZE_BYTES:
                    # 文件大小符合要求，尝试提高质量
                    best_quality = quality
                    best_size = buffer_size
                    low_quality = quality + 1
                else:
                    # 文件大小超出，降低质量
                    high_quality = quality - 1
            
            # 如果找到了合适的质量，保存文件
            if best_quality is not None:
                img.save(output_path, 'JPEG', quality=best_quality, optimize=True, progressive=True)
                compressed_size = os.path.getsize(output_path)
                return (True, original_size, compressed_size, best_quality)
            else:
                # 即使最低质量也无法满足要求，使用最低质量保存
                img.save(output_path, 'JPEG', quality=MIN_QUALITY, optimize=True, progressive=True)
                compressed_size = os.path.getsize(output_path)
                print(f"        ⚠️ 警告：即使使用最低质量({MIN_QUALITY})，文件大小仍为 {format_size(compressed_size)}")
                return (True, original_size, compressed_size, MIN_QUALITY)
                
    except Exception as e:
        print(f"        ❌ 压缩失败: {e}")
        return (False, 0, 0, 0)


def should_skip_compression(input_path, output_path):
    """
    判断是否应该跳过压缩
    
    返回: (是否跳过, 原因)
    """
    # 如果输出文件不存在，需要压缩
    if not os.path.exists(output_path):
        return (False, None)
    
    # 如果输出文件存在，检查文件大小是否合理（大于1KB认为完整）
    output_size = os.path.getsize(output_path)
    if output_size < 1024:
        return (False, "输出文件不完整")
    
    # 比较修改时间：如果输入文件比输出文件新，需要重新压缩
    input_mtime = os.path.getmtime(input_path)
    output_mtime = os.path.getmtime(output_path)
    
    if input_mtime > output_mtime:
        return (False, "输入文件已更新")
    
    # 文件已存在且输入文件未更新，可以跳过
    return (True, "已存在且未更新")

def process_folder(input_folder, output_folder):
    """
    递归处理文件夹中的所有图片文件，保存到输出文件夹
    只处理新增或更新的图片，跳过已压缩的图片
    
    参数:
        input_folder: 输入文件夹路径
        output_folder: 输出文件夹路径
    """
    image_extensions = ('.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp')
    processed_count = 0
    success_count = 0
    skipped_count = 0
    total_original_size = 0
    total_compressed_size = 0
    
    # 确保输出文件夹存在
    os.makedirs(output_folder, exist_ok=True)
    
    for root, dirs, files in os.walk(input_folder):
        # 计算相对路径，用于在输出文件夹中创建相同的目录结构
        rel_path = os.path.relpath(root, input_folder)
        if rel_path == '.':
            output_root = output_folder
        else:
            output_root = os.path.join(output_folder, rel_path)
        
        for file in files:
            file_path = os.path.join(root, file)
            file_ext = os.path.splitext(file)[1].lower()
            
            if file_ext in image_extensions:
                processed_count += 1
                relative_path = os.path.relpath(file_path, input_folder)
                
                # 确定输出路径（统一转换为 JPG 格式）
                file_name_without_ext = os.path.splitext(file)[0]
                output_path = os.path.join(output_root, file_name_without_ext + '.jpg')
                
                # 检查是否需要跳过
                should_skip, skip_reason = should_skip_compression(file_path, output_path)
                
                if should_skip:
                    skipped_count += 1
                    if VERBOSE:
                        print(f"  [{processed_count}] 跳过: {relative_path} ({skip_reason})")
                    continue
                
                # 需要压缩
                if VERBOSE:
                    print(f"  [{processed_count}] 处理: {relative_path}")
                else:
                    print(f"  [{processed_count}] {relative_path}", end="", flush=True)
                
                success, orig_size, comp_size, quality = compress_image_to_jpg(file_path, output_path)
                
                if success:
                    success_count += 1
                    total_original_size += orig_size
                    total_compressed_size += comp_size
                    
                    size_reduction = ((orig_size - comp_size) / orig_size * 100) if orig_size > 0 else 0
                    status = "✅" if comp_size <= TARGET_SIZE_BYTES else "⚠️"
                    if VERBOSE:
                        print(f"        {status} 完成 | 原始: {format_size(orig_size)} → 压缩: {format_size(comp_size)} | 质量: {quality} | 减少: {size_reduction:.1f}%")
                    else:
                        print(f" - {format_size(orig_size)} → {format_size(comp_size)} ({size_reduction:.1f}%)")
                else:
                    if VERBOSE:
                        print(f"        ❌ 处理失败")
                    else:
                        print(f" - 失败")
    
    return processed_count, success_count, skipped_count, total_original_size, total_compressed_size


def main():
    """
    主函数：批量压缩 notion_images 文件夹下的所有图片
    压缩后的图片保存到新文件夹，不覆盖原始文件
    """
    print("=" * 60)
    print("🗜️  Notion 图片批量压缩工具")
    print("=" * 60)
    print(f"原始文件夹: {IMAGE_FOLDER}")
    print(f"输出文件夹: {OUTPUT_FOLDER}")
    print(f"目标文件大小: ≤ {TARGET_SIZE_KB}KB")
    print(f"输出格式: JPG")
    print(f"最大尺寸: {MAX_DIMENSION}px")
    print("=" * 60)
    
    if not os.path.exists(IMAGE_FOLDER):
        print(f"❌ 错误：文件夹 '{IMAGE_FOLDER}' 不存在！")
        return
    
    # 输出文件夹已存在是正常的，脚本会自动跳过已压缩的文件
    if os.path.exists(OUTPUT_FOLDER):
        print(f"\nℹ️  输出文件夹已存在，将自动跳过已压缩的图片")
    
    print("\n--- 开始处理图片 ---")
    print("💡 提示：原始文件不会被修改，压缩后的图片将保存到新文件夹")
    print("💡 提示：已压缩的图片会自动跳过，只处理新增或更新的图片")
    processed, success, skipped, total_orig, total_comp = process_folder(IMAGE_FOLDER, OUTPUT_FOLDER)
    
    print("\n" + "=" * 60)
    print("🎉 批量压缩完成！")
    print("=" * 60)
    print(f"扫描文件总数: {processed}")
    print(f"新压缩数量: {success}")
    print(f"跳过已压缩: {skipped}")
    if success > 0:
        print(f"总原始大小: {format_size(total_orig)}")
        print(f"总压缩大小: {format_size(total_comp)}")
        if total_orig > 0:
            total_reduction = ((total_orig - total_comp) / total_orig * 100)
            print(f"总体积减少: {total_reduction:.1f}%")
            print(f"节省空间: {format_size(total_orig - total_comp)}")
    print("=" * 60)


if __name__ == "__main__":
    main()

