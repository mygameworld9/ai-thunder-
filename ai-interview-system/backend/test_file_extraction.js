#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const FileUtils = require('./src/utils/fileUtils');

/**
 * 文件内容提取功能测试脚本
 */
class FileExtractionTest {
  constructor() {
    this.testFiles = [
      {
        name: 'test-markdown.md',
        content: '# 测试简历\n\n## 个人信息\n姓名：张三\n邮箱：zhangsan@example.com\n\n## 技术技能\n- JavaScript\n- Node.js\n- React\n\n## 项目经验\n### 项目一：在线商城\n使用React和Node.js开发的电商平台。',
        mimetype: 'text/markdown'
      },
      {
        name: 'test-text.txt',
        content: '测试简历内容\n姓名：李四\n技能：Python, Java, MySQL\n经验：3年开发经验',
        mimetype: 'text/plain'
      }
    ];
  }

  /**
   * 创建测试文件
   */
  async createTestFiles() {
    console.log('📁 创建测试文件...');
    
    try {
      // 确保测试目录存在
      await fs.mkdir('./test_files', { recursive: true });
      
      // 创建测试文件
      for (const testFile of this.testFiles) {
        const filePath = path.join('./test_files', testFile.name);
        await fs.writeFile(filePath, testFile.content);
        console.log(`✅ 创建测试文件: ${testFile.name}`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ 创建测试文件失败:', error);
      return false;
    }
  }

  /**
   * 测试文件内容提取
   */
  async testFileExtraction() {
    console.log('\n🔍 测试文件内容提取...');
    
    try {
      for (const testFile of this.testFiles) {
        const filePath = path.join('./test_files', testFile.name);
        const fileBuffer = await fs.readFile(filePath);
        
        // 模拟文件对象
        const mockFile = {
          filename: testFile.name,
          mimetype: testFile.mimetype,
          size: fileBuffer.length
        };
        
        console.log(`\n📄 测试文件: ${testFile.name}`);
        console.log(`   类型: ${testFile.mimetype}`);
        
        try {
          const extractedContent = await FileUtils.extractFileContent(mockFile, fileBuffer);
          console.log(`✅ 提取成功`);
          console.log(`   内容长度: ${extractedContent.length} 字符`);
          console.log(`   前100字符: ${extractedContent.substring(0, 100)}...`);
        } catch (error) {
          console.error(`❌ 提取失败: ${error.message}`);
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ 测试文件提取失败:', error);
      return false;
    }
  }

  /**
   * 测试文件验证功能
   */
  async testFileValidation() {
    console.log('\n✅ 测试文件验证功能...');
    
    try {
      // 测试有效文件类型
      const validFile = {
        mimetype: 'application/pdf',
        size: 1024 * 1024 // 1MB
      };
      
      try {
        FileUtils.validateFileType(validFile);
        FileUtils.validateFileSize(validFile);
        console.log('✅ 有效文件验证通过');
      } catch (error) {
        console.error(`❌ 有效文件验证失败: ${error.message}`);
      }
      
      // 测试无效文件类型
      const invalidFile = {
        mimetype: 'application/exe',
        size: 1024 * 1024
      };
      
      try {
        FileUtils.validateFileType(invalidFile);
        console.log('❌ 无效文件类型验证应该失败');
      } catch (error) {
        console.log(`✅ 无效文件类型验证正确失败: ${error.message}`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ 测试文件验证失败:', error);
      return false;
    }
  }

  /**
   * 清理测试文件
   */
  async cleanup() {
    console.log('\n🧹 清理测试文件...');
    
    try {
      const testDir = './test_files';
      const files = await fs.readdir(testDir);
      
      for (const file of files) {
        await fs.unlink(path.join(testDir, file));
      }
      
      await fs.rmdir(testDir);
      console.log('✅ 测试文件清理完成');
    } catch (error) {
      console.error('⚠️  清理测试文件时出现警告:', error.message);
    }
  }

  /**
   * 运行所有测试
   */
  async run() {
    console.log('🎯 AI面试系统文件内容提取功能测试');
    console.log('=====================================\n');
    
    try {
      // 创建测试文件
      const createSuccess = await this.createTestFiles();
      if (!createSuccess) {
        return false;
      }
      
      // 测试文件验证
      const validationSuccess = await this.testFileValidation();
      
      // 测试文件提取
      const extractionSuccess = await this.testFileExtraction();
      
      // 清理测试文件
      await this.cleanup();
      
      // 输出结果
      console.log('\n📊 测试结果:');
      console.log(`   文件验证功能: ${validationSuccess ? '✅ 通过' : '❌ 失败'}`);
      console.log(`   文件提取功能: ${extractionSuccess ? '✅ 通过' : '❌ 失败'}`);
      
      if (validationSuccess && extractionSuccess) {
        console.log('\n🎉 所有测试通过！文件内容提取功能正常工作。');
        return true;
      } else {
        console.log('\n❌ 部分测试失败，请检查相关功能。');
        return false;
      }
      
    } catch (error) {
      console.error('❌ 测试执行失败:', error);
      return false;
    }
  }
}

// 运行测试
if (require.main === module) {
  const test = new FileExtractionTest();
  test.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ 测试异常:', error);
    process.exit(1);
  });
}

module.exports = FileExtractionTest;
