const fs = require('fs').promises
const path = require('path')
const { v4: uuidv4 } = require('uuid')

/**
 * 文件处理工具类
 */
class FileUtils {
  /**
   * 验证文件类型
   */
  static validateFileType(file, allowedTypes = []) {
    const { mimetype } = file
    
    if (allowedTypes.length === 0) {
      // 默认支持的文件类型
      allowedTypes = [
        'application/pdf',
        'text/markdown',
        'text/plain',
        'image/png',
        'image/jpeg',
        'image/jpg'
      ]
    }

    if (!allowedTypes.includes(mimetype)) {
      throw new Error(`不支持的文件类型: ${mimetype}`)
    }

    return true
  }

  /**
   * 验证文件大小
   */
  static validateFileSize(file, maxSize = 10 * 1024 * 1024) { // 默认10MB
    if (file.size > maxSize) {
      throw new Error(`文件大小不能超过 ${Math.round(maxSize / 1024 / 1024)}MB`)
    }
    return true
  }

  /**
   * 保存上传的文件
   */
  static async saveUploadedFile(file, uploadDir = './uploads') {
    try {
      // 确保上传目录存在
      await fs.mkdir(uploadDir, { recursive: true })

      // 生成唯一文件名
      const fileName = `${uuidv4()}${path.extname(file.filename)}`
      const filePath = path.join(uploadDir, fileName)

      // 读取并保存文件
      const fileBuffer = await fs.readFile(file.filepath)
      await fs.writeFile(filePath, fileBuffer)

      // 清理临时文件
      await fs.unlink(file.filepath)

      return {
        fileName,
        filePath,
        fileUrl: `/uploads/${fileName}`,
        mimeType: file.mimetype,
        size: file.size
      }

    } catch (error) {
      throw new Error(`文件保存失败: ${error.message}`)
    }
  }

  /**
   * 提取文件内容
   */
  static async extractFileContent(file, buffer) {
    const { filename, mimetype } = file
    
    try {
      // 根据文件类型提取内容
      if (mimetype === 'text/markdown' || mimetype === 'text/plain') {
        return buffer.toString('utf-8')
      }
      
      if (mimetype === 'application/pdf') {
        // TODO: 集成PDF文本提取库（如pdf-parse）
        return this.extractTextFromPDF(buffer)
      }
      
      if (mimetype.startsWith('image/')) {
        // TODO: 集成OCR服务
        return this.extractTextFromImage(buffer, mimetype)
      }
      
      // 默认返回文本内容
      return buffer.toString('utf-8')

    } catch (error) {
      throw new Error(`文件内容提取失败: ${error.message}`)
    }
  }

  /**
   * 从PDF提取文本（占位符实现）
   */
  static async extractTextFromPDF(buffer) {
    // TODO: 集成真正的PDF文本提取库
    return '[PDF文件已上传，内容提取功能待实现]'
  }

  /**
   * 从图片提取文本（占位符实现）
   */
  static async extractTextFromImage(buffer, mimeType) {
    // TODO: 集成OCR服务（如Tesseract.js或云OCR服务）
    return '[图片文件已上传，OCR文本提取功能待实现]'
  }

  /**
   * 删除文件
   */
  static async deleteFile(filePath) {
    try {
      await fs.unlink(filePath)
      return true
    } catch (error) {
      if (error.code === 'ENOENT') {
        // 文件不存在，也算删除成功
        return true
      }
      throw new Error(`文件删除失败: ${error.message}`)
    }
  }

  /**
   * 检查文件是否存在
   */
  static async fileExists(filePath) {
    try {
      await fs.access(filePath)
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * 获取文件信息
   */
  static async getFileInfo(filePath) {
    try {
      const stats = await fs.stat(filePath)
      return {
        size: stats.size,
        birthtime: stats.birthtime,
        mtime: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      }
    } catch (error) {
      throw new Error(`获取文件信息失败: ${error.message}`)
    }
  }

  /**
   * 创建文件流（用于大文件处理）
   */
  static createReadStream(filePath) {
    return fs.createReadStream(filePath)
  }

  /**
   * 创建文件写入流
   */
  static createWriteStream(filePath) {
    return fs.createWriteStream(filePath)
  }
}

module.exports = FileUtils
